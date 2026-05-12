import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (data) => {
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        })
      },

      logout: async () => {
        try { await api.post('/auth/logout') } catch (e) {}
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      updateUser: (updates) => {
        set(state => ({ user: { ...state.user, ...updates } }))
      },

      setTokens: (tokens) => {
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
      },
    }),
    {
      name: 'ar-edu-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore