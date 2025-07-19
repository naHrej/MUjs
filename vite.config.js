import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  
  // Vue template compiler configuration
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
  },
  
  // Include Vue with template compiler
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '~': resolve(__dirname, 'public'),
      'vue': 'vue/dist/vue.esm-bundler.js', // Use full build with template compiler
    },
  },
  
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        editor: resolve(__dirname, 'public/editor.html'),
        settings: resolve(__dirname, 'public/settings.html'),
      },
    },
  },
  
  server: {
    port: 5173,
  },
  
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  
  // For Electron renderer process
  base: './',
});
