import { ref, createApp, type App } from 'vue'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import Aura from '@primeuix/themes/aura'
import SpaceHUD from '../components/space/SpaceHUD.vue'
import { useSpaceStore } from '../stores/useSpaceStore'

const isPoppedOut = ref(false)
const hostPaneRequested = ref(false)
let popoutWindow: Window | null = null
let popoutApp: App | null = null
let suppressPopoutUnload = false

function notifyPopoutState(poppedOut: boolean) {
  try {
    window.api?.send('space-hud-popped-out', poppedOut)
  } catch (error) {
    console.warn('[SpacePopout] Failed to update the application menu:', error)
  }
}

function releasePopout(reopenHostPane: boolean) {
  const hadPopout = isPoppedOut.value || popoutApp != null || popoutWindow != null
  isPoppedOut.value = false
  if (hadPopout) hostPaneRequested.value = reopenHostPane
  notifyPopoutState(false)
  if (popoutApp) {
    popoutApp.unmount()
    popoutApp = null
  }
  popoutWindow = null
}

export function useSpacePopout() {
  const { telemetry } = useSpaceStore()

  function popOutSpaceHUD(preferredWidth = 650) {
    if (popoutWindow && !popoutWindow.closed) {
      popoutWindow.focus()
      return
    }

    const width = Math.min(1400, Math.max(600, preferredWidth))
    const height = 820
    const left = window.screenX + Math.max(20, window.outerWidth - width - 20)
    const top = window.screenY + 40

    const win = window.open(
      'about:blank',
      'mujs_space_hud_popout',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    )

    if (!win) {
      console.warn('[SpacePopout] Popout window blocked or failed to open.')
      return
    }

    popoutWindow = win
    isPoppedOut.value = true
    hostPaneRequested.value = false
    notifyPopoutState(true)

    const vesselTitle = telemetry.name ? `${telemetry.name} - Space HUD` : 'Space Bridge HUD'
    win.document.title = `${vesselTitle} (Tactical & Helm)`

    // Copy dark mode class
    win.document.documentElement.classList.add('p-dark')

    // Copy all style tags and stylesheets from the parent document
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      try {
        win.document.head.appendChild(node.cloneNode(true))
      } catch (e) {
        console.warn('[SpacePopout] Failed copying stylesheet node:', e)
      }
    })

    // Reset base styles in popout
    win.document.body.style.margin = '0'
    win.document.body.style.padding = '0'
    win.document.body.style.background = '#04080e'
    win.document.body.style.height = '100vh'
    win.document.body.style.width = '100vw'
    win.document.body.style.overflow = 'hidden'

    // Create mount root
    const rootEl = win.document.createElement('div')
    rootEl.id = 'space-hud-popout-mount'
    rootEl.style.height = '100%'
    rootEl.style.width = '100%'
    win.document.body.appendChild(rootEl)

    // Mount SpaceHUD into the popout window
    popoutApp = createApp(SpaceHUD, {
      isPopout: true,
      onClose: () => {
        dockBackSpaceHUD(false)
      },
      onDock: () => {
        dockBackSpaceHUD(true)
      }
    })

    popoutApp.use(PrimeVue, {
      theme: {
        preset: Aura,
        options: {
          prefix: 'p',
          darkModeSelector: '.p-dark',
          cssLayer: false
        }
      }
    })
    popoutApp.directive('tooltip', Tooltip)

    popoutApp.mount(rootEl)

    // Window close handler (user clicked OS window close X)
    win.addEventListener('beforeunload', () => {
      if (suppressPopoutUnload) return
      releasePopout(false)
    })

    // Close popout if main window is closed/reloaded
    window.addEventListener('beforeunload', () => {
      if (popoutWindow && !popoutWindow.closed) {
        popoutWindow.close()
      }
    })
  }

  function dockBackSpaceHUD(reopenHostPane = true) {
    const win = popoutWindow
    suppressPopoutUnload = true
    try {
      if (win && !win.closed) win.close()
    } finally {
      suppressPopoutUnload = false
    }
    releasePopout(reopenHostPane)
  }

  function focusSpaceHUDPopout() {
    if (popoutWindow && !popoutWindow.closed) {
      popoutWindow.focus()
    }
  }

  return {
    isPoppedOut,
    hostPaneRequested,
    popOutSpaceHUD,
    dockBackSpaceHUD,
    focusSpaceHUDPopout
  }
}
