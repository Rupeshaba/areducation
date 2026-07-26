import { io } from 'socket.io-client'

/**
 * Same URL-derivation used elsewhere (Layout.jsx, DoubtChat.jsx) — the
 * socket server lives at the API origin minus the `/api` suffix.
 */
export function getSocketUrl() {
  return import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : '/'
}

/**
 * Opens a socket connection and joins the pairing room for a device-sync
 * session, calling `onApproved(payload)` once the other device approves it.
 * Returns a cleanup function — call it on unmount to disconnect.
 */
export function connectSyncSocket(sessionId, onApproved) {
  const socket = io(getSocketUrl(), {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
  })

  socket.on('connect', () => {
    socket.emit('sync_join', { sessionId })
  })

  socket.on('sync_approved', (payload) => {
    onApproved(payload)
  })

  return () => {
    socket.disconnect()
  }
}
