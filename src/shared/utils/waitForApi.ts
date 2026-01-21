import { logger } from './logger'

/**
 * Waits for window.api and window.store to be available
 * @param maxWaitMs Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when APIs are available, or rejects after timeout
 */
export function waitForApi(maxWaitMs: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    const checkApi = () => {
      // Check if window exists and APIs are available
      const hasApi = typeof window !== 'undefined' && 'api' in window && window.api !== undefined
      const hasStore = typeof window !== 'undefined' && 'store' in window && window.store !== undefined
      
      if (hasApi && hasStore) {
        logger.debug('window.api and window.store are now available')
        resolve()
        return
      }
      
      const elapsed = Date.now() - startTime
      if (elapsed >= maxWaitMs) {
        logger.error(`Timeout waiting for window.api and window.store after ${maxWaitMs}ms`)
        logger.error(`window.api available: ${hasApi}, window.store available: ${hasStore}`)
        logger.error(`window type: ${typeof window}, window.api type: ${typeof (window as any).api}, window.store type: ${typeof (window as any).store}`)
        reject(new Error('Timeout waiting for APIs'))
        return
      }
      
      // Check again after a short delay
      setTimeout(checkApi, 50)
    }
    
    checkApi()
  })
}
