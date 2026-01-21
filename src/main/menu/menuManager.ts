import { app, Menu, BrowserWindow } from 'electron'
import { spawnNewWindow } from '../window/windowFactory'

// Shared windows registry - initialized by windowManager
let windows: Record<string, BrowserWindow> = {}

export function setWindowsRegistry(registry: Record<string, BrowserWindow>) {
  windows = registry
}

export function getWindowsRegistry(): Record<string, BrowserWindow> {
  return windows
}

let connected = false

export function setConnectedState(isConnected: boolean) {
  connected = isConnected
  updateMenu()
}

function updateMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'World',
      submenu: [
        ...(connected ? [{
          label: 'Disconnect',
          accelerator: 'Ctrl+F4',
          id: "disconnect",
          enabled: true,
          click: () => {
            // send disconnect to api
            windows['index']?.webContents.send('disconnect')
          }
        }] : []),
        ...(!connected ? [{
          label: 'Reconnect',
          id: "reconnect",
          enabled: true,
          click: () => {
            windows['index']?.webContents.send('reconnect')
          }
        }] : []),
        {
          label: 'Exit',
          click: () => {
            app.quit()
          }
        },
      ]
    },
    {
      label: 'Configuration',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            // Open settings drawer in the main window
            windows['index']?.webContents.send('toggle-settings')
          }
        }
      ]
    },
    {
      label: 'Developer',
      submenu: [
        {
          label: 'Open Developer Tools',
          accelerator: 'F12',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow()
            focusedWindow?.webContents.openDevTools()
          },
        },
        {
          label: 'Reload Styles',
          accelerator: 'Shift+F5',
          click: () => {
            // emit event to reload styles
            const focusedWindow = BrowserWindow.getFocusedWindow()
            focusedWindow?.webContents.send('reload-styles')
          }
        },
        {
          label: 'Reload',
          accelerator: 'F5',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow()
            focusedWindow?.reload()
          }
        },
        {
          label: 'Toggle Editor',
          accelerator: 'F2',
          click: () => {
            spawnNewWindow('editor', '')
          }
        }
      ]
    }
  ])

  Menu.setApplicationMenu(menu)
}
