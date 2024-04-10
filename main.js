const { ipcMain } = require('electron');
// main.js
const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

const createSettingsWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            contextIsolation: true,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })
    win.openDevTools();

    win.loadFile('settings.html')
}

const createWindow = () => {
    // Get the path to the preload script
    const preloadPath = path.join(__dirname, 'preload.js');
    console.log('Preload path: ', preloadPath); // Log the preload path
    const menu = Menu.buildFromTemplate([
        {
            label: 'File',
            submenu: [
                {
                    label: 'Exit',
                    click: () => {
                        app.quit()
                    }
                },
            ]
        },
        {
            label: 'Configuration',
            submenu: [
                {
                    label: 'Settings',
                    click: createSettingsWindow
                }
            ]
        },
        {
            label: 'Developer',
            submenu: [
                {
                    label: 'Open Developer Tools',
                    click: () => win.webContents.openDevTools()
                }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);

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

    ipcMain.on('settings-updated', (event, settings) => {
        // mainWindow is the BrowserWindow instance for your main window
        win.webContents.send('settings-updated', settings);
    });
}

app.whenReady().then(() => {
    createWindow()
});

