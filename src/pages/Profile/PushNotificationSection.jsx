import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, BellRing } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { getDeviceId } from '../../utils/deviceId'
import {
  isPushSupported,
  getPushPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../utils/pushNotifications'

export default function PushNotificationSection() {
  const [permission, setPermission] = useState('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const supported = isPushSupported()

  useEffect(() => {
    if (!supported) return
    setPermission(getPushPermissionState())
    navigator.serviceWorker?.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription()
      setSubscribed(!!sub)
    })
  }, [supported])

  const handleEnable = async () => {
    setLoading(true)
    const res = await subscribeToPush(api, getDeviceId())
    setLoading(false)
    setPermission(getPushPermissionState())
    if (res.ok) {
      setSubscribed(true)
      toast.success('Push notifications on ho gayi')
      return
    }

    console.error('[Push] Enable failed — full result:', res)

    const messages = {
      denied: 'Permission block hai — browser settings me site notifications allow karein',
      'no-vapid-key': 'Server config missing hai (VAPID key) — developer se contact karein',
      'sw-failed': 'Service worker load nahi hui — page reload karke dobara try karein',
      'subscribe-failed': 'Browser subscription fail hui — VAPID key backend/frontend me match nahi kar rahi',
      'save-failed': `Server ne subscription save nahi ki${res.status ? ` (status ${res.status})` : ''} — backend deploy check karein`,
      unsupported: 'Yeh browser/connection push support nahi karta (HTTPS zaroori hai)',
    }
    toast.error(messages[res.reason] || 'Push enable nahi ho payi, console check karein (F12)')
  }

  const handleDisable = async () => {
    setLoading(true)
    await unsubscribeFromPush(api)
    setLoading(false)
    setSubscribed(false)
    toast.success('Push notifications off kar di')
  }

  if (!supported) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="space-y-3"
    >
      <h2 className="text-[13px] font-semibold text-gray-600 px-1">Push Notifications</h2>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            {subscribed ? (
              <BellRing size={16} className="text-primary-500" />
            ) : (
              <BellOff size={16} className="text-gray-400" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-gray-900">
              {subscribed ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Disabled'}
            </span>
            <span className="text-[11px] text-gray-500 mt-0.5">
              {permission === 'denied'
                ? 'Phone/browser settings se allow karna hoga'
                : subscribed
                ? 'App band ho tab bhi notification aayegi'
                : 'Naye courses aur updates ka alert paayein'}
            </span>
          </div>
        </div>

        {permission !== 'denied' && (
          <button
            disabled={loading}
            onClick={subscribed ? handleDisable : handleEnable}
            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              subscribed
                ? 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'
                : 'bg-primary-500 hover:bg-primary-600 text-white'
            }`}
          >
            {loading ? '...' : subscribed ? 'Turn Off' : 'Enable'}
          </button>
        )}
      </div>
    </motion.div>
  )
}
