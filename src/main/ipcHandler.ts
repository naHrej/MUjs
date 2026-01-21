import { ipcMain, BrowserWindow, dialog, App } from 'electron'
import fs from 'fs'

export function setupIpcHandlers(app: App) {
  ipcMain.handle('get-app-version', async () => {
    return app.getVersion()
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (!focusedWindow) return
    
    const { canceled, filePaths } = await dialog.showOpenDialog(focusedWindow, {
      title: "Select Directory",
      properties: ['openDirectory']
    })
    if (canceled) {
      return
    } else {
      return filePaths[0]
    }
  })

  ipcMain.handle('dialog:openFile', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (!focusedWindow) return
    
    const { canceled, filePaths } = await dialog.showOpenDialog(focusedWindow, {
      title: "Select File",
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) {
      return
    } else {
      const selectedPath = filePaths[0]
      // Check if the path exists
      if (fs.existsSync(selectedPath)) {
        return selectedPath
      } else {
        console.error('Selected file path does not exist:', selectedPath)
        return // Handle as needed, e.g., return an error or null
      }
    }
  })

  ipcMain.handle('dialog:saveFile', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (!focusedWindow) return
    
    const { canceled, filePath } = await dialog.showSaveDialog(focusedWindow, {
      title: "Save File",
      buttonLabel: "Save",
      properties: ['createDirectory']
    })
    if (canceled) {
      return
    } else {
      return filePath
    }
  })
}
