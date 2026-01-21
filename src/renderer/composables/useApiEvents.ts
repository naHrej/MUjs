import { onMounted } from 'vue'
import { dataPipeline } from '../../services/dataPipeline'
import { logger } from '../../shared/utils/logger'
import { waitForApi } from '../../shared/utils/waitForApi'

import type { IpcRendererEvent } from 'electron'

export function useApiEvents() {
  onMounted(async () => {
    // Wait for window.api to be available
    try {
      await waitForApi()
    } catch (error) {
      logger.error('Failed to wait for window.api:', error)
      return
    }

    // Subscribe to received-data events from API
    window.api.on('received-data', (_event: IpcRendererEvent, data: string) => {
      // Process through pipeline
      dataPipeline.process(data)
    })

    // Subscribe to submit events (from editor or other components)
    window.api.on('submit', async (_event: IpcRendererEvent, data: string) => {
      // Send data to server line by line
      // The data may contain multiple lines (e.g., from code editor with saveCommand + code + endMarker)
      const lines = data.split(/\r?\n/)
      
      // Send lines sequentially to ensure proper ordering
      for (const line of lines) {
        try {
          // Send each line to server (including empty lines, as they may be significant)
          // window.api.write() will append \n to each line
          await window.api.write(line)
        } catch (err) {
          logger.error('Error sending line to server:', err)
          // Continue sending remaining lines even if one fails
        }
      }
    })
  })
}
