import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Camera, Save, Lock, User, Mail, Phone, MapPin, BookOpen, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'

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

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-white">My Profile</h1>

      {/* Avatar Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/10">
              {displayAvatar ? (
                <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-3xl">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-500 hover:bg-primary-400 rounded-full flex items-center justify-center shadow-lg transition-colors"
            >
              <Camera size={14} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="font-bold text-white text-xl">{user?.name}</div>
            <div className="text-gray-400 text-sm mt-0.5">{user?.email}</div>
            <div className="flex items-center gap-1.5 mt-1 justify-center sm:justify-start">
              <CheckCircle size={13} className="text-emerald-400" />
              <span className="text-xs text-gray-500">Email verified</span>
            </div>
            {avatarFile && (
              <div className="flex gap-2 mt-3 justify-center sm:justify-start">
                <button
                  onClick={uploadAvatar}
                  disabled={uploading}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  {uploading ? 'Uploading...' : 'Save Photo'}
                </button>
                <button
                  onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Edit Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <User size={16} className="text-primary-400" /> Personal Details
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Full Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input-field"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Email (cannot be changed)</label>
            <div className="input-field opacity-50 cursor-not-allowed flex items-center gap-2">
              <Mail size={14} className="text-gray-500" />
              {user?.email}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Mobile</label>
              <input
                value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                className="input-field"
                placeholder="Mobile number"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Target Exam</label>
              <select
                value={form.exam}
                onChange={e => setForm(f => ({ ...f, exam: e.target.value }))}
                className="input-field"
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
            <label className="text-xs text-gray-400 mb-1 block">Address</label>
            <textarea
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="input-field resize-none"
              rows={2}
              placeholder="Your address"
            />
          </div>
          <button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={15} />
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Lock size={16} className="text-primary-400" /> Change Password
        </h2>
        <div className="space-y-3">
          {[
            { key: 'currentPassword', label: 'Current Password', placeholder: 'Enter current password' },
            { key: 'newPassword', label: 'New Password', placeholder: 'Enter new password (min 8 chars)' },
            { key: 'confirm', label: 'Confirm New Password', placeholder: 'Confirm new password' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
              <input
                type="password"
                value={pwForm[f.key]}
                onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="input-field"
                placeholder={f.placeholder}
              />
            </div>
          ))}
          {pwForm.newPassword && pwForm.confirm && pwForm.newPassword !== pwForm.confirm && (
            <p className="text-xs text-red-400">Passwords do not match</p>
          )}
          <button
            onClick={() => changePw.mutate()}
            disabled={changePw.isPending || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirm || pwForm.newPassword.length < 8}
            className="btn-primary flex items-center gap-2"
          >
            <Lock size={15} />
            {changePw.isPending ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </motion.div>

      {/* Account Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen size={16} className="text-primary-400" /> Account Details
        </h2>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Member Since', value: user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-IN') : 'N/A' },
            { label: 'Target Exam', value: user?.exam || 'Not set' },
            { label: 'Study Streak', value: `${user?.streak || 0} days 🔥` },
          ].map(item => (
            <div key={item.label} className="flex justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-gray-500">{item.label}</span>
              <span className="text-white font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
