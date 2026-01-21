export interface API {
  invokeMenu: (template: any) => Promise<void>
  invoke: <T = any>(channel: string, ...args: any[]) => Promise<T>
  flashFrame: (flash: boolean) => void
  ansi_to_html: (data: string, htmlEnabled: boolean) => string
  version: () => Promise<string>
  send: (channel: string, ...args: any[]) => void
  connect: (port: number, host: string) => void
  connectWebSocket: (host: string, port: number) => void
  connected: () => boolean
  on: (channel: string, func: (event: any, ...args: any[]) => void) => void
  write: (data: string) => Promise<void>
  end: () => void
  sendApiCommand: (command: string, data: any) => void
  getFonts: () => Promise<string[]>
  OpenFile: () => Promise<string | undefined>
  saveFile: (data: string) => Promise<void>
}

declare global {
  interface Window {
    api: API
    store: StoreAPI
  }
}

export interface StoreAPI {
  get: (key: string) => Promise<any>
  set: (key: string, val: any) => Promise<void>
}
