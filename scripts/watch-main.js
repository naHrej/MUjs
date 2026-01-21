import { watchFile, copyFileSync, existsSync, statSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const mainPath = resolve(__dirname, '../.vite/build/main.js')
const backupPath = resolve(__dirname, '../.vite/build/main.js.backup')

console.log('Watching for main.js changes...')

// Watch for changes and restore if needed
watchFile(mainPath, { interval: 100 }, (curr, prev) => {
  if (existsSync(mainPath) && existsSync(backupPath)) {
    const size = statSync(mainPath).size
    if (size < 50000) {
      copyFileSync(backupPath, mainPath)
      console.log('Restored main.js from backup')
    }
  }
})

// Keep process alive
process.on('SIGINT', () => process.exit(0))
setInterval(() => {}, 1000)
