// apiStore.js
const { ipcRenderer } = require('electron');

const StoreAPI = {
    get: async (val) => {
        return await ipcRenderer.invoke('electron-store-get', val);
    },
    set: async (key, val) => {
        ipcRenderer.send('electron-store-set', key, val);
    }
};

module.exports = StoreAPI;