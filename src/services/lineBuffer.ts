/**
 * Line buffer utility for handling TCP data streams
 * Accumulates data until complete lines are found, then emits them
 */

import { logger } from '../shared/utils/logger'

export type LineCallback = (line: string) => void

export class LineBuffer {
  private buffer: string = ''
  private readonly maxLineLength: number
  private readonly onLine: LineCallback

  constructor(onLine: LineCallback, maxLineLength: number = 1000000) {
    this.onLine = onLine
    this.maxLineLength = maxLineLength
  }

  /**
   * Add data to the buffer and process any complete lines
   * @param data - Raw data chunk from TCP stream
   */
  addData(data: string): void {
    // Add new data to buffer
    this.buffer += data

    // Process complete lines
    this.processLines()
  }

  /**
   * Process the buffer and emit complete lines
   * Handles multiple line endings: \r\n (CRLF), \n (LF), \r (CR)
   */
  private processLines(): void {
    // Check for buffer overflow (very long line without line ending)
    if (this.buffer.length > this.maxLineLength) {
      logger.warn(`LineBuffer: Buffer overflow (${this.buffer.length} chars). Clearing buffer.`)
      this.buffer = ''
      return
    }

    // Process all complete lines in the buffer
    // Handle \r\n (Windows/Network), \n (Unix), and \r (Mac) line endings
    while (this.buffer.length > 0) {
      // First, try to find \r\n (most common for network protocols)
      let lineEndIndex = this.buffer.indexOf('\r\n')
      let lineEndLength = 2

      // If no \r\n, try \n
      if (lineEndIndex === -1) {
        lineEndIndex = this.buffer.indexOf('\n')
        lineEndLength = 1
      }

      // If no \n, try \r (old Mac style)
      if (lineEndIndex === -1) {
        lineEndIndex = this.buffer.indexOf('\r')
        lineEndLength = 1
      }

      // No line ending found - incomplete line, keep in buffer
      if (lineEndIndex === -1) {
        break
      }

      // Extract complete line (without line ending)
      const line = this.buffer.substring(0, lineEndIndex)
      
      // Remove processed line and line ending from buffer
      this.buffer = this.buffer.substring(lineEndIndex + lineEndLength)

      // Emit the complete line
      if (line.length > 0 || lineEndIndex === 0) {
        // Emit even empty lines (they might be significant)
        // But trim for processing (preserve original if needed)
        this.onLine(line)
      }
    }
  }

  /**
   * Get the current incomplete line in the buffer
   * Useful for debugging or inspection
   */
  getIncompleteLine(): string {
    return this.buffer
  }

  /**
   * Clear the buffer (useful on connection loss or reset)
   */
  clear(): void {
    this.buffer = ''
  }

  /**
   * Flush any remaining data in buffer as a final line
   * Use with caution - may emit incomplete data
   */
  flush(): void {
    if (this.buffer.length > 0) {
      this.onLine(this.buffer)
      this.buffer = ''
    }
  }
}
