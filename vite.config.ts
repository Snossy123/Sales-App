import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const appDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: {
      allow: [appDir, path.resolve(appDir, '..')],
    },
    watch: {
      usePolling: true,
      interval: 500,
    },
    hmr: {
      clientPort: 5174,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8100',
        changeOrigin: true,
      },
      '/storage': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8100',
        changeOrigin: true,
      },
    },
  },
})
