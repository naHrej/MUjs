<!-- eslint-disable vue/no-v-html -->
<!-- eslint-disable vue/no-v-html -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import less from 'less'
import { VCard, VCardText, VTextField, VBtn, VToolbar } from 'vuetify/components'

interface TerminalProps {
  hostname: string
  port: number
}

const props = defineProps<TerminalProps>()
const emit = defineEmits(['disconnect'])

const terminalContent = ref('')
const commandInput = ref('')
const isConnected = ref(false)
const terminalContentRef = ref<HTMLElement | null>(null)

const handleServerMessage = async (_event: unknown, message: string) => {
  // Check if the user is already at the bottom
  const isAtBottom = terminalContentRef.value
    ? terminalContentRef.value.scrollHeight - terminalContentRef.value.scrollTop <=
      terminalContentRef.value.clientHeight + 1
    : false

  // Convert ANSI to HTML
  const convertedMessage = convertAnsiToHtml(message)
  terminalContent.value += convertedMessage

  // Check for stylesheet URL pattern
  const stylePattern = /!@style:url:(http:\/\/[^\s]+\.less)/i
  const match = message.match(stylePattern)
  if (match && match[1]) {
    loadLessStylesheet(match[1])
  }

  // Scroll to the bottom if the user was already at the bottom
  if (isAtBottom) {
    await nextTick()
    terminalContentRef.value?.scrollTo(0, terminalContentRef.value.scrollHeight)
  }
}

const convertAnsiToHtml = (text: string) => {
  // Basic ANSI to HTML conversion - this can be expanded for more ANSI codes
  return text
    .replace(/\u001b\[31m/g, '<span style="color: red">')
    .replace(/\u001b\[32m/g, '<span style="color: green">')
    .replace(/\u001b\[33m/g, '<span style="color: yellow">')
    .replace(/\u001b\[34m/g, '<span style="color: blue">')
    .replace(/\u001b\[0m/g, '</span>')
    .replace(/\n/g, '<br>')
}

const loadLessStylesheet = (url: string) => {
  fetch(url)
    .then(response => response.text())
    .then(lessContent => {
      less.render(lessContent, (error, output) => {
        if (error) {
          console.error('Error compiling LESS:', error)
        } else {
          const style = document.createElement('style')
          style.type = 'text/css'
          style.appendChild(document.createTextNode(output.css))
          document.head.appendChild(style)
        }
      })
    })
    .catch(error => console.error('Error loading LESS stylesheet:', error))
}

const sendCommand = () => {
  if (commandInput.value.trim()) {
    window.electron.ipcRenderer.send('telnet-send', commandInput.value)
    commandInput.value = ''
  }
}

const disconnect = () => {
  window.electron.ipcRenderer.send('telnet-disconnect')
  emit('disconnect')
}

onMounted(() => {
  window.electron.ipcRenderer.on('telnet-data', handleServerMessage)
  window.electron.ipcRenderer.on('telnet-connected', () => {
    isConnected.value = true
  })
  window.electron.ipcRenderer.on('telnet-disconnected', () => {
    isConnected.value = false
    emit('disconnect')
  })
  
  // Connect to the server
  window.electron.ipcRenderer.send('telnet-connect', {
    host: props.hostname,
    port: props.port
  })
})

onUnmounted(() => {
  window.electron.ipcRenderer.off('telnet-data', handleServerMessage)
  if (isConnected.value) {
    disconnect()
  }
})
</script>

<template>
  <v-card class="terminal-card">
    <v-toolbar class="terminal-toolbar">
      <v-btn color="error" @click="disconnect">Disconnect</v-btn>
    </v-toolbar>
    <v-card-text class="terminal-content" ref="terminalContentRef" v-html="terminalContent"></v-card-text>
    <v-card-actions class="command-input">
      <v-text-field
        v-model="commandInput"
        label="Enter command..."
        @keyup.enter="sendCommand"
        class="command-input-field"
      ></v-text-field>
      <v-btn color="primary" @click="sendCommand">Send</v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.terminal-card {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden; /* Ensure content does not overflow */
}

.terminal-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  background-color: #333;
  padding: 5px;
  height: 40px; /* Adjust height as needed */
  color: white;
}

.terminal-content {
  flex: 1;
  height: calc(100vh - 90px); /* Adjust height as needed */
  width: 100%;
  overflow-y: auto;
  background-color: black;
  color: white;
  padding: 10px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.command-input {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #333;
  flex-shrink: 0; /* Prevent shrinking */
}

.command-input-field {
  flex: 1;
  margin-right: 10px;
}
</style>
