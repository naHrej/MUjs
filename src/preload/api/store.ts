import { ipcRenderer } from 'electron'
import type { StoreAPI } from '../../shared/types/api'
import { serializeForIPC } from '../../shared/utils/serialization'

const StoreAPI: StoreAPI = {
  get: async (val: string) => {
    return await ipcRenderer.invoke('electron-store-get', val)
  },
  set: async (key: string, val: any) => {
    try {
      // Use serialization utility to ensure the value is fully serializable
      // This removes any Vue reactivity proxies or non-serializable objects
      let serializableVal = serializeForIPC(val, `store.set('${key}')`)
      
      // if the value is an array, convert it to an object (electron-store requirement)
      if (Array.isArray(serializableVal)) {
        const obj: Record<number, any> = {}
        serializableVal.forEach((v, i) => {
          obj[i] = v
        })
        serializableVal = obj
      }

      ipcRenderer.send('electron-store-set', key, serializableVal)
    } catch (error) {
      console.error('Error serializing value for store:', {
        key,
        error: error instanceof Error ? error.message : String(error),
        valueType: Array.isArray(val) ? 'array' : typeof val,
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }
}

export default StoreAPI
