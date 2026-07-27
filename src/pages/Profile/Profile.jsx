import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Camera, Save, Lock, User, Mail, Phone, MapPin, BookOpen, 
  CheckCircle, Calendar, Target, Flame, Sparkles 
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import DeviceSyncSection from './DeviceSyncSection'

/* ── Reusable Section Header ─────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title }) {
  return (
    <h2 className="text-xs font-black uppercase tracking-wider text-white/40 flex items-center gap-1.5 mb-3">
      <Icon size={14} className="text-primary-400" />
      {title}
    </h2>
  )
}

/* ── Profile Component ───────────────────────────────────────────────── */
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
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const updateProfile = useMutation({
    mutationFn: () => api.put('/user/profile', form).then(r => r.data),
    onSuccess: () => {
      updateUser(form)
      toast.success('Profile updated!')
      qc.invalidateQueries(['profile'])
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  })

  const changePw = useMutation({
    mutationFn: () => api.post('/user/change-password', {
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Password changed!')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
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

  const inputClass = "w-full bg-[#0A0B12] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/50 transition-all"

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-8 mt-2">
      <h1 className="text-2xl font-black text-white flex items-center gap-2 mb-1">
        <User size={20} className="text-primary-400" /> Profile
      </h1>

      {/* ── Avatar Card ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative overflow-hidden rounded-3xl bg-[#13161F] border border-white/[0.06] p-4">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary-500/15 rounded-full blur-[60px] pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/[0.08] bg-[#0A0B12]">
              {displayAvatar ? (
                <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-2xl">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary-500 hover:bg-primary-400 rounded-full flex items-center justify-center shadow-lg border-2 border-[#13161F] transition-colors"
            >
              <Camera size={14} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="font-bold text-white text-lg">{user?.name}</div>
            <div className="text-white/50 text-xs mt-0.5">{user?.email}</div>
            <div className="flex items-center gap-1.5 mt-1 justify-center sm:justify-start">
              <CheckCircle size={12} className="text-mint-400" />
              <span className="text-[10px] text-white/40 font-medium">Email verified</span>
            </div>
            
            {avatarFile && (
              <div className="flex gap-2 mt-3 justify-center sm:justify-start">
                <button
                  onClick={uploadAvatar}
                  disabled={uploading}
                  className="px-4 py-1.5 rounded-full bg-mint-500 hover:bg-mint-400 text-[#0A1A1A] text-[10px] font-bold transition-colors disabled:opacity-50"
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
        </div>
      </motion.div>

      {/* ── Personal Details ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.4 }} className="rounded-3xl bg-[#13161F] border border-white/[0.06] p-4">
        <SectionHeader icon={Sparkles} title="Personal Details" />
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1 block">Full Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputClass}
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1 block">Email</label>
            <div className={`${inputClass} opacity-50 cursor-not-allowed flex items-center gap-2`}>
              <Mail size={14} className="text-white/30" />
              {user?.email}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1 block">Mobile</label>
              <input
                value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                className={inputClass}
                placeholder="Mobile number"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1 block">Target Exam</label>
              <select
                value={form.exam}
                onChange={e => setForm(f => ({ ...f, exam: e.target.value }))}
                className={`${inputClass} appearance-none`}
              >
                <option value="">Select Exam</option>
                <option value="UPSC">UPSC</option>
                <option value="SSC">SSC</option>
                <option value="State PCS">State PCS</option>
                <option value="Railway">Railway</option>
                <option value="Banking">Banking</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1 block">Address</label>
            <textarea
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Your address"
            />
          </div>
          <button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
            className="w-full sm:w-auto rounded-full bg-primary-500 hover:bg-primary-400 text-white text-xs font-bold px-5 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors mt-1"
          >
            <Save size={14} />
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>

      {/* ── Change Password ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }} className="rounded-3xl bg-[#13161F] border border-white/[0.06] p-4">
        <SectionHeader icon={Lock} title="Change Password" />
        <div className="space-y-3">
          {[
            { key: 'currentPassword', label: 'Current Password', placeholder: 'Enter current password' },
            { key: 'newPassword', label: 'New Password', placeholder: 'Enter new password (min 8 chars)' },
            { key: 'confirm', label: 'Confirm New Password', placeholder: 'Confirm new password' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1 block">{f.label}</label>
              <input
                type="password"
                value={pwForm[f.key]}
                onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                className={inputClass}
                placeholder={f.placeholder}
              />
            </div>
          ))}
          {pwForm.newPassword && pwForm.confirm && pwForm.newPassword !== pwForm.confirm && (
            <p className="text-[10px] text-red-400/80 font-medium">Passwords do not match</p>
          )}
          <button
            onClick={() => changePw.mutate()}
            disabled={changePw.isPending || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirm || pwForm.newPassword.length < 8}
            className="w-full sm:w-auto rounded-full bg-primary-500 hover:bg-primary-400 text-white text-xs font-bold px-5 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors mt-1"
          >
            <Lock size={14} />
            {changePw.isPending ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </motion.div>

      {/* ── Account Details ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }} className="rounded-3xl bg-[#13161F] border border-white/[0.06] p-4">
        <SectionHeader icon={BookOpen} title="Account Details" />
        <div className="space-y-1">
          {[
            { icon: Calendar, label: 'Member Since', value: user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A' },
            { icon: Target, label: 'Target Exam', value: user?.exam || 'Not set' },
            { icon: Flame, label: 'Study Streak', value: `${user?.streak || 0} days` },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-white/[0.05] last:border-0">
              <div className="flex items-center gap-2">
                <item.icon size={14} className="text-white/30" />
                <span className="text-[11px] font-medium text-white/40">{item.label}</span>
              </div>
              <span className="text-[12px] font-semibold text-white">
                {item.label === 'Study Streak' ? (
                  <span className="text-amber-400">{item.value} 🔥</span>
                ) : (
                  item.value
                )}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Device Sync ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }} className="rounded-3xl bg-[#13161F] border border-white/[0.06] p-4">
        <DeviceSyncSection />
      </motion.div>
    </div>
  )
}
