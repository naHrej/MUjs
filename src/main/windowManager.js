import { app, Menu, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const preloadPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'src', 'preload', 'preload.mjs')
    : path.join(__dirname, '../', 'preload', 'preload.mjs');
const windows = {};
let connected = false;


function updateMenu() {
    const menu = Menu.buildFromTemplate([
        {
            label: 'World',
            submenu: [
                ...(connected ? [{
                    label: 'Disconnect',
                    id: "disconnect",
                    enabled: true,
                    click: () => {
                        // send disconnect to api
                        windows['index'].webContents.send('disconnect');
                    }
                }] : []),
                ...(!connected ? [{
                    label: 'Reconnect',
                    id: "reconnect",
                    enabled: true,
                    click: () => {
                        windows['index'].webContents.send('reconnect');
                    }
                }] : []),
                {
                    label: 'Exit',
                    click: () => {
                        app.quit();
                    }
                },
            ]
        },
        {
            label: 'Configuration',
            submenu: [
                {
                    label: 'Settings',
                    click: spawnNewWindow.bind(null, 'settings', '')
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
                    },
                },
                {
                    label: 'Reload Styles',
                    click: () => {
                        // emit event to reload styles
                        BrowserWindow.getFocusedWindow().webContents.send('reload-styles');
                    }
                }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);
}


export function setupWindowIpcHandlers() {
    ipcMain.on('window', (event, id, updateType, html) => {
        if (!windows[id]) {
            spawnNewWindow(id, html);
            return;
        }
        const window = windows[id];
        if (window) {
            if (updateType === 'append') {
                window.webContents.executeJavaScript(`document.querySelector('.container').innerHTML += \`${html}\``);
            } else if (updateType === 'replace') {
                window.webContents.executeJavaScript(`document.querySelector('.container').innerHTML = \`${html}\``);
            } else if (updateType === 'prepend') {
                window.webContents.executeJavaScript(`document.querySelector('.container').innerHTML = \`${html}\` + document.querySelector('.container').innerHTML`);
            } else if (updateType === 'clear') {
                window.webContents.executeJavaScript(`document.querySelector('.container').innerHTML = ''`);
            } else if (updateType === 'style') {
                window.webContents.executeJavaScript(`loadStyleFromURL(\`${html}\`)`);
            }
        }
    });

    // Add a listener for the disconnected event
    ipcMain.on('disconnect', () => {
        connected = false;
        updateMenu();

    });

    // Add a listener for the connected event
    ipcMain.on('connect', () => {
        connected = true;
        updateMenu();
    });

    ipcMain.handle('show-context-menu', (event, template) => {
        const menu = Menu.buildFromTemplate(template);
        menu.popup(windows['index'].fromWebContents(event.sender));
    });

    ipcMain.on('settings-updated', () => {
        // mainWindow is the BrowserWindow instance for your main window
        Object.values(windows).forEach(win => {
            win.webContents.send('settings-updated');
        });
    });

    ipcMain.on('site-selected', (event, name, host, port) => {

        Object.values(windows).forEach(win => {
            win.webContents.send('site-selected', name, host, port);
        });
    });

    ipcMain.on('connect', () => {

        Object.values(windows).forEach(win => {

            win.webContents.send('connect');
        });
    });

    ipcMain.on('received-data', (event, data) => {
        Object.values(windows).forEach(win => {
            win.webContents.send('received-data', data);
        });
    });

    ipcMain.on('disconnected', () => {
        Object.values(windows).forEach(win => {
            win.webContents.send('disconnected');
        });
    });
}



export function spawnNewWindow(id, html) {
    return new Promise((resolve, reject) => {
        windows[id] = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                preload: id == 'index' || id == 'settings' ? preloadPath : undefined,
                contextIsolation: false,
                nodeIntegration: false,
                sandbox: false
            }
        });





        windows[id].loadFile(`public/${id == 'index' || id == 'settings' ? id : 'blank'}.html`);

        windows[id].once('ready-to-show', () => {
            windows[id].on('closed', () => {
                delete windows[id];
            });
            if (id !== 'index' && id !== 'settings') {
                windows[id].webContents.executeJavaScript(`document.querySelector('.container').innerHTML += \`${html}\``);
            }
            resolve(windows[id]);
        });
    });
}