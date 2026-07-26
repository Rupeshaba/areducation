import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, X, ScanLine, KeyRound, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { exportLocalState } from '../../utils/localBackup'

export default function DeviceSyncSection() {
  const [open, setOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const scannerRef = useRef(null)
  const scanBoxId = 'device-sync-scan-box'

  const approve = async (body) => {
    setConnecting(true)
    try {
      await api.post('/sync/approve', { ...body, localData: exportLocalState() })
      toast.success('Device connected — its cache & progress will sync over too.')
      setOpen(false)
      setManualCode('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not connect that device')
    } finally {
      setConnecting(false)
    }
  }

  const parseScanned = (text) => {
    // We encode our own QR payload as "arapp-sync:<sessionId>" — see SyncLogin.jsx.
    const match = /^arapp-sync:(.+)$/.exec(text?.trim() || '')
    return match ? match[1] : null
  }

  useEffect(() => {
    if (!open || !scanning) return
    let cancelled = false

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return
      const instance = new Html5Qrcode(scanBoxId)
      scannerRef.current = instance
      instance
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 220 },
          (decodedText) => {
            const sessionId = parseScanned(decodedText)
            if (!sessionId) return
            instance.stop().catch(() => {})
            setScanning(false)
            approve({ sessionId })
          },
          () => {} // ignore per-frame scan failures
        )
        .catch(() => {
          toast.error('Could not access the camera. Try the code instead.')
          setScanning(false)
        })
    })

    return () => {
      cancelled = true
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear?.()
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scanning])

  return (
    <div className="card border border-white/8">
      <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
        <QrCode size={18} className="text-primary-400" /> Device Sync
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Signing in on a new phone or laptop? Scan its code here to sign it in instantly — no password needed.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="btn-ghost w-full flex items-center justify-center gap-2 border border-white/10"
      >
        <ScanLine size={16} /> Scan to add a device
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setOpen(false); setScanning(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="card border border-white/10 w-full max-w-sm relative"
            >
              <button
                onClick={() => { setOpen(false); setScanning(false) }}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
              >
                <X size={18} />
              </button>

              <h3 className="text-lg font-bold text-white mb-1">Add a device</h3>
              <p className="text-xs text-gray-500 mb-4">
                On the new device, open the app and tap "Sync from another device" on the login screen.
              </p>

              {!scanning ? (
                <button
                  onClick={() => setScanning(true)}
                  className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
                >
                  <ScanLine size={16} /> Open camera scanner
                </button>
              ) : (
                <div className="mb-4">
                  <div id={scanBoxId} className="rounded-xl overflow-hidden bg-black/40" />
                  <button
                    onClick={() => setScanning(false)}
                    className="text-xs text-gray-500 hover:text-gray-300 mt-2"
                  >
                    Cancel scan
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 my-3">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-xs text-gray-500">or enter code</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    className="input-field pl-9 tracking-[0.2em] text-center"
                    inputMode="numeric"
                  />
                </div>
                <button
                  disabled={manualCode.length !== 6 || connecting}
                  onClick={() => approve({ code: manualCode })}
                  className="btn-primary px-4 flex items-center gap-1.5 disabled:opacity-40"
                >
                  {connecting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  Connect
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
