import { DataProcessor } from './dataProcessor'
import { ProtocolParser } from './protocolParser'
import { HTMLParser } from './htmlParser'
import { StyleManager } from './styleManager'
import { eventMiddleware } from './eventMiddleware'
import type { CodeEditPayload } from '../shared/types/ipc'
import { serializeCodeEditPayload } from '../shared/utils/serialization'
import { logger } from '../shared/utils/logger'

export class DataPipeline {
  private dataProcessor: DataProcessor
  private protocolParser: ProtocolParser
  private htmlParser: HTMLParser
  private styleManager: StyleManager
  private sessionKey: string | null = null
  private host: string = ''
  private ansiEnabled: boolean = false
  private htmlEnabled: boolean = false

  constructor() {
    this.dataProcessor = new DataProcessor()
    this.protocolParser = new ProtocolParser()
    this.htmlParser = new HTMLParser()
    this.styleManager = new StyleManager()
  }

  setOptions(options: {
    ansiEnabled: boolean
    htmlEnabled: boolean
    host: string
    sessionKey: string | null
  }) {
    this.ansiEnabled = options.ansiEnabled
    this.htmlEnabled = options.htmlEnabled
    this.host = options.host
    this.sessionKey = options.sessionKey
  }

  process(rawData: string) {
    // Step 1: Check for protocol messages first
    const protocolEvent = this.protocolParser.parse(rawData)
    if (protocolEvent) {
      if (protocolEvent.type === 'code-edit-end') {
        // Send code edit session to editor
        const payload: CodeEditPayload = {
          saveCommand: protocolEvent.session.saveCommand,
          headerData: protocolEvent.session.headerData,
          codeLines: protocolEvent.session.codeLines,
          endMarker: protocolEvent.session.endMarker
        }
        // Use IPC to send to editor window with explicit serialization
        if (window.api) {
          try {
            const serializedPayload = serializeCodeEditPayload(payload, 'open-code-editor')
            window.api.send('open-code-editor', serializedPayload)
              } catch (error) {
                logger.error('Error serializing CodeEditPayload:', error)
                // Still try to send, the wrapper will handle it
                window.api.send('open-code-editor', payload)
              }
        }
        return // Don't process as regular terminal data
      }
      // Other protocol events can be handled here if needed
      return
    }

    // Step 2: Process data (ANSI conversion, sanitization)
    const processed = this.dataProcessor.process(rawData, {
      ansiEnabled: this.ansiEnabled,
      htmlEnabled: this.htmlEnabled
    })

    // Step 3: Parse HTML content
    const parsed = this.htmlParser.parse(processed.processed, this.host, this.sessionKey)

    // Step 4: Handle MUjs tags (style loading)
    if (parsed.mujsTags.length > 0) {
      parsed.mujsTags.forEach((tag) => {
        if (tag.style) {
          this.styleManager.loadStyleFromURL(tag.style)
        }
      })
    }

    // Step 5: Handle style tags
    if (parsed.styles.length > 0) {
      parsed.styles.forEach((style) => {
        const styleElement = document.createElement('style')
        styleElement.textContent = style
        document.head.appendChild(styleElement)
      })
    }

    // Step 6: Handle link tags
    parsed.links.forEach((link) => {
      const linkElement = document.createElement('link')
      linkElement.href = link.href
      linkElement.rel = link.rel
      linkElement.type = link.type
      document.head.appendChild(linkElement)
    })

    // Step 7: Handle script tags (with validation)
    parsed.scripts.forEach((script) => {
      const scriptElement = document.createElement('script')
      scriptElement.src = script.src
      document.head.appendChild(scriptElement)
    })

    // Step 8: Handle special ANSI message for client key
    if (processed.processed.includes('ANSI Version 2.6 is currently active')) {
      if (window.api && this.sessionKey) {
        window.api.write(`@clientkey ${this.sessionKey}`)
      }
      return
    }

    // Step 9: Emit terminal data event with processed content
    if (parsed.content) {
      eventMiddleware.emit({
        type: 'terminal-data',
        data: parsed.content
      })
    }
  }

  generateSessionKey(): string {
    this.sessionKey =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    return this.sessionKey
  }

  /**
   * Reset the data pipeline state (e.g., on connection loss)
   * Clears any active protocol sessions
   */
  reset(): void {
    this.protocolParser.reset()
    this.sessionKey = null
  }
}

// Singleton instance
export const dataPipeline = new DataPipeline()
