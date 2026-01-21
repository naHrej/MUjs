<template>
  <div id="app" class="flex-container" v-show="showApp">
    <button
      class="mujs-gear"
      type="button"
      title="Settings"
      aria-label="Settings"
      @click="settingsOpen = true"
    >
      <i class="pi pi-cog"></i>
    </button>

    <div id="AZUHz3kQsgMj" ref="terminalRef" v-show="showApp"></div>
    <div id="resizeHandle" ref="resizeHandleRef" v-show="showApp"></div>
    <textarea
      ref="inputFieldRef"
      v-model="inputField"
      id="SdWiqHtqa"
      v-show="showApp"
      @keydown="handleKeydown"
    />

    <Drawer
      v-model:visible="settingsOpen"
      position="right"
      :dismissable="true"
      :modal="false"
      :showCloseIcon="false"
      class="mujs-settings-drawer"
    >
      <Settings @close="settingsOpen = false" />
    </Drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Drawer from 'primevue/drawer'
import Settings from './Settings.vue'
import { eventMiddleware } from '../../services/eventMiddleware'
import type { MiddlewareEvent } from '../../shared/types/events'
import { useConnectionEvents } from '../composables/useConnectionEvents'
import { useApiEvents } from '../composables/useApiEvents'
import { useInputHistory } from '../composables/useInputHistory'
import { logger } from '../../shared/utils/logger'
import { waitForApi } from '../../shared/utils/waitForApi'

const terminalRef = ref<HTMLElement | null>(null)
const resizeHandleRef = ref<HTMLElement | null>(null)
const inputFieldRef = ref<HTMLTextAreaElement | null>(null)
const inputField = ref('')
const showApp = ref(false)
const ansiEnabled = ref(false)
const htmlEnabled = ref(false)
const host = ref('')
const sessionKey = ref<string | null>(null)
const connectionString = ref('')
const sendOnConnect = ref(false)
const settingsOpen = ref(false)

// Use composables
const { inputHistory, currentInputIndex, addToHistory, navigateHistory, resetHistoryNavigation } = useInputHistory()

// Subscribe to middleware events (no business logic in component)
const unsubscribe = eventMiddleware.subscribe((event: MiddlewareEvent) => {
  if (event.type === 'terminal-data') {
    // Just render the processed data
    appendToTerminal(event.data)
  } else if (event.type === 'connection-state') {
    showApp.value = event.connected
  }
})

// Setup API and connection events
useApiEvents()
useConnectionEvents(
  showApp,
  ansiEnabled,
  htmlEnabled,
  host,
  sessionKey,
  connectionString,
  sendOnConnect,
  terminalRef
)

onMounted(async () => {
  // Wait for window.store to be available
  try {
    await waitForApi()
  } catch (error) {
    logger.warn('Failed to wait for window.store, using default settings:', error)
    return
  }

  // Load settings
  try {
    ansiEnabled.value = (await window.store.get('settings.ansiEnabled')) || false
    htmlEnabled.value = (await window.store.get('settings.htmlEnabled')) || false
  } catch (error) {
    logger.error('Error loading settings:', error)
  }

  // Setup resize handle
  setupResizeHandle()

  // Listen for menu toggle (main process)
  window.api.on('toggle-settings', () => {
    settingsOpen.value = !settingsOpen.value
  })
})

function appendToTerminal(data: string) {
  // Pure presentation logic only
  if (terminalRef.value) {
    // Preserve leading spaces
    let processedData = data
    if (data.charAt(0) === ' ') {
      processedData = '&nbsp;' + data.slice(1)
    }

    const element = document.createElement('span')
    element.style.margin = '0 0px'
    element.style.padding = '0 0px'
    element.title = new Date().toLocaleString()
    element.innerHTML = processedData

    // Handle clickable elements
    element.querySelectorAll('[onCommand], [onclickdobuffer]').forEach((node) => {
      node.addEventListener('click', () => {
        if (node.hasAttribute('onCommand')) {
          const command = node.getAttribute('onCommand')
          if (command) {
            inputField.value = command
            addToHistory(command)
            window.api.write(command).catch((err) => {
              logger.error('Error sending command from clickable element:', err)
            })
            inputField.value = ''
          }
        } else if (node.hasAttribute('onclickdobuffer')) {
          const command = node.getAttribute('onclickdobuffer')
          if (command) {
            inputField.value += command
            // Focus input (would need input ref)
          }
        }
      })
    })

    terminalRef.value.appendChild(element)
    terminalRef.value.scrollTop = terminalRef.value.scrollHeight

    // Flash frame if window not focused
    if (!document.hasFocus()) {
      window.api.flashFrame(true)
    }
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    const text = inputField.value
    addToHistory(text)
    inputField.value = ''
    
    // Send to API
    window.api.write(text).catch((err) => {
      logger.error('Error sending input to server:', err)
    })
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    const historyValue = navigateHistory('up')
    if (historyValue !== null) {
      inputField.value = historyValue
    }
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    const historyValue = navigateHistory('down')
    if (historyValue !== null) {
      inputField.value = historyValue
    }
  }
}

function setupResizeHandle() {
  if (!resizeHandleRef.value || !inputFieldRef.value || !terminalRef.value) return

  // Ensure resize handle has fixed height and is visible
  resizeHandleRef.value.style.setProperty('height', '5px', 'important')
  resizeHandleRef.value.style.setProperty('min-height', '5px', 'important')
  resizeHandleRef.value.style.setProperty('max-height', '5px', 'important')
  resizeHandleRef.value.style.setProperty('flex-grow', '0', 'important')
  resizeHandleRef.value.style.setProperty('flex-shrink', '0', 'important')
  resizeHandleRef.value.style.setProperty('display', 'block', 'important')
  resizeHandleRef.value.style.setProperty('visibility', 'visible', 'important')

  let isResizing = false
  let startY = 0
  let containerTop = 0
  const MIN_INPUT_HEIGHT = 50
  const MIN_TERMINAL_HEIGHT = 100
  const RESIZE_HANDLE_HEIGHT = 5

  const handleMouseDown = (e: MouseEvent) => {
    isResizing = true
    startY = e.clientY
    
    // Get container bounds
    const container = terminalRef.value!.parentElement as HTMLElement
    containerTop = container.getBoundingClientRect().top
    
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none' // Prevent text selection during resize
    e.preventDefault()
    e.stopPropagation()
    
    // Disable flex on both elements during resize
    if (inputFieldRef.value) {
      inputFieldRef.value.style.setProperty('flex-grow', '0', 'important')
      inputFieldRef.value.style.setProperty('flex-shrink', '0', 'important')
    }
    if (terminalRef.value) {
      terminalRef.value.style.setProperty('flex-grow', '0', 'important')
      terminalRef.value.style.setProperty('flex-shrink', '0', 'important')
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !inputFieldRef.value || !terminalRef.value || !resizeHandleRef.value) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const container = terminalRef.value.parentElement as HTMLElement
    const containerHeight = container.offsetHeight
    const containerRect = container.getBoundingClientRect()
    
    // Save current scroll state before resize
    const scrollTop = terminalRef.value.scrollTop
    const scrollHeight = terminalRef.value.scrollHeight
    const clientHeight = terminalRef.value.clientHeight
    const scrollRatio = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0
    
    // Calculate mouse position relative to container bottom
    // Mouse Y relative to container top
    const mouseY = e.clientY - containerRect.top
    
    // Calculate desired input height (from bottom of container)
    // Input is at the bottom, so height = containerHeight - mouseY
    const desiredInputHeight = containerHeight - mouseY
    
    // Enforce minimums
    const minInputHeight = MIN_INPUT_HEIGHT
    const maxInputHeight = containerHeight - MIN_TERMINAL_HEIGHT - RESIZE_HANDLE_HEIGHT
    const newInputHeight = Math.max(minInputHeight, Math.min(maxInputHeight, desiredInputHeight))
    
    // Calculate terminal height (remaining space)
    const newTerminalHeight = containerHeight - newInputHeight - RESIZE_HANDLE_HEIGHT
    
    // Apply heights
    inputFieldRef.value.style.setProperty('height', newInputHeight + 'px', 'important')
    inputFieldRef.value.style.setProperty('min-height', newInputHeight + 'px', 'important')
    inputFieldRef.value.style.setProperty('max-height', newInputHeight + 'px', 'important')
    
    terminalRef.value.style.setProperty('height', newTerminalHeight + 'px', 'important')
    terminalRef.value.style.setProperty('min-height', newTerminalHeight + 'px', 'important')
    terminalRef.value.style.setProperty('max-height', newTerminalHeight + 'px', 'important')
    
    // Ensure resize handle stays visible with fixed height
    if (resizeHandleRef.value) {
      resizeHandleRef.value.style.setProperty('height', RESIZE_HANDLE_HEIGHT + 'px', 'important')
      resizeHandleRef.value.style.setProperty('min-height', RESIZE_HANDLE_HEIGHT + 'px', 'important')
      resizeHandleRef.value.style.setProperty('max-height', RESIZE_HANDLE_HEIGHT + 'px', 'important')
      resizeHandleRef.value.style.setProperty('flex-grow', '0', 'important')
      resizeHandleRef.value.style.setProperty('flex-shrink', '0', 'important')
      resizeHandleRef.value.style.setProperty('display', 'block', 'important')
      resizeHandleRef.value.style.setProperty('visibility', 'visible', 'important')
    }
    
    // Restore scroll position after a brief delay to allow layout to update
    requestAnimationFrame(() => {
      if (terminalRef.value) {
        const newScrollHeight = terminalRef.value.scrollHeight
        const newClientHeight = terminalRef.value.clientHeight
        if (newScrollHeight > newClientHeight) {
          const newScrollTop = scrollRatio * (newScrollHeight - newClientHeight)
          terminalRef.value.scrollTop = newScrollTop
        }
      }
    })
  }

  const handleMouseUp = () => {
    if (isResizing) {
      isResizing = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }

  resizeHandleRef.value.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  // Store cleanup function
  ;(resizeHandleRef.value as any)._cleanupResize = () => {
    resizeHandleRef.value?.removeEventListener('mousedown', handleMouseDown)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
}

onUnmounted(() => {
  unsubscribe()
  // Clean up resize handle listeners
  if (resizeHandleRef.value && (resizeHandleRef.value as any)._cleanupResize) {
    ;(resizeHandleRef.value as any)._cleanupResize()
  }
})
</script>

<style scoped lang="less">
.mujs-gear {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1100; // above terminal content, below drawer

  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 38px;
  height: 38px;
  border-radius: 10px;

  border: 1px solid var(--p-surface-300, #333);
  background: rgba(0, 0, 0, 0.35);
  color: var(--p-text-color, #fff);
  cursor: pointer;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);

  transition: background 0.15s ease, transform 0.15s ease;
}

.mujs-gear:hover {
  background: rgba(0, 0, 0, 0.55);
  transform: translateY(-1px);
}

.mujs-gear:active {
  transform: translateY(0);
}
</style>
<style lang="less" scoped>
// Component-specific styles will go here
</style>
