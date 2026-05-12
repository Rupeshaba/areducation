import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Mail, RefreshCw } from 'lucide-react'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'

export default function VerifyOTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [cooldown, setCooldown] = useState(60)
  const refs = useRef([])
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const email = location.state?.email

  useEffect(() => {
    if (!email) navigate('/signup')
    refs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const verifyMutation = useMutation({
    mutationFn: (code) => api.post('/auth/verify-otp', { email, otp: code }).then(r => r.data),
    onSuccess: (data) => {
      login(data)
      toast.success('Email verified! Welcome to AR Education 🎉')
      navigate('/')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Invalid OTP'),
  })

  const resendMutation = useMutation({
    mutationFn: () => api.post('/auth/resend-otp', { email, type: 'verify' }).then(r => r.data),
    onSuccess: () => { toast.success('OTP resent!'); setCooldown(60) },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to resend'),
  })

  const handleVerify = () => {
    const code = otp.join('')
    if (code.length !== 6) return toast.error('Enter 6-digit OTP')
    verifyMutation.mutate(code)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="card border border-white/8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/15 flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Verify Email</h1>
          <p className="text-gray-500 text-sm mb-1">Enter the 6-digit code sent to</p>
          <p className="text-primary-400 text-sm font-medium mb-6">{email}</p>

          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => refs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-11 h-13 text-center text-xl font-bold bg-dark-700 border border-white/10 rounded-xl
                           text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={verifyMutation.isPending || otp.join('').length !== 6}
            className="btn-primary w-full mb-4 flex items-center justify-center gap-2"
          >
            {verifyMutation.isPending
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
              : 'Verify OTP'}
          </button>

          <button
            onClick={() => resendMutation.mutate()}
            disabled={cooldown > 0 || resendMutation.isPending}
            className="text-sm text-gray-400 hover:text-primary-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 mx-auto transition-colors"
          >
            <RefreshCw size={14} />
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
