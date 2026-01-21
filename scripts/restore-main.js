import { existsSync, copyFileSync, statSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const mainPath = resolve(__dirname, '../.vite/build/main.js')
const backupPath = resolve(__dirname, '../.vite/build/main.js.backup')

if (existsSync(backupPath) && existsSync(mainPath)) {
  const mainSize = statSync(mainPath).size
  if (mainSize < 50000) {
    copyFileSync(backupPath, mainPath)
    console.log('Restored main.js from backup')
  }
}
