import { ipcMain, BrowserWindow, dialog } from 'electron';

export function setupIpcHandlers(app) {
    ipcMain.handle('get-app-version', async (event) => {
        return app.getVersion();
    });

    ipcMain.handle('dialog:openDirectory', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
            title: "Select Directory",
            properties: ['openDirectory']
        })
        if (canceled) {
            return
        } else {
            return filePaths[0]
        }
    })

}