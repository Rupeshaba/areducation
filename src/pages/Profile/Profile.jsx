import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, Pencil, CheckCircle, Calendar, Target, Flame, 
  Shield, User, Mail, Phone, Lock, CreditCard, Headphones, 
  LogOut, QrCode, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import DeviceSyncSection from './DeviceSyncSection'

/* ── Reusable Section Header ─────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, onEdit, showEdit = false }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary-500/20 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
          <Icon size={14} className="text-primary-300" />
        </div>
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      {showEdit && (
        <button onClick={onEdit} className="text-primary-400 hover:text-primary-300 text-xs font-medium flex items-center gap-1 transition-colors">
          <Pencil size={13} /> Edit
        </button>
      )}
    </div>
  )
}

/* ── Read Only Input Field ───────────────────────────────────────────── */
function ReadOnlyField({ icon: Icon, label, value, placeholder, isSelect = false }) {
  return (
    <div className="bg-[#0E101A] border border-white/[0.05] rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[10px] font-medium text-white/40">
        <Icon size={13} className="text-white/30 flex-shrink-0" />
        <span>{label}</span>
      </div>
      
      {isSelect ? (
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-sm font-semibold text-white">{value || 'Not set'}</span>
          <ChevronRight size={14} className="text-white/30" />
        </div>
      ) : (
        <span className="text-sm font-semibold text-white mt-0.5 truncate">
          {value || placeholder || 'Not set'}
        </span>
      )}
    </div>
  )
}

/* ── Edit Mode Input Field ────────────────────────────────────────────── */
function EditField({ icon: Icon, label, value, onChange, placeholder, type = 'text', isSelect = false, options = [] }) {
  return (
    <div className="bg-[#0E101A] border border-primary-500/30 rounded-xl p-3 flex flex-col gap-1 ring-1 ring-primary-500/20">
      <div className="flex items-center gap-2 text-[10px] font-medium text-primary-300">
        <Icon size={13} className="text-primary-300 flex-shrink-0" />
        <span>{label}</span>
      </div>
      
      {isSelect ? (
        <select
          value={value}
          onChange={onChange}
          className="w-full bg-transparent text-sm font-semibold text-white mt-0.5 focus:outline-none appearance-none"
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm font-semibold text-white mt-0.5 placeholder:text-white/30 focus:outline-none"
        />
      )}
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
  const dpRingUrl = "https://i.pinimg.com/vwebp/736x/cf/35/05/cf3505765b8a6681653b2e12000d66dc.webp"

  const examOptions = ["UPSC", "SSC", "State PCS", "Railway", "Banking", "Other"]

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-8 mt-2">
      
      {/* ── Top Profile Card ── */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-[#0E101A] border border-white/[0.06] pt-6 pb-4 px-4"
      >
        {/* Purple Glow */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary-500/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          {/* Header Part */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              {/* Golden Sparkle Ring - Black background removed using mix-blend-mode */}
              <div className="absolute -inset-2 w-[120px] h-[120px] -ml-[4px] -mt-[4px] z-0 pointer-events-none">
                <img 
                  src={dpRingUrl} 
                  alt="Ring" 
                  className="w-full h-full object-contain mix-blend-screen animate-pulse" 
                  style={{ animationDuration: '3s' }}
                />
              </div>
              
              {/* DP Image */}
              <div className="relative w-[100px] h-[100px] rounded-full overflow-hidden border-2 border-black/50 z-10 bg-[#0A0B12] flex-shrink-0 mx-auto">
                {displayAvatar ? (
                  <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-500/30 to-mint-500/30 flex items-center justify-center text-primary-400 font-bold text-3xl">
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Camera Button on DP */}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-2 w-8 h-8 bg-primary-500 hover:bg-primary-400 rounded-full flex items-center justify-center shadow-lg border-2 border-[#0E101A] z-20 transition-colors"
              >
                <Camera size={14} className="text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>

            <h1 className="text-xl font-bold text-white flex items-center gap-1.5">
              {user?.name || 'User'}
              <div className="w-5 h-5 bg-primary-500/20 rounded-full flex items-center justify-center border border-primary-500/30">
                <CheckCircle size={12} className="text-primary-400" />
              </div>
            </h1>
            <p className="text-xs text-white/40 mt-0.5">{user?.email}</p>
            
            {/* Email Verified Badge */}
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mt-2.5">
              <CheckCircle size={12} className="text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400">Email verified</span>
            </div>

            {avatarFile && (
              <div className="flex gap-2 mt-3 justify-center">
                <button
                  onClick={uploadAvatar}
                  disabled={uploading}
                  className="px-4 py-1.5 rounded-full bg-primary-500 hover:bg-primary-400 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Save Photo'}
                </button>
                <button
                  onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                  className="px-4 py-1.5 rounded-full border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.05] text-[10px] font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* ── 4 Info Grid ── */}
          <div className="grid grid-cols-4 gap-2 mt-6 border-t border-white/[0.05] pt-4">
            {[
              { icon: Calendar, label: 'Member Since', value: user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '-' },
              { icon: Target, label: 'Target Exam', value: user?.exam || 'SSC' },
              { icon: Flame, label: 'Study Streak', value: `${user?.streak || 0} days` },
              { icon: Shield, label: 'Account Status', value: 'Active', isStatus: true },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center text-center gap-0.5">
                <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center mb-1">
                  <item.icon size={12} className="text-white/40" />
                </div>
                <span className="text-[9px] text-white/30 uppercase tracking-wider">{item.label}</span>
                <span className="text-[10px] font-semibold text-white leading-tight">
                  {item.isStatus ? (
                    <span className="flex items-center gap-1">
                      Active <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    </span>
                  ) : (
                    item.value
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Personal Details ── */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.05, duration: 0.4 }}
        className="rounded-3xl bg-[#0E101A] border border-white/[0.06] p-4"
      >
        <SectionHeader 
          icon={User} 
          title="Personal Details" 
          showEdit={!isEditing} 
          onEdit={() => setIsEditing(true)} 
        />
        
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isEditing ? (
              <EditField icon={User} label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter your name" />
            ) : (
              <ReadOnlyField icon={User} label="Full Name" value={user?.name} />
            )}
            
            {isEditing ? (
              <EditField icon={Mail} label="Email" value={user?.email} type="email" placeholder="Email" />
            ) : (
              <ReadOnlyField icon={Mail} label="Email (can't be changed)" value={user?.email} />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isEditing ? (
              <EditField icon={Phone} label="Mobile Number" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} type="tel" placeholder="Enter mobile number" />
            ) : (
              <ReadOnlyField icon={Phone} label="Mobile Number" value={user?.mobile} />
            )}

            {isEditing ? (
              <EditField icon={Target} label="Target Exam" value={form.exam} onChange={e => setForm(f => ({ ...f, exam: e.target.value }))} isSelect={true} options={examOptions} />
            ) : (
              <ReadOnlyField icon={Target} label="Target Exam" value={user?.exam} isSelect={true} />
            )}
          </div>

          <div className="col-span-2">
            {isEditing ? (
              <EditField icon={Shield} label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} type="text" placeholder="Enter your address" />
            ) : (
              <ReadOnlyField icon={Shield} label="Address" value={user?.address || 'Address not added'} />
            )}
          </div>

          {/* Editing Actions */}
          <AnimatePresence>
            {isEditing && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 mt-1 overflow-hidden"
              >
                <button
                  onClick={() => updateProfile.mutate()}
                  disabled={updateProfile.isPending}
                  className="flex-1 sm:flex-none rounded-full bg-primary-500 hover:bg-primary-400 text-white text-xs font-bold px-5 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle size={14} />
                  {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setForm({ name: user?.name || '', mobile: user?.mobile || '', exam: user?.exam || '', address: user?.address || '' })
                  }}
                  className="flex-1 sm:flex-none rounded-full border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.05] text-xs font-bold px-5 py-2.5 flex items-center justify-center gap-2 transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Account Details ── */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1, duration: 0.4 }}
        className="rounded-3xl bg-[#0E101A] border border-white/[0.06] p-4"
      >
        <SectionHeader icon={Shield} title="Account Details" />
        <div className="space-y-2">
          {[
            { label: 'Member Since', value: user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' }) : 'N/A' },
            { label: 'Target Exam', value: user?.exam || 'Not set' },
            { label: 'Study Streak', value: `${user?.streak || 0} days` },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-center py-3 border-b border-white/[0.05] last:border-0">
              <span className="text-[11px] font-medium text-white/40">{item.label}</span>
              <span className="text-[12px] font-semibold text-white">
                {item.label === 'Study Streak' ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    {item.value} <Flame size={14} className="fill-amber-400 text-amber-400" />
                  </span>
                ) : (
                  item.value
                )}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Device Sync Card ── */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.15, duration: 0.4 }}
        className="rounded-3xl bg-[#0E101A] border border-white/[0.06] overflow-hidden p-4"
      >
        <DeviceSyncSection />
      </motion.div>

    </div>
  )
}
