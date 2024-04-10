// preload.js
const { contextBridge, ipcRenderer } = require('electron');

var SystemFonts = require('system-font-families').default;
const api = require('./api/api');
const store = require('./api/store');

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('store', store);



