const KEY = 'ar_device_id'

/**
 * A random id generated once and kept forever in localStorage — NOT part of
 * the account, just this browser/install. Every API request and the socket
 * `join` event send it (see api/axios.js, components/Layout.jsx) so the
 * backend's `device_sessions/{uid}/{deviceId}` model can tell devices apart
 * for the admin panel's "devices & sessions" view and per-device logout.
 *
 * Deliberately EXCLUDED from device-sync transfer (utils/localBackup.js) —
 * copying this to another device would make two devices report the same
 * identity and break tracking for both.
 */
export function getDeviceId() {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    // localStorage unavailable (private mode edge cases) — fall back to a
    // per-session id so requests still work, just without persistence.
    return 'no-storage'
  }
}
