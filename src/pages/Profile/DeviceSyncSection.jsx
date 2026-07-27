// DeviceSyncSection.jsx
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, ScanLine, CheckCircle2, ShieldCheck, X } from 'lucide-react'
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
    const match = /^arapp-sync:(.+)$/.exec(text?.trim() || '')
    return match ? match[1] : null
  }

  useEffect(() => {
    if (!open || !scanning) return
    let cancelled = false

    // Simple timeout to ensure DOM element is fully rendered before starting camera
    const timeoutId = setTimeout(() => {
      if (cancelled) return

      import('html5-qrcode').then(({ Html5Qrcode }) => {
        if (cancelled) return
        
        const container = document.getElementById(scanBoxId)
        if (!container) return

        const instance = new Html5Qrcode(scanBoxId)
        scannerRef.current = instance
        
        instance
          .start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 280, height: 280 } },
            (decodedText) => {
              const sessionId = parseScanned(decodedText)
              if (!sessionId) return
              instance.stop().catch(() => {})
              setScanning(false)
              approve({ sessionId })
            },
            () => {}
          )
          .catch((err) => {
            console.error('Scanner Start Error:', err)
            toast.error('Could not access the camera. Please check permissions.')
            setScanning(false)
          })
      })
    }, 300)

    return () => {
      clearTimeout(timeoutId)
      cancelled = true
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear?.()
        })
      }
    }
  }, [open, scanning])

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <QrCode size={18} className="text-primary-400" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold text-white">Device Sync</span>
            <span className="text-[10px] text-white/40">Add a new phone or laptop</span>
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[#05060A] h-screen w-screen overflow-hidden flex flex-col"
            onClick={() => { setOpen(false); setScanning(false); setManualCode('') }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-full relative flex flex-col items-center justify-center p-4"
            >
              {/* Close Button at top right */}
              <button
                onClick={() => { setOpen(false); setScanning(false); setManualCode('') }}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-20"
              >
                <X size={24} className="text-white/80" />
              </button>

              <div className="flex flex-col items-center w-full max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/20 to-mint-500/20 flex items-center justify-center mb-4">
                  <ShieldCheck size={26} className="text-primary-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1 text-center">Scan to Add Device</h2>
                <p className="text-[12px] text-white/40 text-center max-w-[240px] mb-8">
                  Open the app on your new device and tap <span className="text-white font-medium">"Sync from another device"</span>.
                </p>

                {!scanning ? (
                  <motion.button
                    initial={{ scale: 1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setScanning(true)}
                    className="relative w-full h-[450px] rounded-3xl border-2 border-dashed border-primary-500/40 bg-primary-500/5 flex flex-col items-center justify-center gap-3 overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent" />
                    <div className="relative w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
                      <ScanLine size={28} className="text-primary-400 ml-0.5" />
                    </div>
                    <div className="relative flex flex-col items-center">
                      <span className="text-base font-semibold text-white">Start Camera Scanner</span>
                      <span className="text-xs text-white/40">Allow camera access to scan QR</span>
                    </div>
                  </motion.button>
                ) : (
                  <div className="w-full h-[450px] relative rounded-3xl overflow-hidden bg-black border border-white/[0.08]">
                    {/* Scanner Container - Forced to render with key to prevent blank canvas */}
                    <div key={scanBoxId} id={scanBoxId} className="w-full h-full bg-black" />
                    
                    {/* Scanner UI Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-[300px] h-[300px] border-2 border-primary-400/50 rounded-2xl relative">
                        <div className="absolute inset-0 border border-white/10 rounded-2xl scale-105 opacity-30" />
                        <div className="absolute w-[2px] h-[150px] bg-primary-400/30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[scanLine_2s_ease-in-out_infinite]" />
                        <div className="absolute h-[2px] w-[150px] bg-primary-400/30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[scanLine_2s_ease-in-out_infinite_0.5s]" />
                      </div>
                    </div>

                    <button
                      onClick={() => setScanning(false)}
                      className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/20 transition-all pointer-events-auto"
                    >
                      Cancel Scan
                    </button>
                  </div>
                )}

                {connecting && (
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-400 rounded-full animate-spin" />
                    <span className="text-sm text-white/60">Connecting device...</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        @keyframes scanLine {
          0% { opacity: 0; transform: translate(-50%, -50px); }
          50% { opacity: 1; transform: translate(-50%, 50px); }
          100% { opacity: 0; transform: translate(-50%, -50px); }
        }
      `}</style>
    </>
  )
}
