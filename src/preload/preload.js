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

(async () => {
    watchPath = await store.get('watchPath');
})();

ipcRenderer.on('watchPath-changed', async (event) => {
    watcher.close();
    watchPath = await store.get('watchPath');
    watcher = chokidar.watch(watchPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true

    });
});


var watcher = chokidar.watch(watchPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
});




watcher.on('add', function (path) {
    if (path.endsWith('outgoing.moo')) {
        if (api.connected) {
            const rl = readline.createInterface({
                input: fs.createReadStream(path),
                output: process.stdout,
                terminal: false
            });

            rl.on('line', (line) => {
                api.write(line + '\n');
            });

            rl.on('close', () => {
                fs.unlink(path, (err) => {
                    if (err) throw err;
                    console.log('File deleted!');
                });
            });
        }
    }
});
