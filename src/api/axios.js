import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
})

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('ar-edu-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      const accessToken = parsed?.state?.accessToken
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
    }
  } catch (e) {
    console.error('Error parsing auth from localStorage:', e)
    localStorage.removeItem('ar-edu-auth')
  }
  return config
})

// ── Refresh lock: prevent multiple simultaneous refresh calls ──────────────
let isRefreshing = false
let refreshQueue = []

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token)
  })
  refreshQueue = []
}

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    // Maintenance mode → redirect instantly
    if (error.response?.status === 503 && error.response?.data?.error === 'maintenance') {
      const msg = error.response.data.message || 'Server is under maintenance.'
      sessionStorage.setItem('maintenanceMessage', msg)
      window.location.href = '/maintenance'
      return Promise.reject(error)
    }

    // Blocked account → force logout immediately
    if (error.response?.status === 403 && error.response?.data?.error === 'blocked') {
      const { default: useAuthStore } = await import('../store/authStore')
      useAuthStore.getState().logout()
      const msg = error.response.data.message || 'Your account has been blocked.'
      window.location.href = `/login?blocked=1&msg=${encodeURIComponent(msg)}`
      return Promise.reject(error)
    }

    // 401 → try refresh (token_expired OR invalid token)
    // Skip if: already retried, or this IS the refresh call, or logout call
    const isRefreshCall = original.url?.includes('refresh-token')
    const isLogoutCall = original.url?.includes('logout')
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !isRefreshCall &&
      !isLogoutCall
    ) {
      original._retry = true

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        }).catch((err) => Promise.reject(err))
      }

      isRefreshing = true

      try {
        const stored = localStorage.getItem('ar-edu-auth')
        if (!stored) throw new Error('No stored auth')

        const parsed = JSON.parse(stored)
        const refreshToken = parsed?.state?.refreshToken
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh-token`,
          { refreshToken }
        )

        // Save new tokens
        const { default: useAuthStore } = await import('../store/authStore')
        useAuthStore.getState().setTokens(data)

        processQueue(null, data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)

      } catch (refreshErr) {
        processQueue(refreshErr)

        // Only logout if refresh token itself is expired/invalid
        const status = refreshErr?.response?.status
        const errMsg = refreshErr?.response?.data?.error
        if (status === 401 || errMsg === 'Invalid or expired refresh token') {
          const { default: useAuthStore } = await import('../store/authStore')
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
        // Network error ya server down → don't logout, user stays logged in
        return Promise.reject(refreshErr)

      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
