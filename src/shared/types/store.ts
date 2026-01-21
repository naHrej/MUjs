export interface Settings {
  fontFamily: string
  fontSize: number
  watchPath: string
  ansiEnabled: boolean
  htmlEnabled: boolean
  authString?: string
  connectOnStartup?: boolean
}

export interface Timer {
  name: string
  interval: number
  enabled: boolean
  send: string
}

export interface Site {
  name: string
  host: string
  port: number
  htmlEnabled: boolean
  ansiEnabled: boolean
  websocketEnabled: boolean
  connectionString?: string
  acEnabled?: boolean
}

export interface StoreData {
  settings: Settings
  timers: Record<string, Timer>
  sites: Record<string, Site>
  inputHistory?: string[]
  editorLanguage?: string
  watchEnabled?: boolean
}
