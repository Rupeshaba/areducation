import { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Loader2, CheckCircle, XCircle, Clock,
  Paperclip, FileText, Trash2, XCircle as XCircle2, Pin,
  ChevronDown, X, Pencil, Eye, ArrowLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import { APP_LOGO_URL } from '../../constants/branding'

// Helper: resolve media URL (handles relative URLs from Render backend)
const resolveUrl = (url) => {
  if (!url) return url
  if (url.startsWith('http')) return url
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : ''
  return `${base}${url}`
}

export default function DoubtChat() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [appConfig, setAppConfig] = useState({ logoUrl: APP_LOGO_URL, appName: 'AR Education' })
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [showOptionsId, setShowOptionsId] = useState(null)
  const [showPinnedList, setShowPinnedList] = useState(false)
  const [chatBg, setChatBg] = useState(() => localStorage.getItem('chatBg') || 'default')
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const fileInputRef = useRef(null)
  const userCache = useRef({})
  const msgRefs = useRef({})

  useEffect(() => {
    api.get('/chat/config').then(r => setAppConfig({ ...r.data, logoUrl: r.data?.logoUrl || APP_LOGO_URL })).catch(() => {})
  }, [])

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get('/chat/messages?limit=100')
        const msgs = res.data.messages || []
        msgs.forEach(m => {
          if (m.uid && m.user && !m.isAdmin) userCache.current[m.uid] = m.user
        })
        msgs.sort((a, b) => a.createdAt - b.createdAt)
        setMessages(msgs)
      } catch {
        toast.error('Failed to load messages')
      }
    }
    api.post('/chat/messages/read').catch(() => {})
    qc.invalidateQueries(['chat-unread-count'])
    fetchMessages()
  }, [])

  useEffect(() => {
    if (!user?.uid) return
    const SOCKET_URL = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : '/'
    const socket = io(SOCKET_URL, {
      autoConnect: true, reconnection: true,
      reconnectionAttempts: 5, reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setSocketConnected(true)
      socket.emit('join', { userId: user.uid })
    })
    socket.on('disconnect', () => setSocketConnected(false))
    socket.on('online_count', (count) => setOnlineCount(count))

    socket.on('doubt_chat_message', (msg) => {
      if (msg.uid && msg.user && !msg.isAdmin) userCache.current[msg.uid] = msg.user
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id && !m._optimistic)) return prev
        const withoutOpt = prev.filter(
          m => !(m._optimistic && m.uid === msg.uid && m.content === msg.content)
        )
        return [...withoutOpt, msg].sort((a, b) => a.createdAt - b.createdAt)
      })
      api.post('/chat/messages/read').catch(() => {})
      qc.invalidateQueries(['chat-unread-count'])
    })

    socket.on('doubt_chat_edited', (updated) => {
      setMessages(prev => prev.map(m =>
        m.id === updated.id
          ? { ...m, content: updated.content, editedAt: updated.editedAt }
          : m
      ))
    })

    socket.on('doubt_chat_moderated', ({ id, status }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m))
    })

    socket.on('doubt_chat_deleted', ({ id, forEveryone }) => {
      if (forEveryone) setMessages(prev => prev.filter(m => m.id !== id))
      else setMessages(prev => prev.map(m =>
        m.id === id ? { ...m, selfDeleted: true, content: 'This message was deleted' } : m
      ))
    })

    socket.on('doubt_chat_pinned', ({ id, pinned }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, pinned } : m))
    })

    socket.on('doubt_chat_error', ({ error }) => toast.error(error || 'Chat error'))

    return () => { socket.disconnect(); socketRef.current = null }
  }, [user?.uid])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Format seen count: 1200 → 1.2k, 2000 → 2k
  const fmtSeen = (n) => {
    if (!n || n <= 0) return null
    if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`
    return String(n)
  }

  const handleSend = () => {
    if (!input.trim()) return
    const content = input.trim()
    setInput('')
    const tempId = `temp_${Date.now()}_${Math.random()}`
    const optimistic = {
      id: tempId, _optimistic: true, uid: user.uid, content,
      type: 'text', status: 'approved', createdAt: Date.now(),
      isAdmin: false, pinned: false, editedAt: null,
      user: { name: user.name || 'You', avatarUrl: user.avatarUrl || null, email: user.email || '' },
    }
    setMessages(prev => [...prev, optimistic])

    if (socketRef.current?.connected) {
      socketRef.current.emit('doubt_chat_send', {
        content, uid: user.uid,
        userInfo: { name: user.name || '', email: user.email || '', avatarUrl: user.avatarUrl || null },
      })
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error('Not connected. Please wait and try again.')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleMediaUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return }
    const formData = new FormData()
    formData.append('file', file)
    try {
      await api.post('/chat/messages/media', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to send') }
    e.target.value = ''
  }

  const startEdit = (msg) => {
    if (msg.uid !== user?.uid) return
    setEditingId(msg.id)
    setEditText(msg.content)
    setShowOptionsId(null)
  }

  const saveEdit = async () => {
    if (!editText.trim() || !editingId) return
    try {
      await api.put(`/chat/messages/${editingId}`, { content: editText.trim() })
      setEditingId(null)
      setEditText('')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to edit') }
  }

  const cancelEdit = () => { setEditingId(null); setEditText('') }

  const deleteMsg = async (id, forEveryone = false) => {
    try {
      await api.delete(`/chat/messages/${id}?forEveryone=${forEveryone}`)
      setShowOptionsId(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete') }
  }

  const scrollToMessage = (id) => {
    setShowPinnedList(false)
    const el = msgRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('highlight-flash')
      setTimeout(() => el.classList.remove('highlight-flash'), 1500)
    }
  }

  const fmt = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    let h = d.getHours()
    const m = String(d.getMinutes()).padStart(2, '0')
    const ampm = h >= 12 ? 'pm' : 'am'
    h = h % 12 || 12
    return `${h}:${m} ${ampm}`
  }

  const fmtDate = (ts) => {
    if (!ts) return ''
    const d = new Date(ts), now = new Date()
    if (d.toDateString() === now.toDateString()) return 'Today'
    const y = new Date(now); y.setDate(y.getDate() - 1)
    if (d.toDateString() === y.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const linkify = (text) => {
    if (!text) return null
    const re = /(https?:\/\/[^\s]+)/g
    return text.split(re).map((p, i) =>
      p.match(re)
        ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline break-all">{p.length > 40 ? p.slice(0, 40) + '…' : p}</a>
        : <span key={i}>{p}</span>
    )
  }

  const getSender = (item) => {
    if (item.isAdmin) return {
      name: appConfig?.appName || 'Admin',
      initials: 'AD',
      color: '#10b981',
      avatarUrl: appConfig?.logoUrl || null,
    }
    const own = item.uid === user?.uid
    const info = own
      ? { name: user?.name, avatarUrl: user?.avatarUrl }
      : (item.user || userCache.current[item.uid] || {})
    const name = info.name || (own ? 'You' : 'Unknown')
    return {
      name, initials: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      color: own ? '#6366f1' : '#3b82f6',
      avatarUrl: info.avatarUrl || null,
    }
  }

  const pinnedMessages = messages.filter(m => m.pinned).sort((a, b) => b.createdAt - a.createdAt)
  const latestPinned = pinnedMessages[0]

  // Group by date
  const grouped = []
  let curDate = null
  messages.forEach(msg => {
    const dk = new Date(msg.createdAt).toDateString()
    if (dk !== curDate) { grouped.push({ type: 'date', date: fmtDate(msg.createdAt) }); curDate = dk }
    grouped.push(msg)
  })

  const bgStyles = {
    default: 'bg-dark-900',
    dots: 'bg-dark-900 chat-bg-dots',
    grid: 'bg-dark-900 chat-bg-grid',
    waves: 'bg-dark-900 chat-bg-waves',
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-dark-900 overflow-hidden">
      <style>{`
        .highlight-flash { animation: msgFlash 1.5s ease; }
        @keyframes msgFlash {
          0%,100% { background-color: transparent; }
          30% { background-color: rgba(245,158,11,0.25); border-radius: 12px; }
        }
        .chat-bg-dots { background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 24px 24px; }
        .chat-bg-grid { background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 32px 32px; }
        .chat-bg-waves { background-image: repeating-linear-gradient(45deg, rgba(99,102,241,0.04) 0px, rgba(99,102,241,0.04) 1px, transparent 1px, transparent 12px); }
      `}</style>

      {/* ── HEADER (fixed at top, never scrolls) ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-5 h-14 sm:h-16 border-b border-white/5 bg-dark-800/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            {appConfig?.logoUrl
              ? <img src={resolveUrl(appConfig.logoUrl)} alt="Logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover" />
              : <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <MessageSquare size={16} className="sm:w-5 sm:h-5 text-primary-400" />
                </div>}
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base leading-tight">{appConfig?.appName || 'AR Education'}</h3>
              <p className="text-[10px] sm:text-[11px] leading-tight">
                {socketConnected
                  ? <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
                      Online
                      {onlineCount > 0 && (
                        <span className="flex items-center gap-0.5 text-emerald-300 text-[9px] sm:text-[10px]">
                          <Eye size={8} className="sm:w-3 sm:h-3 text-emerald-400" />
                          {onlineCount > 999 ? `${(onlineCount/1000).toFixed(onlineCount >= 10000 ? 0 : 1)}k` : onlineCount}
                        </span>
                      )}
                    </span>
                  : <span className="text-gray-600">Connecting…</span>}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* BG picker */}
          <div className="relative group">
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 bg-dark-800 border border-white/10 rounded-xl p-2 flex gap-1.5 shadow-xl z-30 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
              {Object.entries({ default: '⬛', dots: '•••', grid: '###', waves: '≈≈≈' }).map(([k, label]) => (
                <button key={k} onClick={() => { setChatBg(k); localStorage.setItem('chatBg', k) }}
                  className={`text-[10px] px-2 py-1 rounded-lg transition-all ${chatBg === k ? 'bg-primary-500 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                >{label}</button>
              ))}
            </div>
          </div>
          {user?.avatarUrl
            ? <img src={resolveUrl(user.avatarUrl)} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-white/10" />
            : <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-primary-400">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>}
        </div>
      </div>

      {/* ── PINNED MESSAGE BAR (Telegram style) ── */}
      <AnimatePresence>
        {latestPinned && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 bg-dark-800/80 backdrop-blur-sm border-b border-amber-500/20 z-10 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="w-0.5 h-6 sm:h-8 bg-amber-400 rounded-full flex-shrink-0" />
              <button
                className="flex-1 min-w-0 text-left"
                onClick={() => pinnedMessages.length > 1 ? setShowPinnedList(true) : scrollToMessage(latestPinned.id)}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <Pin size={8} className="sm:w-3 sm:h-3 text-amber-400" />
                  <span className="text-[9px] sm:text-[10px] text-amber-400 font-semibold">
                    Pinned Message {pinnedMessages.length > 1 ? `(${pinnedMessages.length})` : ''}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-300 truncate">
                  {latestPinned.type === 'image' ? '📷 Photo' : latestPinned.type === 'pdf' ? '📄 PDF' : latestPinned.content}
                </p>
              </button>
              <button onClick={() => setShowPinnedList(false)} className="text-gray-600 hover:text-gray-400 p-1">
                <ChevronDown size={12} className="sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MESSAGES AREA ── */}
      <div className={`flex-1 overflow-y-auto px-3 sm:px-4 py-2 sm:py-3 space-y-1 sm:space-y-1.5 ${bgStyles[chatBg] || bgStyles.default}`}>
        {grouped.map((item, i) => {
          if (item.type === 'date') return (
            <div key={`d${i}`} className="flex justify-center my-2">
              <span className="text-[9px] sm:text-[10px] text-gray-500 bg-dark-800/70 px-2 sm:px-2.5 py-0.5 rounded-full">{item.date}</span>
            </div>
          )

          const own = item.uid === user?.uid
          const isAdmin = item.isAdmin
          const isEditing = editingId === item.id
          const sender = getSender(item)

          return (
            <div
              key={item.id}
              ref={el => { if (el) msgRefs.current[item.id] = el }}
              className={`flex ${own ? 'justify-end' : 'justify-start'} group px-1 py-0.5`}
              onMouseEnter={() => setShowOptionsId(item.id)}
              onMouseLeave={() => setShowOptionsId(null)}
            >
              <div className={`max-w-[82%] sm:max-w-[78%] flex ${own ? 'flex-row-reverse' : 'flex-row'} gap-1.5 sm:gap-2 items-end`}>
                {/* Avatar */}
                <div
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[8px] sm:text-[9px] font-bold text-white mb-0.5 flex-none"
                  style={{ backgroundColor: sender.color }}
                >
                  {sender.avatarUrl
                    ? <img src={resolveUrl(sender.avatarUrl)} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                    : sender.initials}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col ${own ? 'items-end' : 'items-start'} min-w-0`}>
                  {/* Sender name (only non-own) */}
                  {!own && (
                    <span className={`text-[9px] sm:text-[10px] font-semibold mb-0.5 ml-1 ${isAdmin ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {sender.name}
                    </span>
                  )}

                  <div className={`rounded-2xl px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm leading-snug shadow-sm max-w-full relative ${
                    own
                      ? 'bg-primary-500/25 text-white border border-primary-500/20 rounded-br-sm'
                      : isAdmin
                        ? 'bg-emerald-500/15 text-emerald-50 border border-emerald-500/20 rounded-bl-sm'
                        : 'bg-dark-700/70 text-gray-200 border border-white/5 rounded-bl-sm'
                  } ${item.pinned ? 'ring-1 ring-amber-500/50' : ''} ${item._optimistic ? 'opacity-60' : ''}`}>

                    {/* Edited pencil icon - tiny corner indicator */}
                    {item.editedAt && !isEditing && (
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-dark-700 rounded-full flex items-center justify-center border border-white/10" title="Edited">
                        <Pencil size={6} className="sm:w-2 sm:h-2 text-gray-500" />
                      </span>
                    )}

                    {isEditing ? (
                      <div className="space-y-1 min-w-[140px] sm:min-w-[160px]">
                        <input
                          type="text" value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                          className="w-full bg-dark-800 border border-white/10 rounded-lg px-2 py-1 text-xs sm:text-sm text-white focus:outline-none focus:border-primary-500/50"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="text-[10px] sm:text-[11px] text-emerald-400 hover:text-emerald-300 font-medium">Save</button>
                          <button onClick={cancelEdit} className="text-[10px] sm:text-[11px] text-gray-500 hover:text-gray-300">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {item.type === 'image' && item.media && (
                          <img
                            src={resolveUrl(item.media.url)} alt="shared"
                            className="rounded-xl max-w-full mb-1.5 cursor-pointer max-h-40 sm:max-h-48 object-cover"
                            onClick={() => window.open(resolveUrl(item.media.url), '_blank')}
                            onError={e => { e.currentTarget.src = ''; e.currentTarget.alt = '⚠ Image unavailable' }}
                          />
                        )}
                        {item.type === 'pdf' && item.media && (
                          <a href={resolveUrl(item.media.url)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 mb-1.5 text-xs sm:text-sm">
                            <FileText size={12} className="sm:w-3.5 sm:h-3.5" /> 
                            <span className="truncate max-w-[140px] sm:max-w-[160px]">{item.media.filename || 'PDF'}</span>
                          </a>
                        )}

                        {(item.content || item.selfDeleted) && (
                          <div className={`whitespace-pre-wrap break-words text-xs sm:text-sm leading-snug ${item.selfDeleted ? 'italic text-gray-500' : ''}`}>
                            {item.selfDeleted ? 'This message was deleted' : linkify(item.content)}
                          </div>
                        )}

                        {/* Timestamp row */}
                        <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[8px] sm:text-[10px] opacity-40">{fmt(item.createdAt)}</span>
                          {item.seenBy > 0 && (
                            <span className="flex items-center gap-0.5 text-[8px] sm:text-[10px] text-gray-500">
                              <Eye size={7} className="sm:w-2 sm:h-2 opacity-60" />
                              {fmtSeen(item.seenBy)}
                            </span>
                          )}
                          {item._optimistic && <span className="text-[8px] sm:text-[10px] text-gray-500">•</span>}
                          {item.status === 'pending' && !item._optimistic && (
                            <Clock size={8} className="sm:w-2.5 sm:h-2.5 text-amber-400 opacity-70" />
                          )}
                          {item.status === 'rejected' && (
                            <XCircle size={8} className="sm:w-2.5 sm:h-2.5 text-red-400 opacity-70" />
                          )}
                          {item.pinned && <Pin size={8} className="sm:w-2.5 sm:h-2.5 text-amber-400 opacity-70" />}
                        </div>

                        {/* Hover actions */}
                        {showOptionsId === item.id && own && !item._optimistic && !item.selfDeleted && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex gap-1 sm:gap-1.5 mt-1 pt-1 border-t border-white/10"
                          >
                            <button onClick={() => startEdit(item)}
                              className="text-[9px] sm:text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
                              <Pencil size={9} className="sm:w-2.5 sm:h-2.5" /> Edit
                            </button>
                            <button onClick={() => deleteMsg(item.id, false)}
                              className="text-[9px] sm:text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-0.5">
                              <Trash2 size={9} className="sm:w-2.5 sm:h-2.5" /> Me
                            </button>
                            <button onClick={() => deleteMsg(item.id, true)}
                              className="text-[9px] sm:text-[10px] text-red-400 hover:text-red-300 flex items-center gap-0.5">
                              <XCircle2 size={9} className="sm:w-2.5 sm:h-2.5" /> All
                            </button>
                          </motion.div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT BAR (fixed at bottom) ── */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 border-t border-white/5 bg-dark-800/95 backdrop-blur-md">
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleMediaUpload} className="hidden" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 border border-white/5 transition-all flex-shrink-0"
          >
            <Paperclip size={16} className="sm:w-4 sm:h-4" />
          </button>
          <input
            type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your doubt…"
            className="flex-1 bg-dark-700/60 border border-white/5 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/15 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !socketConnected}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg shadow-primary-500/20 flex-shrink-0"
          >
            {socketConnected
              ? <Send size={16} className="sm:w-4 sm:h-4 text-white" />
              : <Loader2 size={16} className="sm:w-4 sm:h-4 text-white animate-spin" />}
          </button>
        </div>
      </div>

      {/* ── PINNED LIST MODAL ── */}
      <AnimatePresence>
        {showPinnedList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowPinnedList(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-sm max-h-80 flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Pin size={14} className="text-amber-400" />
                  <span className="text-sm font-semibold text-white">Pinned Messages</span>
                  <span className="text-xs text-gray-500">({pinnedMessages.length})</span>
                </div>
                <button onClick={() => setShowPinnedList(false)} className="text-gray-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {pinnedMessages.map((msg) => {
                  const s = getSender(msg)
                  return (
                    <button
                      key={msg.id}
                      onClick={() => scrollToMessage(msg.id)}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left"
                    >
                      <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[9px] font-bold text-white mt-0.5"
                        style={{ backgroundColor: s.color }}>
                        {s.avatarUrl ? <img src={resolveUrl(s.avatarUrl)} alt="" className="w-full h-full object-cover" /> : s.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[11px] font-semibold text-gray-300">{s.name}</span>
                          <span className="text-[10px] text-gray-600">{fmt(msg.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {msg.type === 'image' ? '📷 Photo' : msg.type === 'pdf' ? '📄 PDF' : msg.content}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
