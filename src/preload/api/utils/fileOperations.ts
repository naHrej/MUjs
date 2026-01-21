import { ipcRenderer } from "electron"
import fs from "fs"
import { logger } from "../../../shared/utils/logger"

export async function openFile(): Promise<string | undefined> {
  try {
    // Show an open dialog and wait for the file path
    const filePath = await ipcRenderer.invoke("dialog:openFile") as string | undefined
    // If a file path was selected and it's a valid path
    if (filePath && fs.existsSync(filePath)) {
      // load the file
      const data = fs.readFileSync(filePath, "utf8")
      // process the data
      return data
      } else {
        logger.debug("No file selected or file does not exist.")
        return undefined
      }
    } catch (error) {
      logger.error("Failed to open file:", error)
      return undefined
    }
}

export async function saveFile(data: string): Promise<void> {
  try {
    // Show a save dialog and wait for the file path
    const filePath = await ipcRenderer.invoke("dialog:saveFile") as string | undefined
    // If a file path was selected
    if (filePath) {
      // Write the data to the file
      fs.writeFileSync(filePath, data)
    }
    } catch (error) {
      logger.error("Failed to save file:", error)
    }
}
