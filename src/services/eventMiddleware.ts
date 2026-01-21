import type { MiddlewareEvent } from '../shared/types/events'
import { logger } from '../shared/utils/logger'

export class EventMiddleware {
  private subscribers: Array<(event: MiddlewareEvent) => void> = []

  subscribe(callback: (event: MiddlewareEvent) => void): () => void {
    this.subscribers.push(callback)
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  emit(event: MiddlewareEvent) {
    this.subscribers.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        logger.error('Error in event subscriber:', error)
      }
    })
  }

  // Helper method to process data through the pipeline
  processData(rawData: string, options: {
    ansiEnabled: boolean
    htmlEnabled: boolean
    host: string
    sessionKey: string | null
  }) {
    // This will be called by the data processing pipeline
    // For now, just emit the raw data - the actual processing will be done
    // by services that subscribe to these events
    this.emit({
      type: 'terminal-data',
      data: rawData
    })
  }
}

// Singleton instance
export const eventMiddleware = new EventMiddleware()
