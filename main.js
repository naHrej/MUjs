// main.js
const { app, BrowserWindow } = require('electron')
const path = require('path')

const createWindow = () => {
    // Get the path to the preload script
    const preloadPath = path.join(__dirname, 'preload.js');
    console.log('Preload path: ', preloadPath); // Log the preload path

    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            sandbox: false
        }
    })

    win.loadFile('index.html')
}

app.whenReady().then(() => {
    createWindow()
})