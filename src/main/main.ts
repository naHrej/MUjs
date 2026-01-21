import { app, ipcMain } from 'electron'
import { setupIpcHandlers } from './ipcHandler'
import { spawnNewWindow, setupWindowIpcHandlers } from './windowManager'
import { setupFileWatcher } from './fileWatcher'
import { store } from './store/storeManager'
import { deserializeFromIPC } from '../shared/utils/serialization'
import { logger } from '../shared/utils/logger'

app.whenReady().then(() => {
  createWindow()
  setupIpcHandlers(app)
  setupWindowIpcHandlers()
  setupFileWatcher()
})

ipcMain.handle('electron-store-get', (event, key: string) => {
  return store.get(key)
})

ipcMain.on('electron-store-set', async (event, key: string, val: any) => {
  try {
    // Validate that the value is properly deserialized (should already be serialized from preload)
    // This is a safety check to ensure data integrity
    const validatedVal = deserializeFromIPC(val, `store.set('${key}')`)
    store.set(key, validatedVal)
  } catch (error) {
    logger.error(`Error validating store value for key '${key}':`, error)
    // Still try to set the value - electron-store might handle it
    // But log the error for debugging
    try {
      store.set(key, val)
    } catch (storeError) {
      logger.error(`Failed to set store value for key '${key}':`, storeError)
    }
  }
})

const createWindow = async () => {
  await spawnNewWindow('index', 'index.html')
}
