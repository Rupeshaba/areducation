import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Send, Instagram, MessageCircle, Phone, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const { data } = useQuery({
    queryKey: ['social-links'],
    queryFn: () => api.get('/public/social-links').then(r => r.data).catch(() => ({})),
    staleTime: 300000,
  })

  const submitMutation = useMutation({
    mutationFn: () => api.post('/contact', form).then(r => r.data),
    onSuccess: () => {
      setSubmitted(true)
      toast.success('Message sent!')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to send'),
  })

  // Build proper social URLs – assuming API returns usernames/handles
  const socialLinks = [
    {
      label: 'Instagram',
      icon: Instagram,
      href: data?.instagram ? `https://instagram.com/${data.instagram.replace('@', '')}` : null,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
    },
    {
      label: 'Telegram',
      icon: MessageCircle,
      href: data?.telegram ? `https://t.me/${data.telegram.replace('@', '')}` : null,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
    },
    {
      label: 'WhatsApp',
      icon: Phone,
      href: data?.whatsapp ? `https://wa.me/${data.whatsapp.replace(/[^0-9]/g, '')}` : null,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
  ].filter(link => link.href)

  if (submitted) return (
    <div className="max-w-md mx-auto text-center py-20">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={40} className="text-emerald-400" />
      </motion.div>
      <h2 className="text-xl font-bold text-white mb-2">Message Sent!</h2>
      <p className="text-gray-400 text-sm mb-6">We'll get back to you soon.</p>
      <button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }) }} className="btn-ghost">Send Another</button>
    </div>
  )

  return (
    <div className="max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
          <div className="w-16 h-1 bg-primary-500 rounded-full" />
        </div>

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-white mb-3 text-sm">Connect With Us</h3>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${link.bg} border border-white/5 hover:border-white/10 transition-all`}
                >
                  <link.icon size={18} className={link.color} />
                  <span className="text-sm font-medium text-white">{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Contact Form */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-white">Send a Message</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Your name" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder="your@email.com" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Subject</label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="input-field" placeholder="What's this about?" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Message *</label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="input-field resize-none" rows={4} placeholder="Write your message here..." />
          </div>
          <button
            onClick={() => submitMutation.mutate()}
            disabled={!form.name || !form.email || !form.message || submitMutation.isPending}
            className="btn-primary flex items-center gap-2 w-full justify-center"
          >
            <Send size={15} />
            {submitMutation.isPending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}