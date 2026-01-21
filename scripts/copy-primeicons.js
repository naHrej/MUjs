// Script to copy PrimeIcons fonts to public directory
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const publicDir = join(projectRoot, 'public', 'fonts')
const primeiconsFontsDir = join(projectRoot, 'node_modules', 'primeicons', 'fonts')

const fonts = ['primeicons.woff', 'primeicons.woff2', 'primeicons.ttf', 'primeicons.eot', 'primeicons.svg']

// Create public/fonts directory if it doesn't exist
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true })
}

// Copy fonts
fonts.forEach(font => {
  const src = join(primeiconsFontsDir, font)
  const dest = join(publicDir, font)
  if (existsSync(src)) {
    copyFileSync(src, dest)
    console.log(`Copied ${font} to public/fonts/`)
  }
})
