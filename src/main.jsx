import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'
import useAuthStore from './store/authStore'

// ── FIX: axios interceptor ko live Zustand store access dena ────────────
// axios.js mein request interceptor window.__authStore se seedha
// accessToken padhta hai — isse localStorage race condition fix hoti hai
// jo refresh ke baad "unauthorized" cause karti thi.
window.__authStore = useAuthStore

// Dynamically set favicon from app logo API
fetch('/api/public/logo')
  .then(r => r.json())
  .then(data => {
    if (data?.logoUrl) {
      const link = document.querySelector("link[rel='icon']") || document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/png'
      link.href = data.logoUrl
      document.head.appendChild(link)
    }
  })
  .catch(() => {})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 2 * 60 * 1000, retry: 1 },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a1a35', color: '#e0e7ff', border: '1px solid #312e81' },
          success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>,
)
