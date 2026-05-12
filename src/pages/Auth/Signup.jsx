import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Zap, Camera, X, User } from 'lucide-react'
import api from '../../api/axios'

const EXAMS = ['UPSC', 'SSC CGL', 'SSC CHSL', 'State PCS', 'Bank PO', 'Railway', 'Other']

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', exam: '', address: '' })
  const [showPass, setShowPass] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarBase64, setAvatarBase64] = useState(null)
  const avatarInputRef = useRef(null)
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: (data) => {
      return api.post('/auth/signup', data).then(r => r.data)
    },
    onSuccess: () => {
      toast.success('OTP sent to your email!')
      navigate('/verify-otp', { state: { email: form.email } })
    },
    onError: (err) => {
      const errorMsg = err.response?.data?.error || err.message || 'Signup failed'
      toast.error(errorMsg)
    },
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image too large (max 3MB)')
      e.target.value = ''
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files allowed')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setAvatarPreview(ev.target.result)
      setAvatarBase64(ev.target.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removeAvatar = () => {
    setAvatarPreview(null)
    setAvatarBase64(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({ ...form, avatarBase64: avatarBase64 || null })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-500/6 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Zap size={22} className="text-white" />
            </div>
            <div className="text-xl font-bold text-white">AR Education</div>
          </div>
        </div>

        <div className="card border border-white/8">
          <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
          <p className="text-gray-500 text-sm mb-6">Join thousands of aspirants</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Avatar Picker ── */}
            <div className="flex flex-col items-center gap-2 pb-2">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div className="relative group">
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-20 h-20 rounded-full cursor-pointer overflow-hidden border-2 border-dashed border-white/20 hover:border-primary-500/60 transition-all flex items-center justify-center bg-dark-700/60 hover:bg-dark-700"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-500 group-hover:text-primary-400 transition-colors">
                      <User size={26} />
                      <Camera size={13} />
                    </div>
                  )}
                </div>

                {/* Remove button */}
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors shadow-md"
                  >
                    <X size={11} className="text-white" />
                  </button>
                )}

                {/* Camera overlay on hover when image already set */}
                {avatarPreview && (
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <Camera size={18} className="text-white" />
                  </div>
                )}
              </div>
              <span className="text-[11px] text-gray-500">
                {avatarPreview ? 'Tap to change photo' : 'Add profile photo (optional)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Full Name *</label>
                <input type="text" placeholder="Rahul Kumar" value={form.name} onChange={set('name')} className="input-field" required />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Mobile *</label>
                <input type="tel" placeholder="9876543210" value={form.mobile} onChange={set('mobile')} className="input-field" required />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email *</label>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} className="input-field" required />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Password *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} placeholder="Min 8 characters" value={form.password} onChange={set('password')} className="input-field pr-10" required minLength={8} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Target Exam</label>
              <select value={form.exam} onChange={set('exam')} className="input-field">
                <option value="">Select exam...</option>
                {EXAMS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Address</label>
              <input type="text" placeholder="City, State" value={form.address} onChange={set('address')} className="input-field" />
            </div>

            <button type="submit" disabled={mutation.isPending} className="btn-primary w-full flex items-center justify-center gap-2">
              {mutation.isPending
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</>
                : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}