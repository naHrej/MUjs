import { ipcRenderer } from "electron"
import { LineBuffer } from "../../../services/lineBuffer"
import { logger } from "../../../shared/utils/logger"

interface ApiMessage {
  type: string
  data?: string
  url?: string
  message?: string
  command?: string
  [key: string]: any
}

export class WebSocketConnection {
  private websocket: WebSocket | null = null
  private apiWebsocket: WebSocket | null = null
  private websocketLineBuffer: LineBuffer | null = null
  private isConnected: boolean = false

  private processWebSocketData(data: string): void {
    // WebSocket messages from the server are sent line-by-line with \r\n
    // Each message event should contain one complete line, but handle edge cases
    
    // Create line buffer if it doesn't exist
    if (!this.websocketLineBuffer) {
      this.websocketLineBuffer = new LineBuffer((line: string) => {
        try {
          // Remove problematic control characters, preserve Unicode
          const processedLine = line.replace(/[\x00\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
          if (processedLine.trim()) {
            ipcRenderer.send("received-data", processedLine)
          }
        } catch (error) {
          logger.error("Error processing WebSocket line:", error)
        }
      })
    }
    
    // Add data to line buffer (handles multiple lines if present)
    this.websocketLineBuffer.addData(data)
  }

  private handleApiMessage(apiMessage: ApiMessage): void {
    logger.debug('Processing API message:', apiMessage)
    
    // Handle different types of API messages
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
        // Handle server commands through API channel
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
    
    // Reset WebSocket line buffer for new connection
    if (this.websocketLineBuffer) {
      this.websocketLineBuffer.clear()
      this.websocketLineBuffer = null
    }
    
    // Construct WebSocket URLs
    const protocol = port === 443 ? 'wss:' : 'ws:'
    const gameUrl = `${protocol}//${host}:${port}/game`
    const apiUrl = `${protocol}//${host}:${port}/api`
    
    logger.connection(`Connecting to WebSocket: ${gameUrl}`)
    logger.connection(`Connecting to API WebSocket: ${apiUrl}`)
    
    // Create game WebSocket connection
    this.websocket = new WebSocket(gameUrl)
    
    this.websocket.onopen = () => {
      logger.connection('WebSocket game connection opened')
      this.isConnected = true
      ipcRenderer.send("connect")
    }
    
    this.websocket.onmessage = (event: MessageEvent) => {
      logger.debug('Received WebSocket data:', event.data)
      // Process the data similar to telnet
      this.processWebSocketData(event.data as string)
    }
    
    this.websocket.onclose = () => {
      logger.connection('WebSocket game connection closed')
      this.isConnected = false
      // Clear WebSocket line buffer on close
      if (this.websocketLineBuffer) {
        this.websocketLineBuffer.clear()
        this.websocketLineBuffer = null
      }
      ipcRenderer.send("disconnected")
    }
    
    this.websocket.onerror = (error: Event) => {
      logger.error('WebSocket game error:', error)
      this.isConnected = false
      // Clear WebSocket line buffer on error
      if (this.websocketLineBuffer) {
        this.websocketLineBuffer.clear()
        this.websocketLineBuffer = null
      }
      // Send error message to renderer
      const errorMessage = 'WebSocket connection failed'
      ipcRenderer.send("connection-error", errorMessage)
      ipcRenderer.send("disconnected")
    }
    
    // Create API WebSocket connection
    this.apiWebsocket = new WebSocket(apiUrl)
    
    this.apiWebsocket.onopen = () => {
      logger.connection('WebSocket API connection opened')
    }
    
    this.apiWebsocket.onmessage = (event: MessageEvent) => {
      logger.debug('Received API WebSocket data:', event.data)
      // Handle API-specific messages here
      try {
        const apiMessage = JSON.parse(event.data as string) as ApiMessage
        this.handleApiMessage(apiMessage)
      } catch (e) {
        logger.debug('Non-JSON API message:', event.data)
      }
    }
    
    this.apiWebsocket.onclose = () => {
      logger.connection('WebSocket API connection closed')
    }
    
    this.apiWebsocket.onerror = (error: Event) => {
      logger.error('WebSocket API error:', error)
    }
  }

  write(data: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        data += "\n" // Append a newline character to the data
        this.websocket.send(data)
        resolve()
      } else {
        reject(new Error('WebSocket not connected'))
      }
    })
  }

  sendApiCommand(command: string, data: any, serializeArgs: (args: any[], channel?: string) => any[]): void {
    if (this.apiWebsocket && this.apiWebsocket.readyState === WebSocket.OPEN) {
      try {
        // Explicitly serialize data parameter
        const serializedData = serializeArgs([data], "sendApiCommand")[0]
        const message = {
          type: 'command',
          command: command,
          data: serializedData,
          timestamp: Date.now()
        }
        this.apiWebsocket.send(JSON.stringify(message))
        logger.debug('Sent API command:', message)
      } catch (error) {
        logger.error('Error serializing API command data:', error)
        throw error
      }
    } else {
      logger.warn('API WebSocket not available or not in WebSocket mode')
    }
  }

  end(): void {
    this.isConnected = false
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    if (this.apiWebsocket) {
      this.apiWebsocket.close()
      this.apiWebsocket = null
    }
    // Clear WebSocket line buffer
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
