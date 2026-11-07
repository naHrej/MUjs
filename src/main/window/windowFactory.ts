import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { getWindowsRegistry } from '../menu/menuManager'
import { logger } from '../../shared/utils/logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get the app root directory (where package.json is)
// In dev: __dirname is typically out/main/ (since code is bundled into main.js)
// We need to find the project root by looking for package.json
function findAppRoot(): string {
  if (app.isPackaged) {
    return process.resourcesPath
  }
  
  const fs = require('fs')
  
  // First, try to find package.json starting from __dirname
  let currentDir = __dirname
  for (let i = 0; i < 6; i++) {
    const packageJsonPath = path.join(currentDir, 'package.json')
    try {
      if (fs.existsSync(packageJsonPath)) {
        logger.debug(`Found package.json at: ${currentDir}`)
        return currentDir
      }
    } catch (e) {
      // Ignore errors
    }
    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      // Reached filesystem root, stop
      break
    }
    currentDir = parentDir
  }
  
  // Second fallback: try process.cwd() (usually the project root when running from npm script)
  try {
    const cwdPackageJson = path.join(process.cwd(), 'package.json')
    if (fs.existsSync(cwdPackageJson)) {
      logger.debug(`Found package.json at process.cwd(): ${process.cwd()}`)
      return process.cwd()
    }
  } catch (e) {
    // Ignore
  }
  
  // Final fallback: assume __dirname is in out/main/ and go up 2 levels
  const fallbackRoot = path.resolve(__dirname, '../../')
  logger.warn(`Could not find package.json, using fallback app root: ${fallbackRoot}`)
  logger.warn(`__dirname: ${__dirname}, process.cwd(): ${process.cwd()}`)
  return fallbackRoot
}

const appRoot = findAppRoot()

// electron-vite builds to out/* (main/preload/renderer). In packaged apps this is inside app.asar.
const preloadPath = app.isPackaged
  ? path.join(app.getAppPath(), 'out', 'preload', 'preload.mjs')
  : path.join(appRoot, 'out', 'preload', 'preload.mjs')

export function applyWindowHtml(win: BrowserWindow, action: string, html: string): Promise<unknown> {
  const container = `document.querySelector('.container')`
  const content = JSON.stringify(html ?? '')
  let script: string
  if (action === 'append') {
    script = `${container}.innerHTML += ${content}`
  } else if (action === 'prepend') {
    script = `${container}.innerHTML = ${content} + ${container}.innerHTML`
  } else if (action === 'clear') {
    script = `${container}.innerHTML = ''`
  } else if (action === 'style') {
    script = `loadStyleFromURL(${content})`
  } else {
    script = `${container}.innerHTML = ${content}`
  }
  return win.webContents.executeJavaScript(script)
}

export function spawnNewWindow(id: string, html: string): Promise<BrowserWindow> {
  return new Promise((resolve, reject) => {
    const windows = getWindowsRegistry()
    const needsPreload = id === 'index' || id === 'settings' || id === 'editor'
    
    // electron-vite builds preload to .vite/build/preload.js in dev
    let actualPreloadPath: string | undefined = undefined
    if (needsPreload) {
      if (app.isPackaged) {
        actualPreloadPath = preloadPath
      } else {
        // In dev mode, use the preloadPath we calculated above
        actualPreloadPath = preloadPath
        // Normalize the path to ensure it's absolute
        actualPreloadPath = path.normalize(actualPreloadPath)
        // Check if file exists
        try {
          const fs = require('fs')
          if (!fs.existsSync(actualPreloadPath)) {
            logger.warn(`Preload file not found at ${actualPreloadPath}, window may not have preload script`)
            logger.warn(`App root: ${appRoot}, __dirname: ${__dirname}`)
            actualPreloadPath = undefined
          } else {
            logger.debug(`Using preload script at: ${actualPreloadPath}`)
          }
        } catch (e) {
          logger.error(`Error checking preload path: ${e}`)
          actualPreloadPath = undefined
        }
      }
    }
    
    windows[id] = new BrowserWindow({
      width: 800,
      height: 600,
      show: true,
      webPreferences: {
        preload: actualPreloadPath,
        contextIsolation: true, // Security fix
        nodeIntegration: false, // Security fix
        sandbox: false // Set to false for now - some APIs need it
      }
    })

    if (id === 'editor') {
      // unregister any listeners for update-editor
      windows['editor']?.removeAllListeners('update-editor')
    }
    windows[id].setMaxListeners(1000)
    
    // add event listener for onfocus
    windows[id].on('focus', () => {
      windows[id].flashFrame(false)
    })
    windows[id].webContents.on('console-message', (_event, _level, message, line, sourceId) => {
      logger.info(`[Renderer ${id}] ${message} (${sourceId}:${line})`)
    })

    // Add error handling for failed loads
    windows[id].webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      logger.error(`Window ${id} failed to load: ${errorCode} - ${errorDescription} (${validatedURL})`)
      // Show the window anyway so user can see the error
      windows[id].show()
      reject(new Error(`Failed to load ${validatedURL}: ${errorDescription}`))
    })

    windows[id].webContents.on('render-process-gone', (event, details) => {
      logger.error(`Window ${id} render process crashed:`, details)
      windows[id].show() // Show window even if renderer crashed
    })

    const htmlFile = (id === 'index' || id === 'settings' || id === 'editor') ? id : 'blank'
    // electron-vite builds HTML files to out/renderer (both dev build output and packaged inside app.asar)
    // In dev: electron-vite dev server, in production: use built files
    if (app.isPackaged) {
      const htmlPath = path.join(app.getAppPath(), 'out', 'renderer', `${htmlFile}.html`)
      logger.debug(`Loading HTML from: ${htmlPath}`)
      windows[id].loadFile(htmlPath).catch((error) => {
        logger.error(`Failed to loadFile for ${id}:`, error)
        windows[id].show() // Show window even on error
        reject(error)
      })
    } else {
      // In dev mode, electron-vite serves from the Vite dev server.
      // Don't hardcode the port; electron-vite will pick the next available one.
      const devServerUrl =
        process.env.VITE_DEV_SERVER_URL ||
        process.env.ELECTRON_RENDERER_URL ||
        'http://localhost:5173'

      // Clear HTTP cache in dev to avoid stale HTML/asset references.
      windows[id].webContents.session.clearCache().catch(() => {
        // ignore
      })

      // With renderer.root configured to src/renderer in electron.vite.config.ts,
      // the correct URL is /index.html (NOT /src/renderer/index.html).
      const url = `${devServerUrl.replace(/\/$/, '')}/${htmlFile}.html`
      logger.info(`Loading HTML from URL: ${url}`)
      windows[id].loadURL(url).catch((error) => {
        logger.error(`Failed to loadURL for ${id}:`, error)
        windows[id].show() // Show window even on error
        reject(error)
      })
    }

    windows[id].once('ready-to-show', () => {
      windows[id].show() // Explicitly show the window
      windows[id].on('closed', () => {
        delete windows[id]
      })
      if (id !== 'index' && id !== 'settings' && id !== 'editor') {
        applyWindowHtml(windows[id], 'replace', html).catch((error) => {
          logger.error(`Failed to render HTML in window ${id}:`, error)
        })
      }
      resolve(windows[id])
    })
  })
}
