import type { MenuItemConstructorOptions } from 'electron'

export interface IPCChannels {
  'get-app-version': () => Promise<string>
  'dialog:openDirectory': () => Promise<string | undefined>
  'dialog:openFile': () => Promise<string | undefined>
  'dialog:saveFile': () => Promise<string | undefined>
  'show-context-menu': (template: MenuItemConstructorOptions[]) => Promise<void>
  'electron-store-get': (key: string) => Promise<unknown>
  'electron-store-set': (key: string, val: unknown) => void
}

export interface IPCSendChannels {
  'connect': () => void
  'disconnect': () => void
  'disconnected': () => void
  'connection-error': (error: string) => void
  'received-data': (data: string) => void
  'site-selected': (name: string, host: string, port: number, connstr: string, acEnabled: boolean, ansiEnabled: boolean, htmlEnabled: boolean, websocketEnabled: boolean) => void
  'settings-updated': () => void
  'reload-styles': () => void
  'flash-frame': (flash: boolean) => void
  'open-code-editor': (payload: CodeEditPayload) => void
  'update-editor': (data: string) => void
  'submit': (data: string) => void
  'watchPath-changed': () => void
}

export interface CodeEditPayload {
  saveCommand: string
  headerData: string[]
  codeLines: string[]
  endMarker: string
}
