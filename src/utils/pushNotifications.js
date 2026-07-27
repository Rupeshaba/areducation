// Push notification helpers — Web Push API (VAPID) ke through phone/desktop
// ke OS-level notification tray me push bhejne ke liye. App band ho tab bhi
// yeh kaam karta hai (service worker background me chalta hai).

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

// VAPID public key (base64url) ko PushManager ke liye Uint8Array me convert karta hai
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Current browser permission state: 'default' | 'granted' | 'denied'
export function getPushPermissionState() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    return reg
  } catch (e) {
    console.error('Service worker registration failed:', e)
    return null
  }
}

// Permission maango, subscribe karo, aur subscription backend ko bhejo
export async function subscribeToPush(api, deviceId) {
  if (!isPushSupported()) {
    console.warn('[Push] Not supported:', {
      protocol: window.location.protocol,
      hasSW: 'serviceWorker' in navigator,
      hasPushManager: 'PushManager' in window,
      hasNotification: 'Notification' in window,
    })
    return { ok: false, reason: 'unsupported' }
  }
  if (!VAPID_PUBLIC_KEY) {
    console.error('[Push] VITE_VAPID_PUBLIC_KEY is missing/empty at build time. Set it in your .env and REBUILD + REDEPLOY the frontend — Vite env vars are baked in at build time, editing .env alone does nothing until you rebuild.')
    return { ok: false, reason: 'no-vapid-key' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    console.warn('[Push] Permission not granted:', permission)
    return { ok: false, reason: permission }
  }

  const reg = await registerServiceWorker()
  if (!reg) return { ok: false, reason: 'sw-failed' }

  // Service worker ke fully activate hone ka wait
  await navigator.serviceWorker.ready

  let subscription = await reg.pushManager.getSubscription()
  if (!subscription) {
    try {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    } catch (e) {
      // Sabse aam wajah: VAPID_PUBLIC_KEY galat/corrupt hai (backend ki
      // VAPID_PRIVATE_KEY se match nahi karti), ya key format sahi nahi hai.
      console.error('[Push] pushManager.subscribe() failed:', e.name, e.message)
      return { ok: false, reason: 'subscribe-failed', error: e.message }
    }
  }

  try {
    await api.post('/notifications/push-subscribe', { subscription, deviceId })
  } catch (e) {
    console.error('[Push] Saving subscription to backend failed:', e.response?.status, e.response?.data || e.message)
    return { ok: false, reason: 'save-failed', error: e.response?.data?.error || e.message, status: e.response?.status }
  }

  return { ok: true, subscription }
}

export async function unsubscribeFromPush(api) {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return
  const subscription = await reg.pushManager.getSubscription()
  if (subscription) {
    try {
      await api.post('/notifications/push-unsubscribe', { endpoint: subscription.endpoint })
    } catch (e) {
      // ignore — local unsubscribe still proceeds
    }
    await subscription.unsubscribe()
  }
}
