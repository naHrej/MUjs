// apiStore.js
const { ipcRenderer } = require('electron');

const StoreAPI = {
    get: async (val) => {
        return ipcRenderer.sendSync('electron-store-get', val);
    },
    set: async (key, val) => {
        ipcRenderer.sendSync('electron-store-set', key, val);
    }
};

module.exports = StoreAPI;