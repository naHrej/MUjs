// preload.js
const { contextBridge, ipcRenderer } = require('electron')
const net = require('net');

const Convert = require('ansi-to-html');
const convert = new Convert();

const calculateCharCount = require('./utils');



let client = new net.Socket();
let naws = false;

contextBridge.exposeInMainWorld(
    'api', {
    calculateCharCount: () => {
        return calculateCharCount();
    },
    send_naws: (byte1, byte2) => {
        if(naws){
        sendNAWS(byte1, byte2);
        }
    },
    ansi_to_html: (data) => {
        let html = convert.toHtml(data);
        // Replace newline characters with <br> tags
        html = html.replace(/\n/g, '');
        return html;
    },
    naws: () => {
    },
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },
    receive: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    connect: (port, host) => {
        client.connect(port, host);
    },
    on: (event, func) => {
        client.on(event, func);
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
}
)

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
    let event = new CustomEvent('received-data', { detail: unicodeString });
    document.dispatchEvent(event);
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
                let width = calculateCharCount()-2;

                // Convert the width to two bytes
                let byte1 = Math.floor(width / 256);
                let byte2 = width % 256;

                // Respond with IAC SB NAWS byte1 byte2 0 24 IAC SE
                let nawsResponse = Buffer.from([IAC, SB, NAWS, byte1, byte2, 0, 24, IAC, SE, "\n"]);
                client.write(nawsResponse);
            }
            break;
        // ... existing cases ...
        default:
            console.log('Unknown IAC command:', command);
            break;
    }
}