import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, Save, Lock, User, Mail, Phone, MapPin, BookOpen,
  CheckCircle, ChevronLeft, MoreHorizontal, Smartphone, Monitor,
  Flame, Calendar, Target, Clock, Eye, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import DeviceSyncSection from './DeviceSyncSection'

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
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [activeSection, setActiveSection] = useState('details') // 'details' | 'security'

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
      setShowPw({ current: false, new: false, confirm: false })
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
  const initials = (user?.name || 'U').charAt(0).toUpperCase()

  const pwDisabled =
    changePw.isPending ||
    !pwForm.currentPassword ||
    !pwForm.newPassword ||
    pwForm.newPassword !== pwForm.confirm ||
    pwForm.newPassword.length < 8

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 h-14 flex items-center justify-between">
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:bg-white/10 transition-colors">
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-lg font-semibold tracking-tight">My Profile</h1>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:bg-white/10 transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Avatar Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center pt-8 pb-2 px-4"
      >
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/10 ring-offset-4 ring-offset-black">
            {displayAvatar ? (
              <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-500/15 flex items-center justify-center text-blue-400 font-bold text-4xl">
                {initials}
              </div>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-90 transition-transform"
          >
            <Camera size={18} className="text-white" strokeWidth={2.5} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>

        <h2 className="mt-4 text-2xl font-bold">{user?.name || 'User'}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{user?.email}</p>

        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle size={14} className="text-emerald-400" strokeWidth={2.5} />
          <span className="text-xs font-semibold text-emerald-400">Verified</span>
        </div>

        {/* Avatar Actions */}
        <AnimatePresence>
          {avatarFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-3 mt-4 overflow-hidden"
            >
              <button
                onClick={uploadAvatar}
                disabled={uploading}
                className="px-5 py-2 bg-blue-500 rounded-xl text-sm font-semibold text-white active:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20"
              >
                {uploading ? 'Uploading...' : 'Save Photo'}
              </button>
              <button
                onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-gray-300 active:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="px-4 mt-6"
      >
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5 active:bg-white/[0.07] transition-colors">
            <div className="flex justify-center mb-1">
              <Flame size={18} className="text-orange-400" />
            </div>
            <div className="text-xl font-bold text-white">{user?.streak || 0}</div>
            <div className="text-[11px] text-gray-500 mt-0.5 font-medium uppercase tracking-wide">Day Streak</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5 active:bg-white/[0.07] transition-colors">
            <div className="flex justify-center mb-1">
              <Target size={18} className="text-blue-400" />
            </div>
            <div className="text-xl font-bold text-white">{user?.exam || '—'}</div>
            <div className="text-[11px] text-gray-500 mt-0.5 font-medium uppercase tracking-wide">Target</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5 active:bg-white/[0.07] transition-colors">
            <div className="flex justify-center mb-1">
              <Calendar size={18} className="text-purple-400" />
            </div>
            <div className="text-xl font-bold text-white">
              {user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : 'N/A'}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5 font-medium uppercase tracking-wide">Joined</div>
          </div>
        </div>
      </motion.div>

      {/* Section Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 mt-6"
      >
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveSection('details')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeSection === 'details'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeSection === 'security'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Security
          </button>
        </div>
      </motion.div>

      {/* Details Section */}
      <AnimatePresence mode="wait">
        {activeSection === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
            className="px-4 mt-4 space-y-4"
          >
            {/* Personal Details Card */}
            <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-white/5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <User size={16} className="text-blue-400" />
                </div>
                <span className="font-semibold text-white text-sm">Personal Details</span>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium ml-1">Full Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-base"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-medium ml-1">Email</label>
                  <div className="mt-1.5 w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-gray-400 flex items-center gap-2.5 select-none">
                    <Mail size={16} className="text-gray-600" />
                    <span className="text-base">{user?.email}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-medium ml-1">Mobile Number</label>
                  <div className="mt-1.5 relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      value={form.mobile}
                      onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-base"
                      placeholder="Mobile number"
                      type="tel"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-medium ml-1">Target Exam</label>
                  <div className="mt-1.5 relative">
                    <BookOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                    <select
                      value={form.exam}
                      onChange={e => setForm(f => ({ ...f, exam: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-10 py-3.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-base appearance-none"
                    >
                      <option value="">Select Exam</option>
                      <option value="UPSC">UPSC</option>
                      <option value="SSC">SSC</option>
                      <option value="State PCS">State PCS</option>
                      <option value="Railway">Railway</option>
                      <option value="Banking">Banking</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-medium ml-1">Address</label>
                  <div className="mt-1.5 relative">
                    <MapPin size={16} className="absolute left-4 top-3.5 text-gray-600" />
                    <textarea
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-base resize-none"
                      rows={2}
                      placeholder="Your address"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Device Sync Card */}
            <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-white/5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Smartphone size={16} className="text-purple-400" />
                </div>
                <span className="font-semibold text-white text-sm">Device Sync</span>
              </div>
              <div className="p-2">
                <DeviceSyncSection />
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-white/5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock size={16} className="text-amber-400" />
                </div>
                <span className="font-semibold text-white text-sm">Account Info</span>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  { label: 'Member Since', value: user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-IN') : 'N/A', icon: Calendar },
                  { label: 'Target Exam', value: user?.exam || 'Not set', icon: Target },
                  { label: 'Study Streak', value: `${user?.streak || 0} days 🔥`, icon: Flame },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <item.icon size={14} className="text-gray-600" />
                      <span className="text-sm text-gray-400">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Security Section */}
        {activeSection === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="px-4 mt-4 space-y-4"
          >
            <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-white/5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Lock size={16} className="text-red-400" />
                </div>
                <span className="font-semibold text-white text-sm">Change Password</span>
              </div>
              <div className="p-4 space-y-4">
                {[
                  { key: 'currentPassword', label: 'Current Password', placeholder: 'Enter current password', show: showPw.current, toggle: () => setShowPw(p => ({ ...p, current: !p.current })) },
                  { key: 'newPassword', label: 'New Password', placeholder: 'Min 8 characters', show: showPw.new, toggle: () => setShowPw(p => ({ ...p, new: !p.new })) },
                  { key: 'confirm', label: 'Confirm Password', placeholder: 'Re-enter password', show: showPw.confirm, toggle: () => setShowPw(p => ({ ...p, confirm: !p.confirm })) },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500 font-medium ml-1">{f.label}</label>
                    <div className="mt-1.5 relative">
                      <input
                        type={f.show ? 'text' : 'password'}
                        value={pwForm[f.key]}
                        onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all text-base"
                        placeholder={f.placeholder}
                      />
                      <button
                        onClick={f.toggle}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-500 active:text-gray-300 transition-colors"
                        type="button"
                      >
                        {f.show ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                ))}

                {pwForm.newPassword && pwForm.confirm && pwForm.newPassword !== pwForm.confirm && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-400 font-medium"
                  >
                    Passwords do not match
                  </motion.p>
                )}

                <button
                  onClick={() => changePw.mutate()}
                  disabled={pwDisabled}
                  className="w-full bg-red-500/10 border border-red-500/20 text-red-400 font-semibold py-3.5 rounded-xl active:bg-red-500/20 transition-colors disabled:opacity-30 disabled:active:bg-red-500/10 flex items-center justify-center gap-2 mt-2"
                >
                  <Lock size={18} strokeWidth={2.5} />
                  {changePw.isPending ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom Save Bar */}
      <AnimatePresence>
        {activeSection === 'details' && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
          >
            <button
              onClick={() => updateProfile.mutate()}
              disabled={updateProfile.isPending}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50"
            >
              <Save size={18} strokeWidth={2.5} />
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
