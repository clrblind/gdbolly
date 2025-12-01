import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      // Все запросы на /api/... пойдут на http://backend:8000/...
      '/api': {
        target: 'http://backend:8000', // Имя сервиса из docker-compose
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '') // Убираем префикс /api перед отправкой в Python
      },
      // WebSocket тоже проксируем
      '/ws': {
        target: 'ws://backend:8000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})