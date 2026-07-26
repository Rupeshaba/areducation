import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, RefreshCw, Smartphone, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { connectSyncSocket } from '../../utils/deviceSync'
import { importLocalState } from '../../utils/localBackup'
import { APP_LOGO_URL } from '../../constants/branding'

export default function SyncLogin() {
  const [session, setSession] = useState(null) // { sessionId, code, expiresInSeconds }
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [status, setStatus] = useState('idle') // idle | waiting | approved | expired | error
  const cleanupRef = useRef(null)
  const pollRef = useRef(null)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleApproved = (payload) => {
    setStatus('approved')
    importLocalState(payload.localData)
    login(payload)
    toast.success(`Welcome back, ${payload.user?.name?.split(' ')[0] || ''}!`)
    setTimeout(() => navigate('/'), 600)
  }

  const startSession = async () => {
    setStatus('waiting')
    try {
      const data = await api.post('/sync/request-code').then(r => r.data)
      setSession(data)
      setSecondsLeft(data.expiresInSeconds || 120)

      if (cleanupRef.current) cleanupRef.current()
      cleanupRef.current = connectSyncSocket(data.sessionId, handleApproved)

      // Poll as a fallback in case the socket push is missed.
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.get(`/sync/status/${data.sessionId}`)
          if (res.data.status === 'approved') {
            clearInterval(pollRef.current)
            handleApproved(res.data)
          }
        } catch (err) {
          if (err.response?.status === 410) {
            clearInterval(pollRef.current)
            setStatus('expired')
          }
        }
      }, 3000)
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    startSession()
    return () => {
      cleanupRef.current?.()
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status !== 'waiting' || secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    if (secondsLeft === 1) setStatus('expired')
    return () => clearTimeout(t)
  }, [secondsLeft, status])

  const qrValue = session ? `arapp-sync:${session.sessionId}` : ''

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-500/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg shadow-primary-500/30">
              <img src={APP_LOGO_URL} alt="AR Education" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">AR Education</div>
              <div className="text-xs text-gray-500">Competitive Exam Prep</div>
            </div>
          </div>
        </div>

        <div className="card border border-white/8 text-center">
          <Smartphone size={28} className="text-primary-400 mx-auto mb-2" />
          <h1 className="text-xl font-bold text-white mb-1">Sync from another device</h1>
          <p className="text-gray-500 text-sm mb-6">
            Open the app on a device where you're already signed in, go to
            <span className="text-gray-300"> Profile → Device Sync</span>, and scan this code.
          </p>

          {status === 'waiting' && session && (
            <>
              <div className="bg-white rounded-2xl p-4 w-fit mx-auto mb-4">
                <QRCodeSVG value={qrValue} size={180} />
              </div>
              <p className="text-xs text-gray-500 mb-1">Or enter this code manually:</p>
              <div className="text-3xl font-black tracking-[0.3em] text-primary-300 mb-4">
                {session.code}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                Waiting for approval… expires in {secondsLeft}s
              </div>
            </>
          )}

          {status === 'approved' && (
            <div className="py-6">
              <CheckCircle2 size={40} className="text-mint-400 mx-auto mb-3" />
              <p className="text-white font-semibold">Device connected! Signing you in…</p>
            </div>
          )}

          {(status === 'expired' || status === 'error') && (
            <div className="py-4">
              <p className="text-sm text-gray-400 mb-4">
                {status === 'expired' ? 'This code expired.' : 'Something went wrong.'}
              </p>
              <button onClick={startSession} className="btn-primary inline-flex items-center gap-2">
                <RefreshCw size={16} /> Generate a new code
              </button>
            </div>
          )}

          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300"
          >
            <ArrowLeft size={14} /> Back to password login
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
