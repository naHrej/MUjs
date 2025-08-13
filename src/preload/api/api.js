import { ipcRenderer } from "electron";
import { executeLuaScript } from "./script/lua.js";
// Assuming you have installed `monaco-editor`, `monaco-textmate`, and `vscode-textmate`

import fs from "fs";
import net from "net";
import SystemFonts from "system-font-families";
import { Buffer } from "buffer";
import { AnsiUp } from "ansi_up";

let client = new net.Socket();
let websocket = null;
let apiWebsocket = null;
let isWebSocketMode = false;

export const api = {
  invokeMenu: (template) => ipcRenderer.invoke("show-context-menu", template),
  invoke: (channel, ...args) => {
    return ipcRenderer.invoke(channel, ...args);
  },
  flashFrame: (flash) => ipcRenderer.send("flash-frame", flash),
  ansi_to_html: (data, htmlEnabled) => {
    let ansi_up = new AnsiUp();
    ansi_up.escape_html = !htmlEnabled;
    let html = ansi_up.ansi_to_html(data);
    return html;
  },
  version: () => ipcRenderer.invoke("get-app-version"),
  send: (channel, ...args) => {
    ipcRenderer.send(channel, ...args);
  },
  connect: (port, host) => {
    isWebSocketMode = false;
    client.connect(port, host);
    client.setKeepAlive(true, 10000);
  },
  connectWebSocket: (host, port) => {
    isWebSocketMode = true;
    
    // Construct WebSocket URLs
    const protocol = port === 443 ? 'wss:' : 'ws:';
    const gameUrl = `${protocol}//${host}:${port}/game`;
    const apiUrl = `${protocol}//${host}:${port}/api`;
    
    console.log(`Connecting to WebSocket: ${gameUrl}`);
    console.log(`Connecting to API WebSocket: ${apiUrl}`);
    
    // Create game WebSocket connection
    websocket = new WebSocket(gameUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket game connection opened');
      ipcRenderer.send("connect");
    };
    
    websocket.onmessage = (event) => {
      console.log('Received WebSocket data:', event.data);
      // Process the data similar to telnet
      processWebSocketData(event.data);
    };
    
    websocket.onclose = () => {
      console.log('WebSocket game connection closed');
      ipcRenderer.send("disconnected");
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket game error:', error);
      ipcRenderer.send("disconnected");
    };
    
    // Create API WebSocket connection
    apiWebsocket = new WebSocket(apiUrl);
    
    apiWebsocket.onopen = () => {
      console.log('WebSocket API connection opened');
    };
    
    apiWebsocket.onmessage = (event) => {
      console.log('Received API WebSocket data:', event.data);
      // Handle API-specific messages here
      try {
        const apiMessage = JSON.parse(event.data);
        handleApiMessage(apiMessage);
      } catch (e) {
        console.log('Non-JSON API message:', event.data);
      }
    };
    
    apiWebsocket.onclose = () => {
      console.log('WebSocket API connection closed');
    };
    
    apiWebsocket.onerror = (error) => {
      console.error('WebSocket API error:', error);
    };
  },
  connected: () => {
    if (isWebSocketMode) {
      return websocket && websocket.readyState === WebSocket.OPEN;
    } else {
      return client.connected;
    }
  },
  on: (channel, func) => {
    ipcRenderer.on(channel, func);
  },
  write: (data) => {
    return new Promise((resolve, reject) => {
      if (isWebSocketMode) {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          data += "\n"; // Append a newline character to the data
          websocket.send(data);
          resolve();
        } else {
          reject(new Error('WebSocket not connected'));
        }
      } else {
        data += "\n"; // Append a newline character to the data
        let buffer = Buffer.from(data, "utf8"); // Convert the string to a Buffer
        client.write(buffer, (err) => {
          // Send the buffer to the server
          if (err) reject(err);
          else resolve();
        });
      }
    });
  },
  end: () => {
    if (isWebSocketMode) {
      if (websocket) {
        websocket.close();
        websocket = null;
      }
      if (apiWebsocket) {
        apiWebsocket.close();
        apiWebsocket = null;
      }
    } else {
      client.destroy();
    }
    ipcRenderer.send("disconnected");
  },
  sendApiCommand: (command, data) => {
    if (isWebSocketMode && apiWebsocket && apiWebsocket.readyState === WebSocket.OPEN) {
      const message = {
        type: 'command',
        command: command,
        data: data,
        timestamp: Date.now()
      };
      apiWebsocket.send(JSON.stringify(message));
      console.log('Sent API command:', message);
    } else {
      console.warn('API WebSocket not available or not in WebSocket mode');
    }
  },
  getFonts: async () => {
    let ssf = new SystemFonts();
    let getFonts = ssf.getFontsSync();

    return getFonts;
  },
  executeLuaScript: (scriptPath, variables) => {
    executeLuaScript(scriptPath, variables);
  },
  OpenFile: async () => {
    try {
      // Show an open dialog and wait for the file path
      const filePath = await ipcRenderer.invoke("dialog:openFile");
      // If a file path was selected and it's a valid path
      if (filePath && fs.existsSync(filePath)) {
        // load the file
        const data = fs.readFileSync(filePath, "utf8");
        // process the data
        return data;
      } else {
        console.log("No file selected or file does not exist.");
      }
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  },
  saveFile: async (data) => {
    try {
      // Show a save dialog and wait for the file path
      const filePath = await ipcRenderer.invoke("dialog:saveFile");
      // If a file path was selected
      if (filePath) {
        // Write the data to the file
        fs.writeFileSync(filePath, data);
      }
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  },
};

// WebSocket data processing function
function processWebSocketData(data) {
  // Treat incoming data as HTML - send it as-is without line splitting
  if (data.trim()) {
    // Only remove problematic control characters, preserve Unicode
    data = data.replace(/[\x00\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    ipcRenderer.send("received-data", data);
  }
}

// API WebSocket message handler
function handleApiMessage(apiMessage) {
  console.log('Processing API message:', apiMessage);
  
  // Handle different types of API messages
  switch (apiMessage.type) {
    case 'editor-update':
      ipcRenderer.send('update-editor', apiMessage.data);
      break;
    case 'style-update':
      if (apiMessage.url) {
        ipcRenderer.send('reload-styles');
      }
      break;
    case 'notification':
      console.log('Server notification:', apiMessage.message);
      break;
    case 'command':
      // Handle server commands through API channel
      if (apiMessage.command) {
        console.log('Server command:', apiMessage.command);
      }
      break;
    default:
      console.log('Unknown API message type:', apiMessage.type);
  }
}


ipcRenderer.on('disconnect', () => {
    if (isWebSocketMode) {
      if (websocket) {
        websocket.close();
        websocket = null;
      }
      if (apiWebsocket) {
        apiWebsocket.close();
        apiWebsocket = null;
      }
    } else {
      client.end();
    }
});
let buffer = "";

client.on("data", (data) => {
  // Treat incoming data as HTML - accumulate and send complete chunks
  buffer += data.toString("utf-8");
  
  // Look for complete HTML blocks or natural breakpoints
  // For now, send data immediately as HTML chunks
  if (buffer.trim()) {
    // Only remove problematic control characters, preserve Unicode
    let processedData = buffer.replace(/[\x00\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    ipcRenderer.send("received-data", processedData);
    buffer = "";
  }
});

client.on("close", () => {
  // emit a disconnected event
  ipcRenderer.send("disconnected");
  console.log("Connection closed");
});

client.on("connect", () => {
  // emit a connected event
  ipcRenderer.send("connect");
});
