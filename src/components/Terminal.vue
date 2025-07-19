<template>
  <div id="app" class="flex-container" v-show="showApp">
    <TerminalDisplay
      ref="terminalDisplay"
      v-show="showApp"
      :ansi-enabled="connectionState.ansiEnabled"
      :html-enabled="connectionState.htmlEnabled"
      @command-clicked="handleCommand"
    />
    <div id="resizeHandle" v-show="showApp"></div>
    <TerminalInput
      v-show="showApp"
      @input-submitted="handleInputSubmitted"
    />
  </div>
</template>

<script>
import { ref, reactive, onMounted, nextTick } from 'vue';
import TerminalDisplay from './terminal/TerminalDisplay.vue';
import TerminalInput from './terminal/TerminalInput.vue';
import { useConnection } from '../composables/useConnection.js';
import { useCodeEditSession } from '../composables/useCodeEditSession.js';
import { terminalUtils } from '../utils/components/terminalUtils.js';
import WarpSpeed from '../utils/warpspeed.js';

export default {
  name: 'Terminal',
  components: {
    TerminalDisplay,
    TerminalInput,
  },
  setup() {
    const terminalDisplay = ref(null);
    const showApp = ref(false);
    
    // Code editing session for ProgStart/ProgEdit/ProgEnd protocol
    const codeEditSession = ref({
      active: false,
      saveCommand: '',
      headerData: [],
      codeLines: [],
      endMarker: '',
    });
    
    const { connectionState, loadSettings } = useConnection();
    const { startCodeEditSession, endCodeEditSession } = useCodeEditSession();

    const applySettings = async () => {
      await loadSettings();
    };

    const handleInputSubmitted = (input) => {
      // Input is already sent to server by the TerminalInput component
      // Just handle any additional processing here if needed
    };

    const handleCommand = (command) => {
      window.api.write(command);
    };

    const handleReceivedData = (data) => {
      let omit = false;
      
      // Handle code editing protocol
      if (data.startsWith("ProgStart > ")) {
        codeEditSession.value.active = true;
        codeEditSession.value.saveCommand = data.replace("ProgStart > ", "").trim();
        codeEditSession.value.headerData = [];
        codeEditSession.value.codeLines = [];
        codeEditSession.value.endMarker = '';
        omit = true;
        return;
      }
      
      if (codeEditSession.value.active && data.startsWith("ProgData > ")) {
        codeEditSession.value.headerData.push(data.replace("ProgData > ", "").trim());
        omit = true;
        return;
      }
      
      if (codeEditSession.value.active && data.startsWith("ProgEdit > ")) {
        codeEditSession.value.codeLines.push(data.replace("ProgEdit > ", ""));
        omit = true;
        return;
      }
      
      if (codeEditSession.value.active && data.startsWith("ProgEnd > ")) {
        codeEditSession.value.endMarker = data.replace("ProgEnd > ", "").trim();
        
        // Send all collected info to the editor - convert reactive objects to plain objects
        const editorPayload = {
          saveCommand: codeEditSession.value.saveCommand,
          headerData: [...codeEditSession.value.headerData], // Convert to plain array
          codeLines: [...codeEditSession.value.codeLines],   // Convert to plain array
          endMarker: codeEditSession.value.endMarker
        };
        
        startCodeEditSession(editorPayload);
        window.api.send("open-code-editor", editorPayload);
        
        codeEditSession.value.active = false;
        omit = true;
        return;
      }
      
      // If not part of code editing protocol, display normally
      if (!omit) {
        const processed = terminalUtils.parseProtocolData(data);
        
        if (processed.type === 'html') {
          terminalDisplay.value?.appendContent(processed.content, 'html');
        } else {
          terminalDisplay.value?.appendContent(processed.content, 'text');
        }
      }
    };

    const setupEventListeners = () => {
      window.api.onReceivedData((data) => {
        handleReceivedData(data);
      });

      window.api.onSiteSelected((name, host, port, connectionString, acEnabled, ansiEnabled, htmlEnabled, websocketEnabled) => {
        connectionState.name = name;
        connectionState.host = host;
        connectionState.port = port;
        connectionState.connStr = connectionString;
        connectionState.acEnabled = acEnabled;
        connectionState.ansiEnabled = ansiEnabled;
        connectionState.htmlEnabled = htmlEnabled;
        connectionState.websocketEnabled = websocketEnabled;
        
        showApp.value = true;
        
        // Display connection attempt message
        terminalDisplay.value?.appendContent(`Attempting to connect to ${name} at ${host}:${port}...\n`, 'text');
        
        // Initiate connection based on websocket setting
        try {
          if (websocketEnabled) {
            console.log(`Connecting via WebSocket to ${host}:${port}`);
            terminalDisplay.value?.appendContent(`Using WebSocket connection...\n`, 'text');
            window.api.connectWebSocket(host, port);
          } else {
            console.log(`Connecting via TCP to ${host}:${port}`);
            terminalDisplay.value?.appendContent(`Using TCP connection...\n`, 'text');
            window.api.connect(port, host);
          }
        } catch (error) {
          console.error('Failed to connect:', error);
          terminalDisplay.value?.appendContent(`Failed to connect: ${error.message}\n`, 'text');
        }
      });

      window.api.onConnect(() => {
        connectionState.isConnected = true;
        terminalDisplay.value?.appendContent('Connected to server.\n', 'text');
        
        // Send connection string if enabled
        if (connectionState.acEnabled && connectionState.connStr) {
          console.log('Sending connection string:', connectionState.connStr);
          window.api.write(connectionState.connStr);
        }
        
        // Generate session key for client identification
        connectionState.sessionKey = Math.random().toString(36).substring(2, 15) + 
                                    Math.random().toString(36).substring(2, 15);
      });

      window.api.onDisconnected(() => {
        connectionState.isConnected = false;
        terminalDisplay.value?.appendContent('Disconnected from server.\n', 'text');
      });

      window.api.onSubmit((data) => {
        if (codeEditSession.active) {
          endCodeEditSession();
        }
      });
    };

    onMounted(async () => {
      await applySettings();
      setupEventListeners();
      
      // Start warpspeed animation
      const canvas = document.getElementById('canvas');
      if (canvas) {
        new WarpSpeed(canvas);
      }
    });

    return {
      terminalDisplay,
      showApp,
      connectionState,
      codeEditSession,
      handleInputSubmitted,
      handleCommand,
    };
  },
};
</script>

<style scoped>
.flex-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1e1e1e;
  color: #cccccc;
}

#resizeHandle {
  height: 5px;
  background: #3e3e42;
  cursor: ns-resize;
  border-top: 1px solid #555;
  border-bottom: 1px solid #555;
}

#resizeHandle:hover {
  background: #007acc;
}
</style>
