// Profile.jsx
import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, Pencil, CheckCircle, Calendar, Target, Flame, 
  Shield, User, Mail, Phone, X, ChevronRight,
  MapPin, CalendarDays
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import DeviceSyncSection from './DeviceSyncSection' // Same import!
import PushNotificationSection from './PushNotificationSection'

/* ── Reusable Info Row ───────────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value, onClick, isStatus = false }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="flex items-center justify-between p-4 rounded-2xl bg-[#0E101A] border border-white/[0.05] hover:bg-white/[0.03] transition-colors cursor-pointer active:bg-white/[0.05]"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-white/40" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">{label}</span>
          <span className="text-sm font-semibold text-white truncate mt-0.5">
            {isStatus ? (
              <span className="flex items-center gap-2">
                Active <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
            ) : (
              value || 'Not set'
            )}
          </span>
        </div>
      </div>
      <ChevronRight size={16} className="text-white/20 flex-shrink-0" />
    </motion.div>
  )
}

/* ── Bottom Sheet Edit Field ──────────────────────────────────────────── */
function BottomSheetField({ icon: Icon, label, value, onChange, placeholder, type = 'text', autoFocus = false, isSelect = false, options = [] }) {
  return (
    <div className="space-y-2 mb-3">
      <label className="text-[10px] font-medium uppercase tracking-wider text-white/40 ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
          <Icon size={16} />
        </div>
        {isSelect ? (
          <select
            value={value}
            onChange={onChange}
            className="w-full bg-[#0A0B12] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium text-white focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/30 transition-all appearance-none"
          >
            <option value="">Select Exam</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full bg-[#0A0B12] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/30 transition-all"
          />
        )}
      </div>
    </div>
  )
}

/* ── Main Profile Component ──────────────────────────────────────────── */
export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const qc = useQueryClient()
  const fileRef = useRef()

  const [form, setForm] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    exam: user?.exam || '',
    address: user?.address || '',
  })
  const [isEditing, setIsEditing] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const updateProfile = useMutation({
    mutationFn: () => api.put('/user/profile', form).then(r => r.data),
    onSuccess: () => {
      updateUser(form)
      setIsEditing(false)
      toast.success('Profile updated!')
      qc.invalidateQueries(['profile'])
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  })

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) return toast.error('Image must be under 3MB')
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const uploadAvatar = async () => {
    if (!avatarFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', avatarFile)
      const res = await api.post('/user/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      updateUser({ avatarUrl: res.data.avatarUrl })
      setAvatarPreview(null)
      setAvatarFile(null)
      toast.success('Photo updated!')
      qc.invalidateQueries(['profile'])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const displayAvatar = avatarPreview || user?.avatarUrl
  const dpRingUrl = "https://res.cloudinary.com/dhniudiwg/image/upload/v1785142069/33500a6c52b6e73b93ca7123997c8088-removebg-preview_efmtjw.png"
  const examOptions = ["UPSC", "SSC", "State PCS", "Railway", "Banking", "Other"]

  return (
    <div className="min-h-screen bg-transparent relative pb-28 px-4 pt-6">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* ── Profile Hero ── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center relative pb-2"
        >
          {/* Floating Glow */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary-500/20 rounded-full blur-[60px] pointer-events-none" />

          <div className="relative mb-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-2 w-[130px] h-[130px] -ml-[5px] -mt-[5px] z-0 pointer-events-none"
            >
              <img 
                src={dpRingUrl} 
                alt="Ring" 
                className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(255,215,0,0.4)]" 
              />
            </motion.div>

            <div className="relative w-[110px] h-[110px] rounded-full overflow-hidden border-2 border-[#05060A] z-10 bg-[#0E101A] flex-shrink-0 mx-auto">
              {displayAvatar ? (
                <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-500/40 to-mint-500/40 flex items-center justify-center text-primary-400 font-bold text-4xl">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-1 right-2 w-9 h-9 bg-gradient-to-r from-primary-500 to-mint-500 rounded-full flex items-center justify-center shadow-lg border-2 border-[#05060A] z-20"
            >
              <Camera size={14} className="text-white" />
            </motion.button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>

          <div className="relative z-10 mb-6 flex flex-col items-center">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {user?.name || 'User'}
              <div className="w-5 h-5 bg-primary-500/20 rounded-full flex items-center justify-center border border-primary-500/30">
                <CheckCircle size={12} className="text-primary-400" />
              </div>
            </h1>
            <p className="text-sm text-white/50 mt-1">{user?.email}</p>
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mt-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-medium text-emerald-400">Active</span>
            </div>
          </div>

          {avatarFile && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 absolute bottom-[-20px] z-20 bg-[#0E101A] border border-white/[0.08] p-2 rounded-2xl shadow-xl"
            >
              <button
                onClick={uploadAvatar}
                disabled={uploading}
                className="px-4 py-1.5 rounded-full bg-primary-500 hover:bg-primary-400 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
              >
                {uploading ? 'Saving...' : 'Save Photo'}
              </button>
              <button
                onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                className="px-4 py-1.5 rounded-full border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.05] text-[10px] font-bold transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* ── Stats Grid ── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-3 gap-2"
        >
          {[
            { icon: CalendarDays, label: 'Joined', value: user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-' },
            { icon: Target, label: 'Exam', value: user?.exam || 'None' },
            { icon: Flame, label: 'Streak', value: `${user?.streak || 0} days` },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center p-3 rounded-2xl bg-[#0E101A] border border-white/[0.05]">
              <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center mb-1.5">
                <item.icon size={14} className="text-white/40" />
              </div>
              <span className="text-[8px] text-white/30 uppercase tracking-wider mb-0.5">{item.label}</span>
              <span className="text-[11px] font-semibold text-white text-center leading-tight">
                {idx === 2 ? (
                  <span className="text-amber-400">{item.value}</span>
                ) : (
                  item.value
                )}
              </span>
            </div>
          ))}
        </motion.div>

        {/* ── Personal Info Section ── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between mb-1 px-1">
            <h2 className="text-[13px] font-semibold text-white/60">Personal Information</h2>
            <button 
              onClick={() => setIsEditing(true)}
              className="text-[11px] font-medium text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
            >
              <Pencil size={12} /> Edit
            </button>
          </div>

          <div className="space-y-2">
            <InfoRow icon={User} label="Full Name" value={user?.name} />
            <InfoRow icon={Mail} label="Email" value={user?.email} />
            <InfoRow icon={Phone} label="Mobile Number" value={user?.mobile} />
            <InfoRow icon={MapPin} label="Address" value={user?.address || 'Not added'} />
          </div>
        </motion.div>

        {/* ── Push Notifications ── */}
        <PushNotificationSection />

        {/* ── Device Sync ── */}
        <DeviceSyncSection />
      </div>

      {/* ── Edit Bottom Sheet ── */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0E101A] rounded-t-3xl border-t border-white/[0.08] p-6 pb-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Edit Profile</h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X size={16} className="text-white/50" />
                </button>
              </div>

              <div className="space-y-4">
                <BottomSheetField icon={User} label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter your full name" autoFocus />
                <BottomSheetField icon={Target} label="Target Exam" value={form.exam} onChange={e => setForm(f => ({ ...f, exam: e.target.value }))} isSelect options={examOptions} />
                <BottomSheetField icon={Phone} label="Mobile Number" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} type="tel" placeholder="Enter your mobile number" />
                <BottomSheetField icon={MapPin} label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Enter your address" />
              </div>

              <div className="flex items-center gap-3 mt-8 pt-4 border-t border-white/[0.05]">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setForm({ name: user?.name || '', mobile: user?.mobile || '', exam: user?.exam || '', address: user?.address || '' })
                  }}
                  className="flex-1 py-3.5 rounded-2xl border border-white/[0.08] text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateProfile.mutate()}
                  disabled={updateProfile.isPending}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-primary-500 to-mint-500 text-[#0A0B12] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                >
                  {updateProfile.isPending ? (
                    <div className="w-5 h-5 border-2 border-[#0A0B12]/30 border-t-[#0A0B12] rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={16} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
