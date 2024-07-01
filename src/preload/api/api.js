import { ipcRenderer } from 'electron';
import { calculateCharCount } from './../../utils.js';
import { executeLuaScript } from './script/lua.js';
// Assuming you have installed `monaco-editor`, `monaco-textmate`, and `vscode-textmate`

import fs from 'fs';
import net from 'net';
import SystemFonts from 'system-font-families';
import { Buffer } from 'buffer';
import { AnsiUp} from 'ansi_up';

let client = new net.Socket();
let naws = false;







export const api = {
    invokeMenu: (template) => ipcRenderer.invoke('show-context-menu', template),
    calculateCharCount: () => {
        return calculateCharCount();
    },
    invoke: (channel, ...args) => {
        return ipcRenderer.invoke(channel, ...args);
    },
    send_naws: (byte1, byte2) => {
        if (naws) {
            sendNAWS(byte1, byte2);
        }
    },
    ansi_to_html: (data) => {
        let ansi_up = new AnsiUp;
        ansi_up.escape_html = false;
        let html = ansi_up.ansi_to_html(data);
        return html;
    },
    version: () => ipcRenderer.invoke('get-app-version'),
    naws: () => {
    },
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
            data += '\n'; // Append a newline character to the data
            let buffer = Buffer.from(data, 'utf8'); // Convert the string to a Buffer
            client.write(buffer, (err) => { // Send the buffer to the server
                if (err) reject(err);
                else resolve();
            });
        });
    },
    end: () => {
        client.end();
        ipcRenderer.send('disconnected');
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
            const filePath = await ipcRenderer.invoke('dialog:openFile');
            // If a file path was selected and it's a valid path
            if (filePath && fs.existsSync(filePath)) {
                // load the file
                const data = fs.readFileSync(filePath, 'utf8');
                // process the data
                return data;
            } else {
                console.log('No file selected or file does not exist.');
            }
        } catch (error) {
            console.error('Failed to open file:', error);
        }
    },
    saveFile: async (data) => {
        try {
            // Show a save dialog and wait for the file path
            const filePath = await ipcRenderer.invoke('dialog:saveFile');
            // If a file path was selected
            if (filePath) {
                // Write the data to the file
                fs.writeFileSync(filePath, data);
            }
        } catch (error) {
            console.error('Failed to save file:', error);
        }
    }
};

client.on('data', (data) => {
  
    ipcRenderer.send('received-data', data.toString('utf-8'));
            //console.log(line);
 

});

client.on('close', () => {
    // emit a disconnected event
    ipcRenderer.send('disconnected');
    console.log('Connection closed');
});

client.on('connect', () => {
    // emit a connected event
    ipcRenderer.send('connect');
});




function sendNAWS(byte1, byte2) {
    // Define the IAC commands
    const IAC = 255;
    const DO = 253;
    const WILL = 251;
    const SB = 250;
    const NAWS = 31;
    const SE = 240;
    let nawsResponse = Buffer.from([IAC, SB, NAWS, byte1, byte2, 0, 24, IAC, SE]);
    client.write(nawsResponse);

}

function handleIACCommand(command, option) {
    // Define the IAC commands
    const IAC = 255;
    const DO = 253;
    const WILL = 251;
    const SB = 250;
    const NAWS = 31;
    const SE = 240;
    const SPAWN = 220;

    // Handle the IAC command based on its value
    switch (command) {
        // ... existing cases ...
        case DO:
            if (option === NAWS) {
                // Respond with IAC WILL NAWS
                if (!naws) {
                    let response = Buffer.from([IAC, WILL, NAWS]);
                    client.write(response);
                }

                naws = true;
                // Calculate the width of the console
                let width = calculateCharCount() - 2;

                // Convert the width to two bytes
                let byte1 = Math.floor(width / 256);
                let byte2 = width % 256;

                // Respond with IAC SB NAWS byte1 byte2 0 24 IAC SE
                let nawsResponse = Buffer.from([IAC, SB, NAWS, byte1, byte2, 0, 24, IAC, SE, "\n"]);
                client.write(nawsResponse);
            }
            break;
        case SPAWN:
            console.log('Spawn command received');

            break;
        // ... existing cases ...
        default:
            console.log('Unknown IAC command:', command);
            break;
    }
};