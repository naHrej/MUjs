import { build } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, statSync, copyFileSync, watchFile, unwatchFile } from 'fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const mainPath = resolve(__dirname, '../.vite/build/main.js')
const backupPath = resolve(__dirname, '../.vite/build/main.js.backup')

// Check if file exists and is substantial (not the 12KB SSR bundle)
const needsBuild = !existsSync(mainPath) || (existsSync(mainPath) && statSync(mainPath).size < 50000)

if (needsBuild) {
  console.log('Main.js not found or too small, building...')
  mkdirSync(resolve(__dirname, '../.vite/build'), { recursive: true })
  
  await build({
    build: {
      outDir: '.vite/build',
      rollupOptions: {
        input: resolve(__dirname, '../src/main/main.ts'),
        external: ['electron'],
        output: {
          dir: resolve(__dirname, '../.vite/build'),
          format: 'cjs',
          entryFileNames: 'main.js'
        }
      }
    }
  })
  
  // Backup the good file
  if (existsSync(mainPath) && statSync(mainPath).size > 50000) {
    copyFileSync(mainPath, backupPath)
    console.log('Main.js built and backed up successfully')
  }
} else {
  // Backup the existing good file
  if (existsSync(mainPath) && statSync(mainPath).size > 50000) {
    copyFileSync(mainPath, backupPath)
    console.log('Main.js already exists and is valid, backed up')
  }
}

// Watch for electron-vite overwriting the file and restore it
if (existsSync(backupPath)) {
  const watcher = watchFile(mainPath, { interval: 500 }, (curr, prev) => {
    if (existsSync(mainPath) && statSync(mainPath).size < 50000 && existsSync(backupPath)) {
      console.log('Detected electron-vite overwrote main.js, restoring...')
      copyFileSync(backupPath, mainPath)
    }
  })
  
  // Keep the watcher alive for a bit, then let electron-vite take over
  setTimeout(() => {
    unwatchFile(mainPath)
  }, 10000)
}
