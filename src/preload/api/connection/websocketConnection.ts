import { ipcRenderer } from "electron"
import { LineBuffer } from "../../../services/lineBuffer"
import { logger } from "../../../shared/utils/logger"
import type { CodeEditPayload } from "../../../shared/types/ipc"

interface ApiMessage {
  type: string
  data?: string
  url?: string
  message?: string
  command?: string
  [key: string]: any
}

interface ProtocolEnvelope<T = any> {
  type: string
  id?: string
  timestamp?: number
  payload?: T
}

export class WebSocketConnection {
  private websocket: WebSocket | null = null
  private apiWebsocket: WebSocket | null = null
  private websocketLineBuffer: LineBuffer | null = null
  private isConnected: boolean = false
  private isMujsNegotiated: boolean = false
  private sessionToken: string | null = null

  public getSessionToken(): string | null {
    return this.sessionToken
  }

  constructor() {
    // Listen for editor-save IPC from editor window
    ipcRenderer.on('editor-save', (_event, payload: { sessionId: string; code: string }) => {
      this.sendEditorSave(payload.sessionId, payload.code)
    })
  }

  private processWebSocketData(data: string): void {
    if (!this.websocketLineBuffer) {
      this.websocketLineBuffer = new LineBuffer((line: string) => {
        try {
          const processedLine = line.replace(/[\x00\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
          if (processedLine.trim()) {
            ipcRenderer.send("received-data", processedLine)
          }
        } catch (error) {
          logger.error("Error processing WebSocket line:", error)
        }
      })
    }
    this.websocketLineBuffer.addData(data)
  }

  private handleProtocolEnvelope(env: ProtocolEnvelope): void {
    logger.debug('Received MUjs Protocol envelope:', env.type, env)

    switch (env.type) {
      case 'server.hello':
        this.isMujsNegotiated = true
        this.sessionToken = env.payload?.sessionToken || null
        logger.connection(`MUjs Protocol v1.0 negotiated successfully with server: ${env.payload?.server || 'PennMUSH'}`)
        break

      case 'terminal.output':
        if (env.payload?.html !== undefined) {
          ipcRenderer.send('received-data', env.payload.html)
        } else if (env.payload?.plain !== undefined) {
          ipcRenderer.send('received-data', env.payload.plain)
        }
        break

      case 'editor.open':
        const open = env.payload
        if (open) {
          const payload: CodeEditPayload = {
            saveCommand: open.sessionId,
            headerData: open.headers || [],
            codeLines: (open.code || '').split(/\r?\n/),
            endMarker: '',
            sessionId: open.sessionId,
            language: open.language || 'mushcode'
          }
          ipcRenderer.send('open-code-editor', payload)
        }
        break

      case 'editor.result':
        ipcRenderer.send('editor-result', env.payload)
        break

      case 'window.update':
        if (env.payload) {
          ipcRenderer.send('window', env.payload.windowId, env.payload.action, env.payload.html)
        }
        break

      case 'style.load':
        ipcRenderer.send('reload-styles')
        break

      case 'audio.play':
        if (env.payload?.url) {
          try {
            const audio = new Audio(env.payload.url)
            audio.volume = env.payload.volume !== undefined ? env.payload.volume : 1.0
            audio.loop = !!env.payload.loop
            audio.play().catch(e => logger.warn('Audio playback failed:', e))
          } catch (e) {
            logger.warn('Audio initialization error:', e)
          }
        }
        break

      default:
        logger.debug('Unhandled protocol envelope:', env.type)
        break
    }
  }

  private handleApiMessage(apiMessage: ApiMessage): void {
    logger.debug('Processing legacy API message:', apiMessage)
    switch (apiMessage.type) {
      case 'editor-update':
        ipcRenderer.send('update-editor', apiMessage.data)
        break
      case 'style-update':
        if (apiMessage.url) {
          ipcRenderer.send('reload-styles')
        }
        break
      case 'notification':
        logger.info('Server notification:', apiMessage.message)
        break
      case 'command':
        if (apiMessage.command) {
          logger.debug('Server command:', apiMessage.command)
        }
        break
      default:
        logger.warn('Unknown API message type:', apiMessage.type)
    }
  }

  connect(host: string, port: number): void {
    this.isConnected = false
    this.isMujsNegotiated = false
    this.sessionToken = null
    
    if (this.websocketLineBuffer) {
      this.websocketLineBuffer.clear()
      this.websocketLineBuffer = null
    }
    
    const protocol = port === 443 ? 'wss:' : 'ws:'
    // Connect to unified /ws endpoint (or /game if legacy)
    const gameUrl = `${protocol}//${host}:${port}/ws`
    const apiUrl = `${protocol}//${host}:${port}/api`
    
    logger.connection(`Connecting to WebSocket: ${gameUrl}`)
    
    this.websocket = new WebSocket(gameUrl)
    
    this.websocket.onopen = () => {
      logger.connection('WebSocket connection opened. Sending client.hello handshake...')
      this.isConnected = true
      
      // Dispatch client.hello handshake
      const helloEnvelope = {
        type: 'client.hello',
        id: 'init-handshake',
        timestamp: Date.now(),
        payload: {
          client: 'MUjs',
          version: '2.0.0',
          capabilities: ['html5', 'editor', 'docking', 'styles', 'audio', 'signed-scripts']
        }
      }
      this.websocket?.send(JSON.stringify(helloEnvelope))

      ipcRenderer.send("connect")
    }
    
    this.websocket.onmessage = (event: MessageEvent) => {
      const dataStr = event.data as string
      // Check if message is a typed JSON protocol envelope
      if (typeof dataStr === 'string' && dataStr.trim().startsWith('{')) {
        try {
          const envelope = JSON.parse(dataStr) as ProtocolEnvelope
          if (envelope && typeof envelope.type === 'string') {
            this.handleProtocolEnvelope(envelope)
            return
          }
        } catch {
          // Fall through to normal line processing
        }
      }

      this.processWebSocketData(dataStr)
    }
    
    this.websocket.onclose = () => {
      logger.connection('WebSocket connection closed')
      this.isConnected = false
      this.isMujsNegotiated = false
      if (this.websocketLineBuffer) {
        this.websocketLineBuffer.clear()
        this.websocketLineBuffer = null
      }
      ipcRenderer.send("disconnected")
    }
    
    this.websocket.onerror = (error: Event) => {
      logger.error('WebSocket error:', error)
      this.isConnected = false
      if (this.websocketLineBuffer) {
        this.websocketLineBuffer.clear()
        this.websocketLineBuffer = null
      }
      ipcRenderer.send("connection-error", 'WebSocket connection failed')
      ipcRenderer.send("disconnected")
    }
    
    // Connect to optional secondary API socket for legacy servers
    try {
      this.apiWebsocket = new WebSocket(apiUrl)
      this.apiWebsocket.onopen = () => {
        logger.connection('Optional API WebSocket connection opened')
      }
      this.apiWebsocket.onmessage = (event: MessageEvent) => {
        try {
          const apiMessage = JSON.parse(event.data as string) as ApiMessage
          this.handleApiMessage(apiMessage)
        } catch {
          // ignore
        }
      }
      this.apiWebsocket.onclose = () => {}
      this.apiWebsocket.onerror = () => {}
    } catch {
      // Optional API connection ignored if server doesn't support dual-socket
    }
  }

  write(data: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        if (this.isMujsNegotiated) {
          const inputEnvelope = {
            type: 'terminal.input',
            timestamp: Date.now(),
            payload: {
              command: data
            }
          }
          this.websocket.send(JSON.stringify(inputEnvelope))
        } else {
          this.websocket.send(data + "\n")
        }
        resolve()
      } else {
        reject(new Error('WebSocket not connected'))
      }
    })
  }

  sendEditorSave(sessionId: string, code: string): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const saveEnvelope = {
        type: 'editor.save',
        timestamp: Date.now(),
        payload: {
          sessionId,
          code
        }
      }
      this.websocket.send(JSON.stringify(saveEnvelope))
      logger.debug('Sent editor.save envelope:', sessionId)
    } else {
      logger.warn('Cannot send editor.save - WebSocket not open')
    }
  }

  sendApiCommand(command: string, data: any, serializeArgs: (args: any[], channel?: string) => any[]): void {
    if (this.apiWebsocket && this.apiWebsocket.readyState === WebSocket.OPEN) {
      try {
        const serializedData = serializeArgs([data], "sendApiCommand")[0]
        const message = {
          type: 'command',
          command: command,
          data: serializedData,
          timestamp: Date.now()
        }
        this.apiWebsocket.send(JSON.stringify(message))
      } catch (error) {
        logger.error('Error serializing API command data:', error)
        throw error
      }
    } else if (this.websocket && this.isMujsNegotiated) {
      const envelope = {
        type: 'client.command',
        timestamp: Date.now(),
        payload: { command, data }
      }
      this.websocket.send(JSON.stringify(envelope))
    } else {
      logger.warn('API WebSocket not available or not in WebSocket mode')
    }
  }

  end(): void {
    this.isConnected = false
    this.isMujsNegotiated = false
    this.sessionToken = null
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    if (this.apiWebsocket) {
      this.apiWebsocket.close()
      this.apiWebsocket = null
    }
    if (this.websocketLineBuffer) {
      this.websocketLineBuffer.clear()
      this.websocketLineBuffer = null
    }
    ipcRenderer.send("disconnected")
  }

  getConnected(): boolean {
    return this.isConnected && this.websocket !== null && this.websocket.readyState === WebSocket.OPEN
  }
}
