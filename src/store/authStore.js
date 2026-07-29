import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'
import { getGuestId, hasGuestName, clearGuest } from '../utils/guest'

/**
 * On every successful login/signup, fold any quiz attempts this device played
 * as a guest into the now-authenticated account (first-attempt-only rule is
 * enforced server-side). Fire-and-forget: a merge hiccup must never block the
 * user from getting into the app. Runs only if this device actually has a
 * guest identity to claim.
 */
async function claimGuestHistory() {
  try {
    const guestId = getGuestId()
    // No point calling if we never even asked this device for a guest name —
    // getGuestId() would just mint a fresh id with no rows behind it.
    if (!guestId || !hasGuestName()) return
    await api.post('/quiz/claim-guest', { guestId })
    // Once merged into the account, drop the guest markers so future plays
    // are attributed to the real account, not the old anonymous id.
    clearGuest()
  } catch {
    // Leave guest markers in place so a later login can retry the claim.
  }
}

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
        // Merge guest quiz history into this account (non-blocking).
        claimGuestHistory()
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
