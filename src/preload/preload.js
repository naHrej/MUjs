// preload.js
const { contextBridge, ipcRenderer} = require('electron');
const fs = require('fs');
const chokidar = require('chokidar');

var SystemFonts = require('system-font-families').default;
const api = require('./api/api.js');
const store = require('./api/store.js');


contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('store', store);


let watchPath;
let watcher;
let watchEnabled = false;

(async () => {
    watchPath = await store.get('watchPath');
    watchEnabled = await store.get('watchEnabled');
    console.log("Watcher Path: " + watchPath);

    watcher = chokidar.watch(watchPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true
    });

    watcher.on('add', (path) => {
        // if path ends with outgoing.moo, send to moo
        if (path.endsWith('outgoing.moo') && api.connected) {
            console.log("File added: " + path);
            fs.readFile(path, 'utf8', (err, data) => {
                if (err) {
                    console.error(err);
                    return;
                } else
                {
                    api.write(data);
                    fs.unlink(path, (err) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        console.log('File deleted');
                    });
                }
                console.log(data);
            });
        }
    });
})();

ipcRenderer.on('watchPath-changed', async (event) => {
    watcher.close();
    watchPath = await store.get('watchPath');
    watcher = chokidar.watch(watchPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true

    });
});

