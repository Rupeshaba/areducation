import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // ya "0.0.0.0"
    port: 5173,
    allowedHosts: ['.vercel.run'],
    proxy: {
      '/api': {
        target: 'https://areducation-backend.onrender.com',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://areducation-backend.onrender.com',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://areducation-backend.onrender.com',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
