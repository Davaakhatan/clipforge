import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      outDir: resolve(__dirname, 'dist-electron/main'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    build: {
      outDir: resolve(__dirname, 'dist-electron/preload'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        },
        output: {
          format: 'cjs'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve(__dirname, './src')
      }
    },
    plugins: [react()],
    root: '.',
    build: {
      outDir: resolve(__dirname, 'dist-electron/renderer'),
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    }
  }
})
