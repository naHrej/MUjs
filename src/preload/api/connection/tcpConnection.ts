import { ipcRenderer } from "electron"
import net from "net"
import { Buffer } from "buffer"
import { LineBuffer } from "../../../services/lineBuffer"
import { logger } from "../../../shared/utils/logger"

export class TcpConnection {
  private client: net.Socket | null = null
  private lineBuffer: LineBuffer | null = null
  private isConnected: boolean = false

  connect(port: number, host: string): void {
    this.isConnected = false
    
    // Destroy existing connection if any
    if (this.client && !this.client.destroyed) {
      this.client.destroy()
    }
    
    // Create new client connection
    this.client = new net.Socket()
    
    // Create line buffer for this connection
    // Process complete lines: remove control characters and send to renderer
    this.lineBuffer = new LineBuffer((line: string) => {
      try {
        // Remove problematic control characters, preserve Unicode and line structure
        const processedLine = line.replace(/[\x00\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        // Send complete line to renderer for processing
        ipcRenderer.send("received-data", processedLine)
      } catch (error) {
        logger.error("Error processing line from server:", error)
      }
    })
    
    // Set up event handlers
    this.client.on("data", (data: Buffer) => {
      // Add data to line buffer - it will emit complete lines via callback
      const dataString = data.toString("utf-8")
      if (this.lineBuffer) {
        this.lineBuffer.addData(dataString)
      }
    })
    
    this.client.on("close", () => {
      // emit a disconnected event
      this.isConnected = false
      // Clear line buffer on connection close
      if (this.lineBuffer) {
        this.lineBuffer.clear()
        this.lineBuffer = null
      }
      ipcRenderer.send("disconnected")
      logger.connection("Connection closed")
    })
    
    this.client.on("connect", () => {
      // emit a connected event
      this.isConnected = true
      ipcRenderer.send("connect")
      logger.connection("TCP client connected")
    })
    
    this.client.on("error", (err: Error) => {
      logger.error("TCP client error:", err)
      this.isConnected = false
      // Clear line buffer on error
      if (this.lineBuffer) {
        this.lineBuffer.clear()
        this.lineBuffer = null
      }
      // Send error message to renderer
      const errorMessage = err.message || err.toString() || 'Connection failed'
      ipcRenderer.send("connection-error", errorMessage)
      ipcRenderer.send("disconnected")
    })
    
    // Connect to server
    this.client.connect(port, host)
    this.client.setKeepAlive(true, 10000)
  }

  write(data: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('TCP client not connected'))
        return
      }
      if (!this.client) {
        reject(new Error('TCP client not initialized'))
        return
      }
      
      data += "\n" // Append a newline character to the data
      const buffer = Buffer.from(data, "utf8") // Convert the string to a Buffer
      try {
        const success = this.client.write(buffer, (err) => {
          // Send the buffer to the server
          if (err) {
            logger.error('Error writing to client:', err)
            reject(err)
          } else {
            resolve()
          }
        })
        // If write returns false, the buffer is full, but we still resolve
        // The callback will be called when the buffer drains
        if (success === false) {
          // Buffer is full, wait for drain event
          this.client.once('drain', () => resolve())
        }
      } catch (err) {
        logger.error('Exception writing to client:', err)
        reject(err)
      }
    })
  }

  end(): void {
    this.isConnected = false
    if (this.client) {
      this.client.destroy()
      // Clear TCP line buffer
      if (this.lineBuffer) {
        this.lineBuffer.clear()
        this.lineBuffer = null
      }
    }
    ipcRenderer.send("disconnected")
  }

  getConnected(): boolean {
    return this.isConnected
  }
}
