/**
 * Serialization utilities for IPC communication
 * Ensures all data passed through IPC is properly serializable
 */

export interface SerializationError extends Error {
  channel?: string
  dataType?: string
  originalError?: Error
}

/**
 * Check if data can be serialized without errors
 */
export function isSerializable(data: any): boolean {
  if (data === null || data === undefined) {
    return true
  }

  // Primitives are always serializable
  const type = typeof data
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return true
  }

  // Functions are not serializable
  if (type === 'function') {
    return false
  }

  // Check for circular references and other issues
  try {
    JSON.stringify(data)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Serialize data for IPC transmission
 * Removes Vue reactivity proxies and ensures deep cloning
 */
export function serializeForIPC(data: any, context?: string): any {
  if (data === null || data === undefined) {
    return data
  }

  // Primitives don't need serialization
  const type = typeof data
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return data
  }

  // Functions cannot be serialized
  if (type === 'function') {
    const error: SerializationError = new Error(
      `Cannot serialize function in IPC call${context ? ` (${context})` : ''}`
    ) as SerializationError
    error.dataType = 'function'
    if (context) error.channel = context
    console.error('Serialization error:', error.message)
    throw error
  }

  try {
    // Use JSON.parse(JSON.stringify()) to deep clone and remove reactivity
    // This also handles Date objects (converts to ISO strings)
    const serialized = JSON.parse(JSON.stringify(data))
    return serialized
  } catch (error) {
    const serializationError: SerializationError = new Error(
      `Failed to serialize data for IPC${context ? ` (${context})` : ''}: ${error instanceof Error ? error.message : String(error)}`
    ) as SerializationError
    serializationError.dataType = Array.isArray(data) ? 'array' : typeof data
    serializationError.originalError = error instanceof Error ? error : new Error(String(error))
    if (context) serializationError.channel = context

    console.error('Serialization error:', {
      message: serializationError.message,
      dataType: serializationError.dataType,
      context,
      error: error instanceof Error ? error.stack : String(error)
    })

    throw serializationError
  }
}

/**
 * Deserialize data received from IPC
 * Validates structure and type if expectedType is provided
 */
export function deserializeFromIPC<T>(data: any, expectedType?: string): T {
  if (data === null || data === undefined) {
    return data as T
  }

  // Data from IPC should already be serialized, but validate structure
  try {
    // Re-serialize to ensure it's valid JSON
    JSON.stringify(data)
  } catch (error) {
    const deserializationError: SerializationError = new Error(
      `Failed to deserialize data from IPC${expectedType ? ` (expected ${expectedType})` : ''}: ${error instanceof Error ? error.message : String(error)}`
    ) as SerializationError
    deserializationError.dataType = Array.isArray(data) ? 'array' : typeof data
    deserializationError.originalError = error instanceof Error ? error : new Error(String(error))

    console.error('Deserialization error:', {
      message: deserializationError.message,
      dataType: deserializationError.dataType,
      expectedType,
      error: error instanceof Error ? error.stack : String(error)
    })

    throw deserializationError
  }

  return data as T
}

/**
 * Serialize multiple arguments for IPC
 */
export function serializeArgs(args: any[], context?: string): any[] {
  return args.map((arg, index) => {
    try {
      return serializeForIPC(arg, context ? `${context}[arg${index}]` : `arg${index}`)
    } catch (error) {
      console.error(`Failed to serialize argument ${index}:`, error)
      throw error
    }
  })
}

/**
 * Type-safe serialization for CodeEditPayload
 */
import type { CodeEditPayload } from '../types/ipc'

export function serializeCodeEditPayload(payload: CodeEditPayload, context?: string): any {
  try {
    // Validate structure
    if (!payload || typeof payload !== 'object') {
      throw new Error('CodeEditPayload must be an object')
    }

    if (typeof payload.saveCommand !== 'string') {
      throw new Error('CodeEditPayload.saveCommand must be a string')
    }

    if (!Array.isArray(payload.headerData)) {
      throw new Error('CodeEditPayload.headerData must be an array')
    }

    if (!Array.isArray(payload.codeLines)) {
      throw new Error('CodeEditPayload.codeLines must be an array')
    }

    if (typeof payload.endMarker !== 'string') {
      throw new Error('CodeEditPayload.endMarker must be a string')
    }

    // Serialize
    return serializeForIPC(payload, context || 'CodeEditPayload')
  } catch (error) {
    const serializationError: SerializationError = new Error(
      `Failed to serialize CodeEditPayload${context ? ` (${context})` : ''}: ${error instanceof Error ? error.message : String(error)}`
    ) as SerializationError
    serializationError.originalError = error instanceof Error ? error : new Error(String(error))
    if (context) serializationError.channel = context
    throw serializationError
  }
}

export function deserializeCodeEditPayload(data: any, context?: string): CodeEditPayload {
  try {
    const deserialized = deserializeFromIPC<any>(data, 'CodeEditPayload')

    // Validate structure
    if (!deserialized || typeof deserialized !== 'object') {
      throw new Error('CodeEditPayload must be an object')
    }

    if (typeof deserialized.saveCommand !== 'string') {
      throw new Error('CodeEditPayload.saveCommand must be a string')
    }

    if (!Array.isArray(deserialized.headerData)) {
      throw new Error('CodeEditPayload.headerData must be an array')
    }

    if (!Array.isArray(deserialized.codeLines)) {
      throw new Error('CodeEditPayload.codeLines must be an array')
    }

    if (typeof deserialized.endMarker !== 'string') {
      throw new Error('CodeEditPayload.endMarker must be a string')
    }

    return deserialized as CodeEditPayload
  } catch (error) {
    const deserializationError: SerializationError = new Error(
      `Failed to deserialize CodeEditPayload${context ? ` (${context})` : ''}: ${error instanceof Error ? error.message : String(error)}`
    ) as SerializationError
    deserializationError.originalError = error instanceof Error ? error : new Error(String(error))
    if (context) deserializationError.channel = context
    console.error('CodeEditPayload deserialization error:', deserializationError)
    throw deserializationError
  }
}

/**
 * Type-safe serialization for Electron menu templates
 */
export function serializeMenuTemplate(template: any[], context?: string): any[] {
  try {
    if (!Array.isArray(template)) {
      throw new Error('Menu template must be an array')
    }

    // Serialize each menu item
    return template.map((item, index) => {
      try {
        // Menu items can have functions (click handlers), which we need to remove
        const serialized = serializeForIPC(item, context ? `${context}[${index}]` : `menu[${index}]`)
        
        // Remove function properties that might have been serialized as null
        if (serialized && typeof serialized === 'object') {
          // Electron menu templates can have click functions, which we remove
          // The main process will handle menu actions
          const cleaned: any = { ...serialized }
          if ('click' in cleaned && typeof cleaned.click === 'function') {
            delete cleaned.click
          }
          if ('submenu' in cleaned && Array.isArray(cleaned.submenu)) {
            cleaned.submenu = serializeMenuTemplate(cleaned.submenu, context ? `${context}[${index}].submenu` : `menu[${index}].submenu`)
          }
          return cleaned
        }
        return serialized
      } catch (error) {
        console.error(`Failed to serialize menu item ${index}:`, error)
        throw error
      }
    })
  } catch (error) {
    const serializationError: SerializationError = new Error(
      `Failed to serialize menu template${context ? ` (${context})` : ''}: ${error instanceof Error ? error.message : String(error)}`
    ) as SerializationError
    serializationError.originalError = error instanceof Error ? error : new Error(String(error))
    if (context) serializationError.channel = context
    throw serializationError
  }
}
