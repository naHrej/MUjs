import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as net from 'net'

// Store active connections
const connections = new Map<number, net.Socket>()
let connectionCounter = 0

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false, // Disable web security to allow cross-origin requests
      allowRunningInsecureContent: true // Allow running insecure content
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// Set up IPC handlers for telnet connections
function setupIpcHandlers(): void {
  ipcMain.on('telnet-connect', (event, { host, port }) => {
    const socket = new net.Socket()
    const id = connectionCounter++
    socket.connect(port, host, () => {
      connections.set(id, socket)
      event.sender.send('telnet-connected')
    })

    socket.on('data', (data) => {
      event.sender.send('telnet-data', data.toString())
    })

    socket.on('close', () => {
      connections.delete(id)
      event.sender.send('telnet-disconnected')
    })

    socket.on('error', (err) => {
      console.error('Socket error:', err)
      event.sender.send('telnet-disconnected')
    })
  })

  ipcMain.on('telnet-send', (event, data) => {
    const socket = connections.get(0) // For now, just use the first connection
    if (socket) {
      socket.write(data + '\n')
    }
  })

  ipcMain.on('telnet-disconnect', () => {
    const socket = connections.get(0)
    if (socket) {
      socket.destroy()
      connections.delete(0)
    }
  })
}

app.whenReady().then(() => {
  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: ws: wss: http: https:;"
        ]
      }
    })
  })

  // Set CORS policy
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        'Access-Control-Allow-Origin': ['*']
      }
    })
  })

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  // Set up IPC handlers
  setupIpcHandlers()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
