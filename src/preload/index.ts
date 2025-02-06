import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api = {
  send: (channel: string, data: any) => {
    // Whitelist channels
    const validChannels = ['telnet-connect', 'telnet-disconnect', 'telnet-send']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  on: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['telnet-connected', 'telnet-disconnected', 'telnet-data']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  },
  off: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['telnet-connected', 'telnet-disconnected', 'telnet-data']
    if (validChannels.includes(channel)) {
      ipcRenderer.off(channel, (event, ...args) => func(...args))
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
