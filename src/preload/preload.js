// preload.js
const { contextBridge, ipcRenderer } = require('electron');

var SystemFonts = require('system-font-families').default;
const api = require('./api/api.js');
const store = require('./api/store.js');


contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('store', store);



