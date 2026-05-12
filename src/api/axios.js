import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
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
    // Clear corrupted data
    localStorage.removeItem('ar-edu-auth')
  }
  return config
})

// Response interceptor - handle token expiry & blocked account
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    // Maintenance mode → redirect to maintenance page instantly
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

    // Token expired → refresh
    if (error.response?.status === 401 && error.response?.data?.error === 'token_expired' && !original._retry) {
      original._retry = true
      try {
        const stored = localStorage.getItem('ar-edu-auth')
        const parsed = JSON.parse(stored)
        const { data } = await axios.post('/api/auth/refresh-token', {
          refreshToken: parsed?.state?.refreshToken,
        })
        const { default: useAuthStore } = await import('../store/authStore')
        useAuthStore.getState().setTokens(data)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch (e) {
        const { default: useAuthStore } = await import('../store/authStore')
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api