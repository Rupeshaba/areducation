// DeviceSyncSection.jsx
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, X, ScanLine, KeyRound, CheckCircle2, Smartphone, ArrowRight, ShieldCheck } from 'lucide-react'
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
          () => {}
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
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
          <ArrowRight size={14} className="text-white/40 group-hover:text-white/70" />
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-lg flex items-end justify-center"
            onClick={() => { setOpen(false); setScanning(false); setManualCode('') }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg h-[95vh] bg-[#0A0B12] rounded-t-3xl border-t border-white/[0.08] flex flex-col relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-1/3 bg-primary-500/10 blur-[80px] pointer-events-none" />
              
              <div className="relative flex items-center justify-between p-6 pt-8">
                <button
                  onClick={() => { setOpen(false); setScanning(false); setManualCode('') }}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors -ml-2"
                >
                  <X size={20} className="text-white/60" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-white/40 font-medium">Secure Connection</span>
                </div>
                <div className="w-8" />
              </div>

              <div className="flex-1 px-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-mint-500/20 flex items-center justify-center mb-4">
                  <ShieldCheck size={28} className="text-primary-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">Device Sync</h2>
                <p className="text-xs text-white/40 text-center max-w-[260px] mb-8">
                  Open the app on your new device and tap <span className="text-white font-medium">"Sync from another device"</span> to begin.
                </p>

                {!scanning ? (
                  <motion.button
                    initial={{ scale: 1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setScanning(true)}
                    className="relative w-full h-56 rounded-3xl border-2 border-dashed border-primary-500/40 bg-primary-500/5 flex flex-col items-center justify-center gap-3 overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent" />
                    <div className="relative w-14 h-14 rounded-full bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
                      <ScanLine size={24} className="text-primary-400 ml-0.5" />
                    </div>
                    <div className="relative flex flex-col items-center">
                      <span className="text-sm font-semibold text-white">Scan QR Code</span>
                      <span className="text-[10px] text-white/40">Use your device camera</span>
                    </div>
                  </motion.button>
                ) : (
                  <div className="w-full relative">
                    <div className="rounded-3xl overflow-hidden bg-black/40 border border-white/[0.06] relative aspect-square max-h-[300px] w-full">
                      <div id={scanBoxId} className="w-full h-full" />
                      <div className="absolute inset-0 border-2 border-primary-500/40 rounded-3xl pointer-events-none" />
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary-400 to-transparent animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                    <button
                      onClick={() => setScanning(false)}
                      className="mt-4 w-full py-3 rounded-2xl border border-white/[0.08] text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancel Scan
                    </button>
                  </div>
                )}

                <div className="w-full flex items-center gap-4 my-6">
                  <div className="h-px bg-white/10 flex-1" />
                  <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Or enter manually</span>
                  <div className="h-px bg-white/10 flex-1" />
                </div>

                <div className="w-full flex gap-2 justify-center mb-6">
                  <div className="flex items-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <input
                        key={i}
                        type="text"
                        maxLength={1}
                        value={manualCode[i] || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '')
                          if (val.length > 1) return
                          const newCode = manualCode.split('')
                          newCode[i] = val
                          const joined = newCode.join('').slice(0, 6)
                          setManualCode(joined)
                          if (val && i < 5) {
                            const nextInput = document.querySelector(`input[data-index="${i+1}"]`)
                            if (nextInput) nextInput.focus()
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !manualCode[i] && i > 0) {
                            const prevInput = document.querySelector(`input[data-index="${i-1}"]`)
                            if (prevInput) prevInput.focus()
                          }
                        }}
                        data-index={i}
                        className="w-10 h-12 bg-[#0E101A] border border-white/[0.08] rounded-xl text-center text-sm font-semibold text-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/50 transition-all"
                        inputMode="numeric"
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                </div>

                <button
                  disabled={manualCode.length !== 6 || connecting}
                  onClick={() => approve({ code: manualCode })}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-500 to-mint-500 text-[#0A0B12] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                >
                  {connecting ? (
                    <div className="w-5 h-5 border-2 border-[#0A0B12]/30 border-t-[#0A0B12] rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> Connect Device
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>
    </>
  )
}
