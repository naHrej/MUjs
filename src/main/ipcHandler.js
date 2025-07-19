import { ipcMain, BrowserWindow, dialog } from 'electron';
import fs from 'fs';

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

    ipcMain.handle('dialog:openFile', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
            title: "Select File",
            properties: ['openFile']
        });
        console.log(filePaths); // Debug log to see what paths are returned
        if (canceled || filePaths.length === 0) {
            return;
        } else {
            const selectedPath = filePaths[0];
            // Check if the path exists
            if (fs.existsSync(selectedPath)) {
                return selectedPath;
            } else {
                console.error('Selected file path does not exist:', selectedPath);
                return; // Handle as needed, e.g., return an error or null
            }
        }
    });

    ipcMain.handle('dialog:saveFile', async () => {
        const { canceled, filePath } = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
            title: "Save File",
            buttonLabel: "Save",
            properties: ['createDirectory']
        })
        if (canceled) {
            return
        } else {
            return filePath
        }
    })

    // Handle read file content
    ipcMain.handle('read-file-content', async (event, filePath) => {
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            } else {
                throw new Error('File does not exist: ' + filePath);
            }
        } catch (error) {
            console.error('Error reading file:', error);
            throw error;
        }
    });

    // Handle save file content
    ipcMain.handle('save-file-content', async (event, filePath, content) => {
        try {
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        } catch (error) {
            console.error('Error saving file:', error);
            throw error;
        }
    });

}