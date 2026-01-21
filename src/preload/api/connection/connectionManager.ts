import { TcpConnection } from "./tcpConnection"
import { WebSocketConnection } from "./websocketConnection"
import { serializeArgs } from "../../../shared/utils/serialization"
import { logger } from "../../../shared/utils/logger"

export class ConnectionManager {
  private tcpConnection: TcpConnection
  private websocketConnection: WebSocketConnection
  private isWebSocketMode: boolean = false

  constructor() {
    this.tcpConnection = new TcpConnection()
    this.websocketConnection = new WebSocketConnection()
  }

  connect(port: number, host: string): void {
    this.isWebSocketMode = false
    this.tcpConnection.connect(port, host)
  }

  connectWebSocket(host: string, port: number): void {
    this.isWebSocketMode = true
    this.websocketConnection.connect(host, port)
  }

  write(data: string): Promise<void> {
    if (this.isWebSocketMode) {
      return this.websocketConnection.write(data)
    } else {
      return this.tcpConnection.write(data)
    }
  }

  end(): void {
    if (this.isWebSocketMode) {
      this.websocketConnection.end()
    } else {
      this.tcpConnection.end()
    }
  }

  connected(): boolean {
    if (this.isWebSocketMode) {
      return this.websocketConnection.getConnected()
    } else {
      return this.tcpConnection.getConnected()
    }
  }

  sendApiCommand(command: string, data: any): void {
    if (this.isWebSocketMode) {
      this.websocketConnection.sendApiCommand(command, data, serializeArgs)
    } else {
      logger.warn('API WebSocket not available or not in WebSocket mode')
    }
  }
}
