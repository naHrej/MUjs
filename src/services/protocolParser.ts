import type { CodeEditSession, ProtocolEnvelope, ProtocolEvent } from '../shared/types/events'

export class ProtocolParser {
  private codeEditSession: CodeEditSession | null = null

  parse(data: string): ProtocolEvent {
    const trimmed = data.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.includes('"type"')) {
      try {
        const envelope = JSON.parse(trimmed) as ProtocolEnvelope
        if (envelope && typeof envelope.type === 'string') {
          return { type: 'protocol-envelope', envelope }
        }
      } catch {
        // Not valid JSON. Keep it as display text.
      }
    }

    if (data.startsWith("ProgStart > ")) {
      this.codeEditSession = {
        active: true,
        saveCommand: data.replace("ProgStart > ", "").trim(),
        headerData: [],
        codeLines: [],
        endMarker: ''
      }
      return { type: 'code-edit-start', session: this.codeEditSession }
    }
    
    if (this.codeEditSession?.active && data.startsWith("ProgData > ")) {
      const headerLine = data.replace("ProgData > ", "").trim()
      this.codeEditSession.headerData.push(headerLine)
      return { type: 'code-edit-header', data: headerLine }
    }
    
    if (this.codeEditSession?.active && data.startsWith("ProgEdit > ")) {
      const codeLine = data.replace("ProgEdit > ", "")
      this.codeEditSession.codeLines.push(codeLine)
      return { type: 'code-edit-line', line: codeLine }
    }
    
    if (this.codeEditSession?.active && data.startsWith("ProgEnd > ")) {
      if (this.codeEditSession) {
        this.codeEditSession.endMarker = data.replace("ProgEnd > ", "").trim()
        this.codeEditSession.active = false
        const session = { ...this.codeEditSession }
        this.codeEditSession = null
        return { type: 'code-edit-end', session }
      }
    }
    
    return null // Not a protocol message
  }

  getCurrentSession(): CodeEditSession | null {
    return this.codeEditSession
  }

  reset(): void {
    this.codeEditSession = null
  }
}
