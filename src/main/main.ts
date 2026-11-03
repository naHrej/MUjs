import { app, ipcMain } from 'electron'
import { setupIpcHandlers } from './ipcHandler'
import { spawnNewWindow, setupWindowIpcHandlers } from './windowManager'
import { setupFileWatcher } from './fileWatcher'
import { store } from './store/storeManager'
import { deserializeFromIPC } from '../shared/utils/serialization'
import { logger } from '../shared/utils/logger'

app.whenReady().then(async () => {
  logger.info('app.whenReady triggered')
  await createWindow()
  logger.info('createWindow completed')
  setupIpcHandlers(app)
  setupWindowIpcHandlers()
  setupFileWatcher()
}).catch((err) => {
  logger.error('Error during app initialization:', err)
})

ipcMain.handle('electron-store-get', (_event, key: string) => {
  return store.get(key)
})

ipcMain.on('electron-store-set', async (_event, key: string, val: any) => {
  try {
    const validatedVal = deserializeFromIPC(val, `store.set('${key}')`)
    store.set(key, validatedVal)
  } catch (error) {
    logger.error(`Error validating store value for key '${key}':`, error)
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
