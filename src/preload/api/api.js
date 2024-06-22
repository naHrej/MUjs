// api.js
const { ipcRenderer, ipcMain} = require('electron');
const { calculateCharCount } = require('./../../utils');
const { executeLuaScript } = require('./script/lua');

const net = require('net');
const { connected } = require('process');
const { Console } = require('console');
const SystemFonts = require('system-font-families').default;
let client = new net.Socket();
let naws = false;

let ansi;

import('ansi_up').then((module) => {
    ansi = new module.AnsiUp();
});


const api = {
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
        const ansiRegex = /\x1b\[[0-9;]*m/g;
        // Strip any ANSI escape codes from the data
        let html = data.replace(ansiRegex, '');
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
        // Append a newline character to the data
        data += '\n';
        // Convert the string to a Buffer
        let buffer = Buffer.from(data, 'utf8');
        // Send the buffer to the server
        client.write(buffer);
    },
    end: () => {
        client.end();
    },
    getFonts: async () => {
        let ssf = new SystemFonts();
        let getFonts = ssf.getFontsSync();

        return getFonts;
    },
    executeLuaScript: (scriptPath, variables) => {
        executeLuaScript(scriptPath, variables);
    }
};
module.exports = api;

client.on('data', (data) => {
    // Convert the data to a Buffer
    let buffer = Buffer.from(data);
    let newBuffer = [];

    // Loop through the buffer
    for (let i = 0; i < buffer.length; i++) {
        // Check for the IAC command
        if (buffer[i] === 255) {
            // Handle the IAC command
            handleIACCommand(buffer[i + 1], buffer[i + 2]);
            i += 2;
        } else {
            // Append the byte to the new buffer
            newBuffer.push(buffer[i]);
        }
    }
    let uint8array = Buffer.from(newBuffer); // replace this with your Uint8Array
    let decoder = new TextDecoder('utf-8');
    let unicodeString = decoder.decode(uint8array);

    // split the string into lines using either /r or /n
    let lines = unicodeString.split(/\r\n|\r|\n/);


    // iterate over the lines and emit a received-data event for each line
    lines.forEach((line) => {
        // If the line starts with !@Window: we get the window title, update type and html data and emit a window event
        if (line.startsWith('!@Window:')) {
            let windowData = line.slice('!@Window:'.length);
            let windowDataArray = windowData.split(':');
            let windowTitle = windowDataArray[0];
            let windowType = windowDataArray[1];
            let windowHtml = windowDataArray.slice(2).join(':');
            console.log(windowTitle, windowType, windowHtml);
            ipcRenderer.send('window', windowTitle, windowType, windowHtml);
        }
        else {
        ipcRenderer.send('received-data', line);
        console.log(line);
        }
    });
    //ipcRenderer.send('received-data', unicodeString);

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