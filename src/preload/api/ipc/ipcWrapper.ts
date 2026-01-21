import { ipcRenderer, IpcRendererEvent } from "electron"
import { serializeArgs, serializeMenuTemplate } from "../../../shared/utils/serialization"
import { logger } from "../../../shared/utils/logger"

export function invoke<T = any>(channel: string, ...args: any[]): Promise<T> {
  try {
    // Serialize all arguments before passing to IPC
    const serializedArgs = serializeArgs(args, channel)
    return ipcRenderer.invoke(channel, ...serializedArgs) as Promise<T>
    } catch (error) {
      logger.error(`Error serializing arguments for invoke('${channel}'):`, error)
      throw error
    }
}

export function send(channel: string, ...args: any[]): void {
  try {
    // Serialize all arguments before passing to IPC
    const serializedArgs = serializeArgs(args, channel)
    ipcRenderer.send(channel, ...serializedArgs)
    } catch (error) {
      logger.error(`Error serializing arguments for send('${channel}'):`, error)
      throw error
    }
}

export function invokeMenu(template: any): Promise<void> {
  try {
    // Explicitly serialize menu template (can contain complex objects)
    const serializedTemplate = serializeMenuTemplate(template, "show-context-menu")
    return ipcRenderer.invoke("show-context-menu", serializedTemplate)
    } catch (error) {
      logger.error("Error serializing menu template:", error)
      throw error
    }
}

export function on(channel: string, func: (event: IpcRendererEvent, ...args: any[]) => void): void {
  ipcRenderer.on(channel, func)
}

export function flashFrame(flash: boolean): void {
  // Boolean is already serializable, but use wrapper for consistency
  try {
    ipcRenderer.send("flash-frame", flash)
    } catch (error) {
      logger.error("Error sending flash-frame:", error)
      throw error
    }
}

export function version(): Promise<string> {
  return ipcRenderer.invoke("get-app-version") as Promise<string>
}
