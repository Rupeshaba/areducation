import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Play, Trophy, TrendingUp,
  ShoppingBag, User, Bell, LogOut, Menu, X, Zap,
  Info, Phone, MessageSquare
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/my-courses', icon: Play, label: 'My Courses' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/store', icon: ShoppingBag, label: 'Store' },
  { to: '/about', icon: Info, label: 'About Us' },
  { to: '/contact', icon: Phone, label: 'Contact' },
]

// ── Badge: count capped at 99+, hidden when 0 ────────────────────────────────
function Badge({ count, position = 'sidebar' }) {
  if (!count || count <= 0) return null
  const label = count > 99 ? '99+' : String(count)
  if (position === 'sidebar') {
    return (
      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
        {label}
      </span>
    )
  }
  // position === 'icon' — absolute bubble on icon
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center leading-none">
      {label}
    </span>
  )
}

// Rich popup notification renderer
function RichNotificationPopup({ notif, onClose }) {
  if (!notif) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="fixed top-4 right-4 z-[999] max-w-sm w-full bg-dark-800 border border-primary-500/30 rounded-2xl shadow-2xl shadow-primary-500/10 overflow-hidden"
    >
      {notif.imageUrl && (
        <img src={notif.imageUrl} alt="" className="w-full h-32 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {notif.title && <div className="font-bold text-white mb-1">{notif.title}</div>}
            {notif.richContent ? (
              <div
                className="text-sm text-gray-300"
                dangerouslySetInnerHTML={{ __html: notif.richContent }}
              />
            ) : (
              <div className="text-sm text-gray-300">{notif.message}</div>
            )}
            {notif.linkUrl && (
              <a
                href={notif.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-primary-400 hover:text-primary-300 underline"
              >
                {notif.linkText || 'Open Link'}
              </a>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white flex-shrink-0 mt-0.5">
            <X size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [popupNotif, setPopupNotif] = useState(null)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const socketRef = useRef(null)

  const isQuizPage = location.pathname.includes('/quiz/') && !location.pathname.includes('/result')

  // Check maintenance on every page load
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        await api.post('/user/heartbeat')
      } catch (e) {
        if (e.response?.status === 503 && e.response?.data?.error === 'maintenance') {
          const msg = e.response.data.message || 'Server is under maintenance.'
          sessionStorage.setItem('maintenanceMessage', msg)
          navigate('/maintenance', { replace: true })
        }
      }
    }
    checkMaintenance()
  }, [])

  // ── Notification unread count ─────────────────────────────────────────────
  const { data: countData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/notifications/count').then(r => r.data),
    refetchInterval: 15000,
    enabled: !isQuizPage,
  })

  // ── Doubt Chat unread count ───────────────────────────────────────────────
  const { data: chatCountData } = useQuery({
    queryKey: ['chat-unread-count'],
    queryFn: () => api.get('/chat/unread-count').then(r => r.data),
    refetchInterval: 15000,
    enabled: !isQuizPage,
  })

  const { data: appConfig } = useQuery({
    queryKey: ['app-config-public'],
    queryFn: () => api.get('/public/logo').then(r => r.data).catch(() => ({})),
    staleTime: 60000,
  })

  const logoUrl = appConfig?.logoUrl

  useEffect(() => {
    if (!user?.uid) return
    const socket = io('/', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect', () => socket.emit('join', { userId: user.uid }))

    socket.on('notification', (notif) => {
      if (notif.richContent || notif.imageUrl || notif.linkUrl) {
        setPopupNotif(notif)
        setTimeout(() => setPopupNotif(null), 10000)
      } else {
        toast(notif.title || 'New notification', { icon: '🔔' })
      }
      qc.invalidateQueries(['notif-count'])
      qc.invalidateQueries(['notifications'])
    })

    // Refresh chat badge when new message arrives via socket
    socket.on('doubt_chat_message', () => {
      qc.invalidateQueries(['chat-unread-count'])
    })

    socket.on('voice_notification', (data) => {
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl)
        audio.play().catch(() => {
          if (data.text && 'speechSynthesis' in window) {
            const utt = new SpeechSynthesisUtterance(data.text)
            utt.lang = 'hi-IN'
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(utt)
          }
        })
      } else if (data.text && 'speechSynthesis' in window) {
        const utt = new SpeechSynthesisUtterance(data.text)
        utt.lang = 'hi-IN'
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utt)
      }
    })

    socket.on('force_logout', async (data) => {
      toast.error(data?.message || 'Your account has been blocked.', { duration: 6000 })
      await logout()
      navigate('/login?blocked=1')
    })

    socket.on('maintenance_mode', (data) => {
      if (data.enabled) {
        toast.error(data.message || 'Server going into maintenance...', { duration: 5000 })
        setTimeout(() => window.location.reload(), 3000)
      }
    })

    const heartbeat = setInterval(() => {
      api.post('/user/heartbeat').catch(() => {})
    }, 60000)

    return () => {
      socket.disconnect()
      socketRef.current = null
      clearInterval(heartbeat)
    }
  }, [user?.uid])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const unreadCount = countData?.count || 0
  const chatUnread = chatCountData?.unreadCount || 0

  return (
    <div className="flex h-screen overflow-hidden bg-dark-900">
      <AnimatePresence>
        {popupNotif && (
          <RichNotificationPopup notif={popupNotif} onClose={() => setPopupNotif(null)} />
        )}
      </AnimatePresence>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── MOBILE SIDEBAR ──────────────────────────────────────────────────── */}
      <aside className={`
        fixed lg:hidden inset-y-0 left-0 z-40 w-64 flex flex-col
        bg-dark-800/95 backdrop-blur-xl border-r border-white/5
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
          )}
          <span className="font-bold text-white text-sm">AR Education</span>
          <button className="ml-auto text-gray-400" onClick={() => setSidebarOpen(false)}><X size={16} /></button>
        </div>

        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-white truncate max-w-[130px]">{user?.name || 'Student'}</div>
              <div className="text-xs text-gray-500 truncate max-w-[130px]">{user?.email}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive ? 'bg-primary-500/15 text-primary-300 border border-primary-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <Icon size={18} />{label}
            </NavLink>
          ))}

          {/* Doubt Chat — sidebar with badge */}
          <NavLink
            to="/doubt-chat"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${isActive ? 'bg-primary-500/15 text-primary-300 border border-primary-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}
            `}
          >
            <MessageSquare size={18} />
            Doubt Chat
            <Badge count={chatUnread} position="sidebar" />
          </NavLink>
        </nav>

        <div className="px-3 pb-4 space-y-1 border-t border-white/5 pt-3">
          {/* Notifications — sidebar with badge */}
          <NavLink to="/notifications" onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${isActive ? 'bg-primary-500/15 text-primary-300' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <Bell size={18} />
            Notifications
            <Badge count={unreadCount} position="sidebar" />
          </NavLink>
          <NavLink to="/profile" onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-primary-500/15 text-primary-300' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <User size={18} />Profile
          </NavLink>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={18} />Logout
          </button>
        </div>
      </aside>

      {/* ── DESKTOP TOP NAVBAR ───────────────────────────────────────────────── */}
      <div className="hidden lg:flex fixed top-0 left-0 right-0 z-30 h-14 bg-dark-800/95 backdrop-blur-xl border-b border-white/5 items-center px-6 gap-2">
        <Link to="/" className="flex items-center gap-2 mr-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
          )}
          <span className="font-bold text-white text-sm hidden xl:block">AR Education</span>
        </Link>

        <nav className="flex items-center gap-1 flex-1">
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${isActive ? 'bg-primary-500/15 text-primary-300' : 'text-gray-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <Icon size={15} />
              <span className="hidden xl:block">{label}</span>
            </NavLink>
          ))}

          {/* Doubt Chat — desktop nav with badge */}
          <NavLink
            to="/doubt-chat"
            className={({ isActive }) => `
              relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${isActive ? 'bg-primary-500/15 text-primary-300' : 'text-gray-400 hover:text-white hover:bg-white/5'}
            `}
          >
            <MessageSquare size={15} />
            <span className="hidden xl:block">Doubt Chat</span>
            <Badge count={chatUnread} position="icon" />
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {/* Bell — desktop with badge */}
          <NavLink to="/notifications" className={({ isActive }) =>
            `relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-primary-500/15 text-primary-300' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
          }>
            <Bell size={15} />
            <Badge count={unreadCount} position="icon" />
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) =>
            `flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all ${isActive ? 'bg-primary-500/15' : 'hover:bg-white/5'}`
          }>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-xs">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-gray-300 text-sm hidden xl:block">{user?.name?.split(' ')[0]}</span>
          </NavLink>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto lg:pt-14">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-dark-900/95 backdrop-blur-xl border-b border-white/5">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white p-1">
            <Menu size={20} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
                <Zap size={13} className="text-white" />
              </div>
            )}
            <span className="font-bold text-white text-sm">AR Education</span>
          </Link>

          {/* Mobile header: Doubt Chat + Bell icons with badges */}
          <div className="flex items-center gap-1">
            <NavLink to="/doubt-chat" className="relative text-gray-400 hover:text-white p-1">
              <MessageSquare size={20} />
              <Badge count={chatUnread} position="icon" />
            </NavLink>
            <NavLink to="/notifications" className="relative text-gray-400 hover:text-white p-1">
              <Bell size={20} />
              <Badge count={unreadCount} position="icon" />
            </NavLink>
          </div>
        </div>

        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
