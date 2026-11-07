export interface ProtocolEnvelope<T = any> {
  type: string
  id?: string
  timestamp?: number
  payload?: T
}

export type IncomingPart =
  | { kind: 'text'; text: string }
  | { kind: 'envelope'; envelope: ProtocolEnvelope }

const PROTOCOL_TYPE =
  /"type"\s*:\s*"(?:terminal\.(?:output|input)|server\.hello|client\.(?:hello|command)|editor\.(?:open|save|result)|window\.update|style\.load|audio\.play|script\.exec)"/

/**
 * Split a socket message into protocol envelopes and text that should be shown.
 * Envelopes are never returned as display text. Raw carriage returns inside
 * JSON strings are tolerated so a terminal.output payload can still be parsed.
 */
export function splitIncoming(data: string): IncomingPart[] {
  const parts: IncomingPart[] = []
  let i = 0

  while (i < data.length) {
    const next = data.indexOf('{', i)
    if (next === -1) {
      pushText(parts, data.slice(i))
      break
    }

    const end = findJsonObjectEnd(data, next)
    if (end === -1) {
      const tail = data.slice(next)
      if (isProtocolShaped(tail)) {
        pushText(parts, data.slice(i, next))
      } else {
        pushText(parts, data.slice(i))
      }
      break
    }

    const slice = data.slice(next, end)
    const envelope = parseProtocolEnvelope(slice)
    if (envelope || isProtocolShaped(slice)) {
      pushText(parts, data.slice(i, next))
      if (envelope) {
        parts.push({ kind: 'envelope', envelope })
      }
      i = end
      continue
    }

    pushText(parts, data.slice(i, next + 1))
    i = next + 1
  }

  return parts
}

export function terminalOutputText(envelope: ProtocolEnvelope): string | null {
  if (envelope.type !== 'terminal.output') return null
  const payload = envelope.payload as { html?: unknown; plain?: unknown } | undefined
  if (typeof payload?.html === 'string') return payload.html
  if (typeof payload?.plain === 'string') return payload.plain
  return null
}

function pushText(parts: IncomingPart[], text: string): void {
  if (!text) return
  const last = parts[parts.length - 1]
  if (last && last.kind === 'text') {
    last.text += text
  } else {
    parts.push({ kind: 'text', text })
  }
}

function isProtocolShaped(slice: string): boolean {
  return PROTOCOL_TYPE.test(slice)
}

export function parseProtocolEnvelope(slice: string): ProtocolEnvelope | null {
  try {
    const value = JSON.parse(relaxJsonStrings(slice))
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof (value as ProtocolEnvelope).type === 'string'
    ) {
      return value as ProtocolEnvelope
    }
  } catch {
    return null
  }
  return null
}

function findJsonObjectEnd(data: string, start: number): number {
  if (data[start] !== '{') return -1

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < data.length; i++) {
    const ch = data[i]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i + 1
    }
  }

  return -1
}

function relaxJsonStrings(input: string): string {
  let out = ''
  let inString = false
  let escape = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (inString) {
      if (escape) {
        out += ch
        escape = false
        continue
      }
      if (ch === '\\') {
        out += ch
        escape = true
        continue
      }
      if (ch === '"') {
        inString = false
        out += ch
        continue
      }
      const code = ch.charCodeAt(0)
      if (code < 0x20) {
        switch (ch) {
          case '\b':
            out += '\\b'
            break
          case '\f':
            out += '\\f'
            break
          case '\n':
            out += '\\n'
            break
          case '\r':
            out += '\\r'
            break
          case '\t':
            out += '\\t'
            break
          default:
            out += '\\u' + code.toString(16).padStart(4, '0')
        }
        continue
      }
      out += ch
      continue
    }
    if (ch === '"') inString = true
    out += ch
  }

  return out
}
