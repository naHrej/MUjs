import { contextBridge, ipcRenderer } from 'electron'
import { api } from './api/index'
import store from './api/store'

console.log('[Preload] Starting preload script execution...')
console.log('[Preload] api imported:', typeof api, api ? 'object' : 'null')
console.log('[Preload] store imported:', typeof store, store ? 'object' : 'null')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  contextBridge.exposeInMainWorld('api', api)
  contextBridge.exposeInMainWorld('store', store)
  console.log('[Preload] Successfully exposed api and store to window')
} catch (error) {
  console.error('[Preload] Error exposing APIs:', error)
  console.error('[Preload] Error details:', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    apiType: typeof api,
    storeType: typeof store
  })
  throw error
}

// Handle file-detected events from main process
ipcRenderer.on('file-detected', (_event, { data }) => {
  // If connected, send the file content to the server
  if (api.connected()) {
    api.write(data)
  }
})
