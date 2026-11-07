import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: ({
      lib: {
        entry: resolve(__dirname, 'src/main/main.ts')
      },
      rollupOptions: {
        output: {
          entryFileNames: 'main.js',
          format: 'es'
        }
      }
    } as any)
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: ({
      lib: {
        entry: resolve(__dirname, 'src/preload/preload.ts')
      },
      rollupOptions: {
        output: {
          entryFileNames: 'preload.mjs'
        }
      }
    } as any)
  },
  renderer: {
    // Critical: make Vite serve HTML from src/renderer as the dev-server root.
    // Otherwise it will pick up /public/index.html which still references /src/renderer/entry/index.ts.
    root: resolve(__dirname, 'src/renderer'),
    publicDir: resolve(__dirname, 'public'),
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'src/shared'),
        '@services': resolve(__dirname, 'src/services'),
        '@renderer': resolve(__dirname, 'src/renderer')
      }
    },
    // electron-vite expects HTML files in src/renderer
    // Input will be auto-detected from src/renderer/*.html
    server: {
      fs: {
        // Allow serving assets imported from node_modules (e.g. PrimeIcons font files).
        // Note: renderer.root is src/renderer, so a plain '..' only allows src/.
        allow: [
          resolve(__dirname, 'src'),
          resolve(__dirname, 'node_modules'),
          resolve(__dirname, 'public')
        ]
      }
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true
        }
      }
    },
    build: ({
      rollupOptions: {
        // Ensure all windows' HTML entrypoints are emitted in production builds
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          editor: resolve(__dirname, 'src/renderer/editor.html'),
          settings: resolve(__dirname, 'src/renderer/settings.html')
        }
      }
    } as any)
  }
})
