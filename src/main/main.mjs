import { ipcMain, app } from 'electron';
import { setupIpcHandlers } from './ipcHandler.js';
import { spawnNewWindow, setupWindowIpcHandlers } from './windowManager.js';
import Store from 'electron-store';
import path from 'path';


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


  await spawnNewWindow('index', 'public/index.html');

}

