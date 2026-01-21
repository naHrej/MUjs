import { ref, Ref, onMounted } from 'vue'
import { dataPipeline } from '../../services/dataPipeline'
import { logger } from '../../shared/utils/logger'
import { waitForApi } from '../../shared/utils/waitForApi'
import type { IpcRendererEvent } from 'electron'

export function useConnectionEvents(
  showApp: Ref<boolean>,
  ansiEnabled: Ref<boolean>,
  htmlEnabled: Ref<boolean>,
  host: Ref<string>,
  sessionKey: Ref<string | null>,
  connectionString: Ref<string>,
  sendOnConnect: Ref<boolean>,
  terminalRef: Ref<HTMLElement | null>
) {
  onMounted(async () => {
    // Wait for window.api to be available
    try {
      await waitForApi()
    } catch (error) {
      logger.error('Failed to wait for window.api:', error)
      return
    }

    // Subscribe to connection events
    window.api.on('connect', async () => {
      showApp.value = true
      sessionKey.value = dataPipeline.generateSessionKey()
      dataPipeline.setOptions({
        ansiEnabled: ansiEnabled.value,
        htmlEnabled: htmlEnabled.value,
        host: host.value,
        sessionKey: sessionKey.value
      })
      
      // Send connection string if "Send On Connect" is enabled
      if (sendOnConnect.value && connectionString.value) {
        // Small delay to ensure connection is fully ready
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Split connection string by lines and send each one sequentially
        const lines = connectionString.value.split(/\r?\n/)
        for (const line of lines) {
          if (line.trim()) {
            try {
              await window.api.write(line)
            } catch (err) {
              logger.error('Error sending connection string line:', err)
              // Continue sending remaining lines even if one fails
            }
          }
        }
      }
    })

    window.api.on('disconnected', () => {
      showApp.value = false
      // Reset data pipeline state (clears protocol parser sessions)
      dataPipeline.reset()
      if (terminalRef.value) {
        while (terminalRef.value.firstChild) {
          terminalRef.value.removeChild(terminalRef.value.firstChild)
        }
      }
    })

    // Subscribe to site-selected event
    window.api.on('site-selected', async (
      _event: IpcRendererEvent,
      name: string,
      siteHost: string,
      port: number,
      connstr: string,
      acEnabled: boolean,
      siteAnsiEnabled: boolean,
      siteHtmlEnabled: boolean,
      websocketEnabled: boolean
    ) => {
      host.value = siteHost
      ansiEnabled.value = siteAnsiEnabled
      htmlEnabled.value = siteHtmlEnabled
      connectionString.value = connstr || ''
      sendOnConnect.value = acEnabled || false
      
      dataPipeline.setOptions({
        ansiEnabled: siteAnsiEnabled,
        htmlEnabled: siteHtmlEnabled,
        host: siteHost,
        sessionKey: sessionKey.value
      })

      const versionNumber = await window.api.version()
      document.title = `${name} - MUjs v${versionNumber}`

      if (websocketEnabled) {
        window.api.connectWebSocket(siteHost, port)
      } else {
        window.api.connect(port, siteHost)
      }
    })

    // Subscribe to settings updates
    window.api.on('settings-updated', async () => {
      if (!window.store) {
        logger.warn('window.store is not available, cannot update settings')
        return
      }
      
      try {
        ansiEnabled.value = (await window.store.get('settings.ansiEnabled')) || false
        htmlEnabled.value = (await window.store.get('settings.htmlEnabled')) || false
        
        dataPipeline.setOptions({
          ansiEnabled: ansiEnabled.value,
          htmlEnabled: htmlEnabled.value,
          host: host.value,
          sessionKey: sessionKey.value
        })
      } catch (error) {
        logger.error('Error updating settings:', error)
      }
    })
  })
}
