// apiStore.js
const { ipcRenderer } = require('electron');

const StoreAPI = {
    get: async (val) => {
        return await ipcRenderer.invoke('electron-store-get', val);
    },
    set: async (key, val) => {

        // if the value is an array, convert it to an object
        if (Array.isArray(val)) {
            const obj = {};
            val.forEach((v, i) => {
                obj[i] = v;
            });
            val = obj;
        }

        ipcRenderer.send('electron-store-set', key, val);
    }
};

module.exports = StoreAPI;