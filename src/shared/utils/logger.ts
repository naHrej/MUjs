/**
 * Centralized logging utility
 * Provides consistent logging interface with log levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class Logger {
  private level: LogLevel = LogLevel.INFO

  setLevel(level: LogLevel) {
    this.level = level
  }

  getLevel(): LogLevel {
    return this.level
  }

  debug(...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug('[DEBUG]', ...args)
    }
  }

  info(...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log('[INFO]', ...args)
    }
  }

  warn(...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn('[WARN]', ...args)
    }
  }

  error(...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error('[ERROR]', ...args)
    }
  }

  // Convenience method for connection-related logs
  connection(message: string, ...args: any[]): void {
    this.info(`[CONNECTION] ${message}`, ...args)
  }

  // Convenience method for IPC-related logs
  ipc(message: string, ...args: any[]): void {
    this.debug(`[IPC] ${message}`, ...args)
  }
}

// Singleton instance
export const logger = new Logger()

// In production, set to WARN level to reduce noise
// Check if process.env is available (it might not be in all contexts)
try {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    logger.setLevel(LogLevel.WARN)
  }
} catch (e) {
  // Ignore if process.env is not available
}
