// DeviceSyncScanner.jsx
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { exportLocalState } from '../../utils/localBackup'

// Is component ko alag kiya gaya hai taaki DOM elements perfect clean rahe
export default function DeviceSyncScanner({ isOpen, onClose }) {
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const scannerRef = useRef(null)
  const scanBoxId = 'device-sync-scan-box'

  const resetAll = () => {
    setManualCode('')
    setScanning(false)
    setConnecting(false)
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {}).finally(() => {
        scannerRef.current?.clear?.()
      })
      scannerRef.current = null
    }
  }

  const approve = async (body) => {
    setConnecting(true)
    try {
      await api.post('/sync/approve', { ...body, localData: exportLocalState() })
      toast.success('Device connected successfully!')
      resetAll()
      onClose()
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

  // Scanner Start Logic
  useEffect(() => {
    if (!isOpen || !scanning) return
    let cancelled = false

    const startCamera = async () => {
      if (cancelled) return

      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return

        // Wait for DOM to be fully ready
        const domElement = document.getElementById(scanBoxId)
        if (!domElement) return

        const instance = new Html5Qrcode(scanBoxId)
        scannerRef.current = instance

        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            const sessionId = parseScanned(decodedText)
            if (!sessionId) return
            
            // Stop scanner immediately
            instance.stop().catch(() => {})
            setScanning(false)
            approve({ sessionId })
          },
          () => {}
        )
      } catch (err) {
        toast.error('Could not access the camera. Try the code instead.')
        setScanning(false)
      }
    }

    const timeoutId = setTimeout(startCamera, 300)

    return () => {
      clearTimeout(timeoutId)
      cancelled = true
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear?.()
          scannerRef.current = null
        })
      }
    }
  }, [isOpen, scanning])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] bg-[#05060A] h-screen w-screen overflow-hidden flex flex-col">
      <div className="w-full h-full relative flex flex-col items-center justify-center p-4">
        {/* Close Button */}
        <button
          disabled={connecting}
          onClick={() => { resetAll(); onClose() }}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-20 disabled:opacity-50"
        >
          <X size={24} className="text-white/80" />
        </button>

        <div className="flex flex-col items-center w-full max-w-md">
          <h2 className="text-xl font-bold text-white mb-1 text-center">Sync Device</h2>
          <p className="text-[12px] text-white/40 text-center max-w-[240px] mb-6">
            Scan the QR code or enter the code shown on your new device.
          </p>

          {/* Scanner Section */}
          {!scanning ? (
            <button
              onClick={() => setScanning(true)}
              className="relative w-full h-[280px] rounded-3xl border-2 border-dashed border-primary-500/40 bg-primary-500/5 flex flex-col items-center justify-center gap-3 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent" />
              <div className="relative w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
                <ScanLine size={28} className="text-primary-400 ml-0.5" />
              </div>
              <div className="relative flex flex-col items-center">
                <span className="text-base font-semibold text-white">Tap to Scan QR</span>
                <span className="text-xs text-white/40">Allow camera access</span>
              </div>
            </button>
          ) : (
            <div className="w-full h-[280px] relative rounded-3xl overflow-hidden bg-black border border-white/[0.08]">
              {/* CRITICAL FIX: Directly rendering ID without animation wrapper ensures camera picks it up */}
              <div id={scanBoxId} className="w-full h-full bg-black" />
              
              {/* Scanner UI Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[240px] h-[240px] border-2 border-primary-400/50 rounded-2xl relative">
                  <div className="absolute w-[2px] h-[120px] bg-primary-400/30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[scanLine_2s_ease-in-out_infinite]" />
                  <div className="absolute h-[2px] w-[120px] bg-primary-400/30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[scanLine_2s_ease-in-out_infinite_0.5s]" />
                </div>
              </div>

              <button
                onClick={() => { resetAll(); setScanning(false) }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-white/80 hover:text-white hover:bg-white/20 transition-all pointer-events-auto"
              >
                Cancel Scan
              </button>
            </div>
          )}

          {/* Manual Code Section */}
          <div className="w-full flex items-center gap-4 my-6">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Or enter code</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <div className="w-full flex gap-2 justify-center mb-4">
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
                  // No autoFocus here to prevent keyboard popup
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
      </div>
      
      <style>{`
        @keyframes scanLine {
          0% { opacity: 0; transform: translate(-50%, -50px); }
          50% { opacity: 1; transform: translate(-50%, 50px); }
          100% { opacity: 0; transform: translate(-50%, -50px); }
        }
      `}</style>
    </div>
  )
}
