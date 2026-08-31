import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { KeyRound } from 'lucide-react'
import api from '../../api/axios'

export default function ForgotPassword() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const navigate = useNavigate()

  const sendOtp = useMutation({
    mutationFn: () => api.post('/auth/forgot-password', { email }).then(r => r.data),
    onSuccess: () => { toast.success('OTP sent!'); setStep(2) },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  })

  const resetPass = useMutation({
    mutationFn: () => api.post('/auth/reset-password', { email, otp, newPassword }).then(r => r.data),
    onSuccess: () => { toast.success('Password reset successfully!'); navigate('/login') },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  })

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="card border border-gray-200">
          <div className="w-12 h-12 rounded-2xl bg-primary-500/15 flex items-center justify-center mb-4">
            <KeyRound size={22} className="text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h1>
          <p className="text-gray-500 text-sm mb-6">
            {step === 1 ? 'Enter your registered email' : 'Enter OTP and new password'}
          </p>

          {step === 1 ? (
            <div className="space-y-4">
              <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
              <button onClick={() => sendOtp.mutate()} disabled={!email || sendOtp.isPending} className="btn-primary w-full">
                {sendOtp.isPending ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input type="text" placeholder="6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} className="input-field" maxLength={6} />
              <input type="password" placeholder="New password (min 8 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field" minLength={8} />
              <button onClick={() => resetPass.mutate()} disabled={!otp || !newPassword || resetPass.isPending} className="btn-primary w-full">
                {resetPass.isPending ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
