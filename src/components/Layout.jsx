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

// Mobile bottom tab bar — 5 highest-intent destinations only
const BOTTOM_NAV = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/my-courses', icon: Play, label: 'Courses' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/store', icon: ShoppingBag, label: 'Store' },
  { to: '/profile', icon: User, label: 'Profile' },
]

// ── FIX: Query config for polling queries (notif-count, chat-unread-count)
// Don't retry on 403 (blocked) or 503 (maintenance) — these are terminal states
// For other errors, retry max 2 times with exponential backoff
const POLL_QUERY_CONFIG = {
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  retry: (failureCount, error) => {
    // Terminal states: 403 = blocked, 503 = maintenance
    if (error?.response?.status === 403 || error?.response?.status === 503) {
      return false  // Don't retry — let axios interceptor handle redirect
    }
    // Other errors (network, 500): retry with backoff (max 2 times)
    return failureCount < 2
  }
}

// ── Badge: count capped at 99+, hidden when 0 ────────────────────────────────
function Badge({ count, position = 'sidebar' }) {
  if (!count || count <= 0) return null
  const label = count > 99 ? '99+' : String(count)
  if (position === 'sidebar') {
    return (
      <span className="ml-auto bg-danger-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
        {label}
      </span>
    )
  }
  // position === 'icon' — absolute bubble on icon
  return (
    <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center leading-none ring-2 ring-dark-900">
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
  const isQuizPlayPage = location.pathname.includes('/quiz/') && location.pathname.includes('/play')
  const hideSidebar = isQuizPlayPage

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
  // FIX: Added POLL_QUERY_CONFIG to stop retrying on 403/503 errors
  const { data: countData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/notifications/count').then(r => r.data),
    refetchInterval: 15000,
    enabled: !isQuizPage,
    ...POLL_QUERY_CONFIG,  // Apply the fix
  })

  // ── Doubt Chat unread count ───────────────────────────────────────────────
  // FIX: Added POLL_QUERY_CONFIG to stop retrying on 403/503 errors
  const { data: chatCountData } = useQuery({
    queryKey: ['chat-unread-count'],
    queryFn: () => api.get('/chat/unread-count').then(r => r.data),
    refetchInterval: 15000,
    enabled: !isQuizPage,
    ...POLL_QUERY_CONFIG,  // Apply the fix
  })

  const { data: appConfig } = useQuery({
    queryKey: ['app-config-public'],
    queryFn: () => api.get('/public/logo').then(r => r.data).catch(() => ({})),
    staleTime: 60000,
  })

  const logoUrl = appConfig?.logoUrl

  useEffect(() => {
    if (!user?.uid) return
    const SOCKET_URL = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : '/'
    const socket = io(SOCKET_URL, {
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── MOBILE SIDEBAR (More menu) ──────────────────────────────────────── */}
      {!hideSidebar && (
        <aside className={`
          fixed lg:hidden inset-y-0 left-0 z-40 w-72 flex flex-col
          bg-dark-800 border-r border-white/[0.06]
          transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Header block with gradient wash */}
          <div className="relative px-5 pt-6 pb-5 overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,107,74,0.22) 0%, transparent 70%)' }} />
            <div className="relative flex items-center justify-between mb-5">
              <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30"
                    style={{ background: 'linear-gradient(135deg, #FF9270 0%, #FF6B4A 60%, #C23F1F 100%)' }}>
                    <Zap size={17} className="text-white" fill="white" />
                  </div>
                )}
                <span className="font-bold text-white text-[15px] tracking-tight">AR Education</span>
              </Link>
              <button className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5" onClick={() => setSidebarOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="relative flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-primary-500/30" />
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base"
                  style={{ background: 'linear-gradient(135deg, #FF9270, #FF6B4A)' }}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate max-w-[150px]">{user?.name || 'Student'}</div>
                <div className="text-xs text-gray-500 truncate max-w-[150px]">{user?.email}</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
            <p className="eyebrow px-3 pt-2 pb-1.5">Menu</p>
            {NAV.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive ? 'bg-primary-500/12 text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary-400" />}
                    <Icon size={17} className={isActive ? 'text-primary-400' : ''} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}

            {/* Doubt Chat — sidebar with badge */}
            <NavLink
              to="/doubt-chat"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive ? 'bg-primary-500/12 text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary-400" />}
                  <MessageSquare size={17} className={isActive ? 'text-primary-400' : ''} />
                  Doubt Chat
                  <Badge count={chatUnread} position="sidebar" />
                </>
              )}
            </NavLink>
          </nav>

          <div className="px-3 pb-5 space-y-0.5 border-t border-white/[0.06] pt-3">
            <NavLink to="/notifications" onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${isActive ? 'bg-primary-500/12 text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}>
              <Bell size={17} />
              Notifications
              <Badge count={unreadCount} position="sidebar" />
            </NavLink>
            <NavLink to="/profile" onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-primary-500/12 text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}>
              <User size={17} />Profile
            </NavLink>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-medium text-danger-400 hover:bg-danger-500/10 transition-all">
              <LogOut size={17} />Logout
            </button>
          </div>
        </aside>
      )}

      {/* ── DESKTOP PERMANENT SIDEBAR ────────────────────────────────────────── */}
      {!hideSidebar && (
        <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[248px] flex-col
          bg-dark-800/70 backdrop-blur-2xl border-r border-white/[0.06]">
          <Link to="/" className="flex items-center gap-3 px-5 h-20 border-b border-white/[0.06]">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30"
                style={{ background: 'linear-gradient(135deg, #FF9270 0%, #FF6B4A 60%, #C23F1F 100%)' }}>
                <Zap size={17} className="text-white" fill="white" />
              </div>
            )}
            <span className="font-bold text-white text-[15px] tracking-tight">AR Education</span>
          </Link>

          <nav className="flex-1 overflow-y-auto px-3.5 py-5 space-y-1">
            <p className="eyebrow px-2.5 pb-2">Menu</p>
            {NAV.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) => `
                  relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'}
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span layoutId="sidebar-nav-pill" className="absolute inset-0 rounded-xl -z-10 shadow-lg shadow-primary-500/25"
                        style={{ background: 'linear-gradient(135deg, #FF6B4A, #E8532F)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                    )}
                    <Icon size={17} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}

            <NavLink
              to="/doubt-chat"
              className={({ isActive }) => `
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'}
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="sidebar-nav-pill" className="absolute inset-0 rounded-xl -z-10 shadow-lg shadow-primary-500/25"
                      style={{ background: 'linear-gradient(135deg, #FF6B4A, #E8532F)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                  )}
                  <MessageSquare size={17} />
                  Doubt Chat
                  <Badge count={chatUnread} position="sidebar" />
                </>
              )}
            </NavLink>

            <NavLink
              to="/notifications"
              className={({ isActive }) => `
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'}
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="sidebar-nav-pill" className="absolute inset-0 rounded-xl -z-10 shadow-lg shadow-primary-500/25"
                      style={{ background: 'linear-gradient(135deg, #FF6B4A, #E8532F)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                  )}
                  <Bell size={17} />
                  Notifications
                  <Badge count={unreadCount} position="sidebar" />
                </>
              )}
            </NavLink>
          </nav>

          {/* Bottom: profile + logout */}
          <div className="p-3.5 border-t border-white/[0.06] space-y-1">
            <NavLink to="/profile" className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all ${isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}`
            }>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FF9270, #FF6B4A)' }}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-gray-200 text-sm font-medium truncate">{user?.name?.split(' ')[0] || 'Student'}</p>
                <p className="text-gray-500 text-[11px] truncate">View profile</p>
              </div>
            </NavLink>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium text-danger-400 hover:bg-danger-500/10 transition-all">
              <LogOut size={16} />Logout
            </button>
          </div>
        </aside>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className={`flex-1 overflow-y-auto ${hideSidebar ? '' : 'lg:ml-[248px]'}`}>
        {/* Mobile header */}
        {!hideSidebar && (
          <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-16 rounded-b-2xl
            bg-dark-800/90 backdrop-blur-2xl border-b border-white/[0.06] shadow-lg shadow-black/20">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Menu size={20} />
            </button>
            <Link to="/" className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-xl object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/30"
                  style={{ background: 'linear-gradient(135deg, #FF9270 0%, #FF6B4A 60%, #C23F1F 100%)' }}>
                  <Zap size={15} className="text-white" fill="white" />
                </div>
              )}
              <span className="font-bold text-white text-sm tracking-tight">AR Education</span>
            </Link>

            {/* Mobile header: Doubt Chat + Bell icons with badges */}
            <div className="flex items-center gap-1">
              <NavLink to="/doubt-chat" className="relative text-gray-300 hover:text-white p-2 rounded-xl hover:bg-white/5">
                <MessageSquare size={19} />
                <Badge count={chatUnread} position="icon" />
              </NavLink>
              <NavLink to="/notifications" className="relative text-gray-300 hover:text-white p-2 rounded-xl hover:bg-white/5">
                <Bell size={19} />
                <Badge count={unreadCount} position="icon" />
              </NavLink>
            </div>
          </div>
        )}

        <div className={`p-4 lg:p-8 pb-28 lg:pb-8 max-w-5xl mx-auto ${hideSidebar ? 'p-0 lg:p-0 max-w-full' : ''}`}>
          <Outlet />
        </div>
      </main>

      {/* ── MOBILE BOTTOM TAB BAR (edge-to-edge, rounded top only) ──────────── */}
      {!hideSidebar && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch justify-around
          rounded-t-[28px] bg-dark-800/95 backdrop-blur-2xl border-t border-x border-white/[0.08] shadow-2xl shadow-black/40 pt-2 px-2"
          style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
          {BOTTOM_NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-semibold transition-all duration-300"
            >
              {({ isActive }) => (
                <>
                  <div className={`flex items-center justify-center w-11 h-8 rounded-2xl transition-all duration-300
                    ${isActive ? 'bg-primary-500/15' : ''}`}>
                    <Icon size={18} className={isActive ? 'text-primary-400' : 'text-gray-500'} strokeWidth={isActive ? 2.4 : 2} />
                  </div>
                  <span className={isActive ? 'text-primary-400' : 'text-gray-500'}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
