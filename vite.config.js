import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'https://areducation-backend.onrender.com', changeOrigin: true },
      '/uploads': { target: 'https://areducation-backend.onrender.com', changeOrigin: true },
      '/socket.io': { target: 'https://areducation-backend.onrender.com', changeOrigin: true, ws: true },
    },
  },
})
