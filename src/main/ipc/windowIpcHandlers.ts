import { ipcMain, BrowserWindow, Menu, IpcMainEvent, MenuItemConstructorOptions } from 'electron'
import { deserializeCodeEditPayload, deserializeFromIPC } from '../../shared/utils/serialization'
import { getWindowsRegistry } from '../menu/menuManager'
import { setConnectedState } from '../menu/menuManager'
import { spawnNewWindow } from '../window/windowFactory'
import { logger } from '../../shared/utils/logger'
import type { CodeEditPayload } from '../../shared/types/ipc'

export function setupWindowIpcHandlers() {
  const windows = getWindowsRegistry()

  ipcMain.on('window', (event: IpcMainEvent, id: string, updateType: string, html: string) => {
    if (!windows[id]) {
      spawnNewWindow(id, html)
      return
    }
    const window = windows[id]
    if (window) {
      if (updateType === 'append') {
        window.webContents.executeJavaScript(`document.querySelector('.container').innerHTML += \`${html}\``)
      } else if (updateType === 'replace') {
        window.webContents.executeJavaScript(`document.querySelector('.container').innerHTML = \`${html}\``)
      } else if (updateType === 'prepend') {
        window.webContents.executeJavaScript(`document.querySelector('.container').innerHTML = \`${html}\` + document.querySelector('.container').innerHTML`)
      } else if (updateType === 'clear') {
        window.webContents.executeJavaScript(`document.querySelector('.container').innerHTML = ''`)
      } else if (updateType === 'style') {
        window.webContents.executeJavaScript(`loadStyleFromURL(\`${html}\`)`)
      }
    }
  })

  // Handle open-code-editor event from renderer
  ipcMain.on('open-code-editor', (event: IpcMainEvent, payload: unknown) => {
    try {
      // Deserialize and validate CodeEditPayload
      const validatedPayload = deserializeCodeEditPayload(payload, 'open-code-editor')
      
      // Open the editor window if not already open
      if (!windows['editor']) {
        spawnNewWindow('editor', '').then(() => {
          windows['editor']?.webContents.send('open-code-editor', validatedPayload)
        })
      } else {
        windows['editor']?.webContents.send('open-code-editor', validatedPayload)
      }
    } catch (error) {
      logger.error('Error deserializing CodeEditPayload in open-code-editor handler:', error)
      // Log but don't crash - the editor window might still work with partial data
    }
  })

  // retransmit submit event
  ipcMain.on('submit', (event: IpcMainEvent, data: string) => {
    Object.values(windows).forEach(win => {
      win.webContents.send('submit', data)
    })
  })
  
  // Add a listener for the disconnected event
  ipcMain.on('disconnect', () => {
    setConnectedState(false)
  })

  ipcMain.on('flash-frame', (event: IpcMainEvent, flash: boolean) => {
    Object.values(windows).forEach(win => {
      win.flashFrame(flash)
    })
  })

  // Add a listener for the connected event
  ipcMain.on('connect', () => {
    setConnectedState(true)
    // Forward connect event to all renderer windows
    Object.values(windows).forEach(win => {
      win.webContents.send('connect')
    })
  })

  ipcMain.handle('show-context-menu', async (event: IpcMainEvent, template: unknown) => {
    try {
      // Deserialize and validate menu template
      const validatedTemplate = deserializeFromIPC<MenuItemConstructorOptions[]>(template, 'show-context-menu')
      
      if (!Array.isArray(validatedTemplate)) {
        throw new Error('Menu template must be an array')
      }

      const menu = Menu.buildFromTemplate(validatedTemplate)
      const senderWindow = BrowserWindow.fromWebContents(event.sender)
      if (senderWindow) {
        menu.popup(senderWindow)
      }
    } catch (error) {
      logger.error('Error deserializing menu template in show-context-menu handler:', error)
      throw error // Re-throw since this is a handle (returns promise)
    }
  })

  ipcMain.on('settings-updated', () => {
    // mainWindow is the BrowserWindow instance for your main window
    Object.values(windows).forEach(win => {
      win.webContents.send('settings-updated')
    })
  })

  ipcMain.on('site-selected', (event: IpcMainEvent, name: string, host: string, port: number, connectionString: string, acEnabled: boolean, ansiEnabled: boolean, htmlEnabled: boolean, websocketEnabled: boolean) => {
    Object.values(windows).forEach(win => {
      win.webContents.send('site-selected', name, host, port, connectionString, acEnabled, ansiEnabled, htmlEnabled, websocketEnabled)
    })
  })

  ipcMain.on('received-data', (event: IpcMainEvent, data: string) => {
    Object.values(windows).forEach(win => {
      win.webContents.send('received-data', data)
    })
  })

  ipcMain.on('disconnected', () => {
    Object.values(windows).forEach(win => {
      win.webContents.send('disconnected')
    })
  })

  ipcMain.on('connection-error', (event: IpcMainEvent, error: string) => {
    Object.values(windows).forEach(win => {
      win.webContents.send('connection-error', error)
    })
  })
  
  ipcMain.on('update-editor', (event: IpcMainEvent, data: string) => {
    // check if we have an editor window open
    if (!windows['editor']) {
      spawnNewWindow('editor', data)
    }
    windows['editor']?.once('ready-to-show', () => {
      windows['editor']?.webContents.send('update-editor', data)
    })
    windows['editor']?.webContents.send('update-editor', data)
  })
}
