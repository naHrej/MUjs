import { ipcMain, BrowserWindow } from 'electron'
import chokidar from 'chokidar'
import fs from 'fs'
import path from 'path'
import { store } from './store/storeManager'
import { logger } from '../shared/utils/logger'

let watcher: chokidar.FSWatcher | null = null
let watchPath: string | null = null

export function setupFileWatcher() {
  // Initialize watcher on startup
  initializeWatcher()

  // Handle watch path changes
  ipcMain.on('watchPath-changed', async () => {
    if (watcher) {
      watcher.close()
      watcher = null
    }
    await initializeWatcher()
  })

  // Handle file watch requests from renderer
  ipcMain.handle('file-watcher:get-path', () => {
    return watchPath
  })

  ipcMain.handle('file-watcher:set-path', async (_event, newPath: string) => {
    if (watcher) {
      watcher.close()
      watcher = null
    }
    watchPath = newPath
    await initializeWatcher()
    return watchPath
  })
}

async function initializeWatcher() {
  // Get watch path from store
  const storedPath = (store.get('settings.watchPath') || store.get('watchPath')) as string | undefined
  
  watchPath = storedPath && storedPath.trim() !== '' ? storedPath : null

  if (!watchPath || watchPath === path.resolve('/') || !fs.existsSync(watchPath)) {
    logger.info('No valid watch path configured, file watcher idle.')
    return
  }

  logger.info("Watcher Path: " + watchPath)

  try {
    watcher = chokidar.watch(watchPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    })

    watcher.on('add', (filePath) => {
      // if path ends with outgoing.moo, notify renderer
      if (filePath.endsWith('outgoing.moo')) {
        logger.info("File added: " + filePath)
        fs.readFile(filePath, 'utf8', (err, data) => {
          if (err) {
            logger.error('Error reading file:', err)
            return
          }
          // Send to all windows that the file was detected
          // The renderer will handle sending to the connection if connected
          BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send('file-detected', { path: filePath, data })
          })
          // Delete the file after reading
          fs.unlink(filePath, (err) => {
            if (err) {
              logger.error('Error deleting file:', err)
              return
            }
            logger.debug('File deleted')
          })
        })
      }
    })
  } catch (error) {
    logger.error('Error setting up file watcher:', error)
  }
}
