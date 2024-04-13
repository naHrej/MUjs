const { ipcMain, dialog } = require('electron');
const { app, BrowserWindow, Menu } = require('electron');
const Store = require('electron-store');
const path = require('path');
const preloadPath = path.resolve('src/preload/preload.js');

app.setPath("userData", path.join(__dirname, '../../data'));
const api = require('../preload/api/api.js');


ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow, {
        properties: ['openDirectory']
    })
    if (canceled) {
        return
    } else {
        return filePaths[0]
    }
})


const store = new Store(
    {
        defaults: {
            settings: {
                fontFamily: 'Consolas-pIqaD',
                fontSize: 14,
                watchPath: path.resolve('../../')
            },
            timers: {
                timer1: {
                    name: 'Timer 1',
                    interval: 60000,
                    enabled: false,
                    send: "idle"
                },
                timer2: {
                    name: 'Timer 2',
                    interval: 60000,
                    enabled: false,
                    send: "idle"
                }
            },
            sites:
            {
                site1: {
                    name: 'klinMoo',
                    host: 'code.deanpool.net',
                    port: 1701,
                },

            }
        }
    }

);



// IPC listener
ipcMain.handle('electron-store-get', (event, key) => {
    return store.get(key);
});
ipcMain.on('electron-store-set', async (event, key, val) => {
    store.set(key, val);
});

ipcMain.on('settings-updated', () => {
    // mainWindow is the BrowserWindow instance for your main window
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('settings-updated');
    });
});

ipcMain.on('site-selected', (event, host, port) => {
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('site-selected', host, port );
    });
});

ipcMain.on('connect', () => {
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('connect');
    });
});

ipcMain.on('received-data', (event, data) => {
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('received-data', data);
    });
});



const createSettingsWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            contextIsolation: true,
            sandbox: false,
            preload: preloadPath
        }
    })

    win.loadFile('public/settings.html')
}

const createWindow = () => {
    // Get the path to the preload script
    console.log('Preload path: ', preloadPath); // Log the preload path
    const menu = Menu.buildFromTemplate([
        {
            label: 'World',
            submenu: [
                {
                    label: 'Connect',
                    id: "connect",
                    enabled: false,
                    click: () => {
                        win.webContents.send('reconnect');
                        
                    }
                },
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
                    click: () => {
                        BrowserWindow.getFocusedWindow().webContents.openDevTools();
                    }
                }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);

    // Add a listener for the disconnected event
    ipcMain.on('disconnected', () => {
        // Re-enable the connect menu item
        menu.getMenuItemById('connect').enabled = true;
    });

    // Add a listener for the connected event
    ipcMain.on('connected', () => {
        // Disable the connect menu item
        menu.getMenuItemById('connect').enabled = false;
    });

    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            sandbox: false
        }
    })

    win.loadFile('public/index.html')




}




app.whenReady().then(() => {
    createWindow()
});

