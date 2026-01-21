// Event types for the middleware layer

export interface ProcessedData {
  raw: string
  processed: string
  timestamp: number
}

export interface CodeEditSession {
  active: boolean
  saveCommand: string
  headerData: string[]
  codeLines: string[]
  endMarker: string
}

export type ProtocolEvent =
  | { type: 'code-edit-start'; session: CodeEditSession }
  | { type: 'code-edit-header'; data: string }
  | { type: 'code-edit-line'; line: string }
  | { type: 'code-edit-end'; session: CodeEditSession }
  | null

export interface ParsedHTML {
  content: string
  scripts: Array<{ src: string; key?: string }>
  links: Array<{ href: string; rel: string; type: string }>
  styles: string[]
  mujsTags: Array<{ style?: string }>
}

export type MiddlewareEvent =
  | { type: 'terminal-data'; data: string }
  | { type: 'connection-state'; connected: boolean }
  | { type: 'code-edit'; session: CodeEditSession }
  | { type: 'style-update'; url: string }
  | { type: 'html-parsed'; parsed: ParsedHTML }
  | { type: 'protocol-message'; event: ProtocolEvent }

export interface EventMiddleware {
  subscribe: (callback: (event: MiddlewareEvent) => void) => () => void
  emit: (event: MiddlewareEvent) => void
}
