import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'
import useAuthStore from './store/authStore'
import { APP_LOGO_URL } from './constants/branding'

// ── FIX: axios interceptor ko live Zustand store access dena ────────────
// axios.js mein request interceptor window.__authStore se seedha
// accessToken padhta hai — isse localStorage race condition fix hoti hai
// jo refresh ke baad "unauthorized" cause karti thi.
window.__authStore = useAuthStore

// Favicon: use the app's own logo (falls back to the brand default if the
// backend has no custom one configured — index.html already ships with
// this same default so there's no flash-of-wrong-icon before this runs).
fetch('/api/public/logo')
  .then(r => r.json())
  .then(data => {
    const link = document.querySelector("link[rel='icon']") || document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    link.href = data?.logoUrl || APP_LOGO_URL
    document.head.appendChild(link)
  })
  .catch(() => {})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      // Keep cached data around for a full day so a reload or a re-visit to
      // a page can render instantly from the persisted cache while a fresh
      // copy is fetched quietly in the background.
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
    },
  },
})

// ── Persist the entire query cache to localStorage ──────────────────────
// This is what makes MyCourses / Subjects / Home etc. feel instant: on the
// very first paint React Query rehydrates whatever was cached last time
// (courses, subjects, contents, purchases...) and shows it immediately,
// then silently refetches in the background per each query's staleTime.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'AR_EDU_QUERY_CACHE',
  throttleTime: 1000,
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        // Don't persist one-off mutation-like queries or anything explicitly
        // marked ephemeral; everything else (lists, details) is safe to cache.
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success',
        },
      }}
    >
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a1a35', color: '#e0e7ff', border: '1px solid #312e81' },
          success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
        }}
      />
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
