import { BrowserWindow } from 'electron'
import { setWindowsRegistry } from './menu/menuManager'
import { setupWindowIpcHandlers } from './ipc/windowIpcHandlers'
import { spawnNewWindow } from './window/windowFactory'

// Initialize windows registry
const windows: Record<string, BrowserWindow> = {}
setWindowsRegistry(windows)

export { spawnNewWindow }
export { setupWindowIpcHandlers }
