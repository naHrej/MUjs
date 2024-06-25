const { ipcMain, dialog } = require('electron');
const { setupIpcHandlers } = require('./ipcHandler');
const { spawnNewWindow, setupMenus, setupWindowIpcHandlers} = require('./WindowManager.js');
const { app} = require('electron');
const Store = require('electron-store');
const path = require('path');

//app.setPath("userData", path.join(__dirname, '../../data'));
const api = require('../preload/api/api.js');



app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers(app);

  setupWindowIpcHandlers();



});


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



const createWindow = async () => {


  BrowserWindow = await spawnNewWindow('index', 'public/index.html');

}

module.exports = { createWindow}

