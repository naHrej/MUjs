
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
                    accelerator: 'Ctrl+F4',
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
                    accelerator: 'F12',
                    click: () => {
                        BrowserWindow.getFocusedWindow().webContents.openDevTools();
                    },
                },
                {
                    label: 'Reload Styles',
                    accelerator: 'Shift+F5',
                    click: () => {
                        // emit event to reload styles
                        BrowserWindow.getFocusedWindow().webContents.send('reload-styles');
                    }
                },
                {
                    label: 'Reload',
                    accelerator: 'F5',
                    click: () => {
                        BrowserWindow.getFocusedWindow().reload();
                    }
                },
                {
                    label: 'Toggle Editor',
                    accelerator: 'F2',
                    click: () => {
                        spawnNewWindow('editor', '');
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

    // Handle open-code-editor event from renderer
    ipcMain.on('open-code-editor', (event, payload) => {
        // Open the editor window if not already open
        if (!windows['editor']) {
            spawnNewWindow('editor', '').then(() => {
                windows['editor'].webContents.send('open-code-editor', payload);
            });
        } else {
            windows['editor'].webContents.send('open-code-editor', payload);
        }
    });

    // retransmit submit event
    ipcMain.on('submit', (event, data) => {
        Object.values(windows).forEach(win => {
            win.webContents.send('submit', data);
        });
    });
    // Add a listener for the disconnected event
    ipcMain.on('disconnect', () => {
        connected = false;
        updateMenu();

    });

    ipcMain.on('flash-frame', (event, flash) => {
        Object.values(windows).forEach(win => {
            win.flashFrame(flash);
        });
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

    ipcMain.on('site-selected', (event, name, host, port, connectionString, acEnabled, ansiEnabled, htmlEnabled, websocketEnabled) => {

        Object.values(windows).forEach(win => {
            win.webContents.send('site-selected', name, host, port, connectionString, acEnabled, ansiEnabled, htmlEnabled, websocketEnabled);
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
    ipcMain.on('update-editor', (event, data) => {
        // check if we have an editor window open
        if (!windows['editor']) {
            spawnNewWindow('editor', data);
        }
        windows['editor'].once('ready-to-show', () => {
            windows['editor'].webContents.send('update-editor', data);
            });

           
        windows['editor'].webContents.send('update-editor', data);
                
    });
}



export function spawnNewWindow(id, html) {
    return new Promise((resolve, reject) => {
        windows[id] = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                preload: id == 'index' || id == 'settings' || 'editor' ? preloadPath : undefined,
                contextIsolation: false,
                nodeIntegration: true,
                sandbox: false
            }
        });

        if(id == 'editor') {
            // unregister any listeners for update-editor
            windows['editor'].removeAllListeners('update-editor');
        }
        windows[id].setMaxListeners(1000);
        // add event listener for onfocus
        windows[id].on('focus', () => {
            windows[id].flashFrame(false);
        });



        windows[id].loadFile(`public/${id == 'index' || id == 'settings' || id == 'editor' ? id : 'blank'}.html`);

        windows[id].once('ready-to-show', () => {
            windows[id].on('closed', () => {
                delete windows[id];
            });
            if (id !== 'index' && id !== 'settings' && id !== 'editor') {
                windows[id].webContents.executeJavaScript(`document.querySelector('.container').innerHTML += \`${html}\``);
            }
            resolve(windows[id]);
        });
    });
}
