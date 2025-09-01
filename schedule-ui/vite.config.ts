import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 9010,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:9020',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
