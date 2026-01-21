import { IpcRendererEvent } from "electron"
import type { API } from "../../shared/types/api"
import { ConnectionManager } from "./connection/connectionManager"
import * as ipcWrapper from "./ipc/ipcWrapper"
import { ansiToHtml } from "./utils/ansiConverter"
import { openFile, saveFile } from "./utils/fileOperations"
import { getFonts } from "./utils/fontManager"
import { ipcRenderer } from "electron"

// Create connection manager instance
const connectionManager = new ConnectionManager()

// Handle disconnect IPC event
ipcRenderer.on('disconnect', () => {
  connectionManager.end()
})

export const api: API = {
  // IPC wrappers
  invokeMenu: ipcWrapper.invokeMenu,
  invoke: ipcWrapper.invoke,
  send: ipcWrapper.send,
  on: ipcWrapper.on,
  flashFrame: ipcWrapper.flashFrame,
  version: ipcWrapper.version,

  // Connection management
  connect: (port: number, host: string) => {
    connectionManager.connect(port, host)
  },
  connectWebSocket: (host: string, port: number) => {
    connectionManager.connectWebSocket(host, port)
  },
  connected: () => {
    return connectionManager.connected()
  },
  write: (data: string) => {
    return connectionManager.write(data)
  },
  end: () => {
    connectionManager.end()
  },
  sendApiCommand: (command: string, data: any) => {
    connectionManager.sendApiCommand(command, data)
  },

  // Utilities
  ansi_to_html: ansiToHtml,
  getFonts: getFonts,
  OpenFile: openFile,
  saveFile: saveFile,
}
