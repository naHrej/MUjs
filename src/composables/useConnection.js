/**
 * Composable for managing connection state and settings
 * Handles connection configuration, status, and protocol settings
 */
import { reactive } from 'vue';

export function useConnection() {
  const connectionState = reactive({
    host: 'code.deanpool.net',
    name: 'klinMoo',
    port: 1701,
    sessionKey: null,
    connStr: null,
    acEnabled: false,
    ansiEnabled: false,
    htmlEnabled: false,
    websocketEnabled: false,
    isConnected: false,
  });

  const loadSettings = async () => {
    try {
      connectionState.ansiEnabled = await window.store.get('settings.ansiEnabled') || false;
      connectionState.htmlEnabled = await window.store.get('settings.htmlEnabled') || false;
      connectionState.websocketEnabled = await window.store.get('settings.websocketEnabled') || false;
    } catch (error) {
      console.warn('Failed to load connection settings:', error);
    }
  };

  const updateConnectionConfig = (config) => {
    Object.assign(connectionState, config);
  };

  const setConnected = (status) => {
    connectionState.isConnected = status;
  };

  const resetConnection = () => {
    connectionState.sessionKey = null;
    connectionState.connStr = null;
    connectionState.isConnected = false;
  };

  return {
    connectionState,
    loadSettings,
    updateConnectionConfig,
    setConnected,
    resetConnection,
  };
}
