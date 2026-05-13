import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  MessageSquare, Send, Loader2, CheckCircle, XCircle, Clock,
  ChevronDown, Paperclip, FileText, Edit3, Trash2, XCircle as XCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { io } from 'socket.io-client'

export default function DoubtChat() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [appConfig, setAppConfig] = useState({ logoUrl: null, appName: 'AR Education' })
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [showOptionsId, setShowOptionsId] = useState(null)
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const fileInputRef = useRef(null)
  const userCache = useRef({}) // uid -> {name, avatarUrl, email}

  // NOTE: unreadData query yahan zaruri nahi — Layout.jsx mein polling ho rahi hai
  // Yahan sirf mark-as-read karte hain

  useEffect(() => {
    api.get('/chat/config').then(r => setAppConfig(r.data)).catch(() => {})
  }, [])

  // Fetch messages on mount + mark as read (badge clear ho jaata hai)
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
      } catch (err) {
        toast.error('Failed to load messages')
      }
    }
    // Chat page khulte hi read mark karo → navbar badge turant 0 ho jaayega
    api.post('/chat/messages/read').catch(() => {})
    qc.invalidateQueries(['chat-unread-count'])
    fetchMessages()
  }, [])

  // Socket
  useEffect(() => {
    if (!user?.uid) return
    const SOCKET_URL = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : '/'
    const socket = io(SOCKET_URL, { autoConnect: true, reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 2000 })
    socketRef.current = socket

    socket.on('connect', () => {
      setSocketConnected(true)
      socket.emit('join', { userId: user.uid })
    })
    socket.on('disconnect', () => setSocketConnected(false))

    socket.on('doubt_chat_message', (msg) => {
      if (msg.uid && msg.user && !msg.isAdmin) userCache.current[msg.uid] = msg.user
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id && !m._optimistic)) return prev
        const withoutOpt = prev.filter(
          m => !(m._optimistic && m.uid === msg.uid && m.content === msg.content)
        )
        const result = [...withoutOpt, msg]
        result.sort((a, b) => a.createdAt - b.createdAt)
        return result
      })
      // Chat page already open hai → naya message aaya → turant read mark karo
      api.post('/chat/messages/read').catch(() => {})
      qc.invalidateQueries(['chat-unread-count'])
    })

    socket.on('doubt_chat_edited', (updated) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === updated.id
            ? { ...m, content: updated.content, editedAt: updated.editedAt, user: updated.user || m.user }
            : m
        )
      )
    })

    socket.on('doubt_chat_moderated', ({ id, status }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m))
    })

    socket.on('doubt_chat_deleted', ({ id, forEveryone }) => {
      if (forEveryone) setMessages(prev => prev.filter(m => m.id !== id))
      else setMessages(prev => prev.map(m => m.id === id ? { ...m, selfDeleted: true, content: 'This message was deleted' } : m))
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

  const handleSend = () => {
    if (!input.trim()) return
    const content = input.trim()
    setInput('')

    const tempId = `temp_${Date.now()}_${Math.random()}`
    const optimistic = {
      id: tempId,
      _optimistic: true,
      uid: user.uid,
      content,
      type: 'text',
      status: 'approved',
      createdAt: Date.now(),
      isAdmin: false,
      pinned: false,
      editedAt: null,
      user: {
        name: user.name || 'You',
        avatarUrl: user.avatarUrl || null,
        email: user.email || '',
      },
    }
    setMessages(prev => [...prev, optimistic])

    if (socketRef.current?.connected) {
      socketRef.current.emit('doubt_chat_send', {
        content,
        uid: user.uid,
        userInfo: {
          name: user.name || '',
          email: user.email || '',
          avatarUrl: user.avatarUrl || null,
        },
      })
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error('Not connected. Please wait and try again.')
    }
  }

  const handleKeyPress = (e) => {
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

  const fmt = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    let h = d.getHours()
    const m = String(d.getMinutes()).padStart(2, '0')
    const ampm = h >= 12 ? 'pm' : 'am'
    h = h % 12 || 12
    return `${dd}-${mm}-${yyyy} ${h}:${m} ${ampm}`
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
        ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{p.length > 50 ? p.slice(0, 50) + '…' : p}</a>
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
      name,
      initials: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      color: own ? '#6366f1' : '#3b82f6',
      avatarUrl: info.avatarUrl || null,
    }
  }

  const grouped = []
  let curDate = null
  messages.forEach(msg => {
    const dk = new Date(msg.createdAt).toDateString()
    if (dk !== curDate) { grouped.push({ type: 'date', date: fmtDate(msg.createdAt) }); curDate = dk }
    grouped.push(msg)
  })

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-dark-800/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {appConfig?.logoUrl
            ? <img src={appConfig.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
            : <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center"><MessageSquare size={20} className="text-primary-400" /></div>}
          <div>
            <h3 className="font-bold text-white text-sm">{appConfig?.appName || 'AR Education'} — Doubt Chat</h3>
            <p className="text-xs">
              {socketConnected
                ? <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Online</span>
                : <span className="text-gray-600">Connecting…</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 hidden sm:block">{user?.name}</span>
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10" />
            : <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center text-[10px] font-bold text-primary-400">{(user?.name || 'U').charAt(0).toUpperCase()}</div>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {grouped.map((item, i) => {
          if (item.type === 'date') return (
            <div key={`d${i}`} className="flex justify-center my-4">
              <span className="text-xs text-gray-600 bg-dark-700/60 px-3 py-1 rounded-full">{item.date}</span>
            </div>
          )

          const own = item.uid === user?.uid
          const isAdmin = item.isAdmin
          const isEditing = editingId === item.id
          const sender = getSender(item)

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex ${own ? 'justify-end' : 'justify-start'}`}
              onMouseEnter={() => setShowOptionsId(item.id)}
              onMouseLeave={() => setShowOptionsId(null)}
            >
              <div className={`max-w-[80%] flex ${own ? 'flex-row-reverse' : 'flex-row'} gap-2 items-end`}>

                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white mb-1"
                  style={{ backgroundColor: sender.color }}
                >
                  {sender.avatarUrl
                    ? <img src={sender.avatarUrl} alt={sender.name} className="w-full h-full object-cover" onError={e => e.currentTarget.remove()} />
                    : sender.initials}
                </div>

                <div className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
                  <span className={`text-[10px] font-semibold mb-0.5 ${own ? 'text-primary-300' : isAdmin ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {sender.name}
                  </span>

                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm max-w-full relative ${
                    own
                      ? 'bg-primary-500/20 text-white border border-primary-500/20 rounded-br-sm'
                      : isAdmin
                        ? 'bg-emerald-500/15 text-emerald-100 border border-emerald-500/20 rounded-bl-sm'
                        : 'bg-dark-700/60 text-gray-200 border border-white/5 rounded-bl-sm'
                  } ${item.pinned ? 'ring-2 ring-amber-500/50' : ''} ${item._optimistic ? 'opacity-60' : ''}`}>

                    {item.pinned && <div className="absolute -top-2 right-2"><ChevronDown size={12} className="text-amber-400" /></div>}
                    {item.editedAt && <span className="text-[9px] opacity-40 block mb-0.5">(edited)</span>}

                    {isEditing ? (
                      <div className="space-y-1.5 min-w-[180px]">
                        <input
                          type="text"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                          className="w-full bg-dark-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500/50"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium">Save</button>
                          <button onClick={cancelEdit} className="text-[11px] text-gray-500 hover:text-gray-300">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {item.type === 'image' && item.media && (
                          <img
                            src={item.media.url}
                            alt="shared"
                            className="rounded-lg max-w-full mb-2 cursor-pointer"
                            onClick={() => window.open(item.media.url, '_blank')}
                          />
                        )}
                        {item.type === 'pdf' && item.media && (
                          <a href={item.media.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-2 text-sm">
                            <FileText size={16} /> {item.media.filename || 'PDF'}
                          </a>
                        )}
                        <div className="whitespace-pre-wrap break-words">{linkify(item.content)}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] opacity-40">{fmt(item.createdAt)}</span>
                          {item._optimistic && <span className="text-[10px] text-gray-500">Sending…</span>}
                          {item.status === 'pending' && !item._optimistic && <span className="text-[10px] text-amber-400 flex items-center gap-0.5"><Clock size={10} /> Pending</span>}
                          {item.status === 'rejected' && <span className="text-[10px] text-red-400 flex items-center gap-0.5"><XCircle size={10} /> Rejected</span>}
                          {item.selfDeleted && <span className="text-[10px] text-gray-500">(deleted)</span>}
                          {item.pinned && <span className="text-[10px] text-amber-400">📌</span>}
                        </div>

                        {showOptionsId === item.id && own && !item._optimistic && (
                          <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-white/10">
                            <button onClick={() => startEdit(item)} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"><Edit3 size={11} /> Edit</button>
                            <button onClick={() => deleteMsg(item.id, false)} className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-0.5"><Trash2 size={11} /> Delete (me)</button>
                            <button onClick={() => deleteMsg(item.id, true)} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-0.5"><XCircle2 size={11} /> Delete (all)</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/5 bg-dark-800/50">
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleMediaUpload} className="hidden" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach image or PDF (max 10MB)"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 border border-white/5 transition-all flex-shrink-0"
          >
            <Paperclip size={16} />
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your doubt..."
            className="flex-1 bg-dark-700/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !socketConnected}
            className="w-10 h-10 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg shadow-primary-500/20 flex-shrink-0"
          >
            {socketConnected ? <Send size={18} className="text-white" /> : <Loader2 size={18} className="text-white animate-spin" />}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1 text-center">Your doubts are answered by admin in real-time</p>
      </div>
    </div>
  )
}
