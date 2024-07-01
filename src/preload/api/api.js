import { ipcRenderer } from "electron";
import { executeLuaScript } from "./script/lua.js";
// Assuming you have installed `monaco-editor`, `monaco-textmate`, and `vscode-textmate`

import fs from "fs";
import net from "net";
import SystemFonts from "system-font-families";
import { Buffer } from "buffer";
import { AnsiUp } from "ansi_up";

let client = new net.Socket();

export const api = {
  invokeMenu: (template) => ipcRenderer.invoke("show-context-menu", template),
  invoke: (channel, ...args) => {
    return ipcRenderer.invoke(channel, ...args);
  },
  flashFrame: (flash) => ipcRenderer.send("flash-frame", flash),
  ansi_to_html: (data) => {
    let ansi_up = new AnsiUp();
    ansi_up.escape_html = false;
    let html = ansi_up.ansi_to_html(data);
    return html;
  },
  version: () => ipcRenderer.invoke("get-app-version"),
  send: (channel, ...args) => {
    ipcRenderer.send(channel, ...args);
  },
  connect: (port, host) => {
    client.connect(port, host);
    client.setKeepAlive(true, 10000);
  },
  connected: () => {
    return client.connected;
  },
  on: (channel, func) => {
    ipcRenderer.on(channel, func);
  },
  write: (data) => {
    return new Promise((resolve, reject) => {
      data += "\n"; // Append a newline character to the data
      let buffer = Buffer.from(data, "utf8"); // Convert the string to a Buffer
      client.write(buffer, (err) => {
        // Send the buffer to the server
        if (err) reject(err);
        else resolve();
      });
    });
  },
  end: () => {
    client.end();
    ipcRenderer.send("disconnected");
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

let buffer = "";

client.on("data", (data) => {
  // split the data on newlines
    
    // iterate the data and send it individually to the receiver
    while(true)
        {
            let index = data.indexOf("\n");
            if(index === -1)
            {
                buffer += data.toString("utf-8");
                break;
            }
            let line = buffer + data.toString("utf-8", 0, index);
            ipcRenderer.send("received-data", line);
            data = data.slice(index + 1);
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
