import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Play, TrendingUp,
  ShoppingBag, User, Bell, LogOut, Menu, X, Zap,
  Info, Phone, MessageSquare
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { getDeviceId } from '../utils/deviceId'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { APP_LOGO_URL } from '../constants/branding'
import { subscribeToPush, isPushSupported, getPushPermissionState } from '../utils/pushNotifications'

const NAV = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/my-courses', icon: Play, label: 'My Courses' },
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
const POLL_QUERY_CONFIG = {
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  retry: (failureCount, error) => {
    if (error?.response?.status === 403 || error?.response?.status === 503) {
      return false
    }
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
  return (
    <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center leading-none ring-2 ring-white">
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
      className="fixed top-4 right-4 z-[999] max-w-sm w-full bg-white border border-primary-500/30 rounded-2xl shadow-2xl shadow-primary-500/10 overflow-hidden"
    >
      {notif.imageUrl && (
        <img src={notif.imageUrl} alt="" className="w-full h-32 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {notif.title && <div className="font-bold text-gray-900 mb-1">{notif.title}</div>}
            {notif.richContent ? (
              <div
                className="text-sm text-gray-600"
                dangerouslySetInnerHTML={{ __html: notif.richContent }}
              />
            ) : (
              <div className="text-sm text-gray-600">{notif.message}</div>
            )}
            {notif.linkUrl && (
              <a
                href={notif.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-primary-600 hover:text-primary-700 underline"
              >
                {notif.linkText || 'Open Link'}
              </a>
            )}
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 flex-shrink-0 mt-0.5">
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

  // ⭐ UPDATED LOGIC TO HIDE NAV FOR RESULT PAGE AS WELL ⭐
  const isQuizPage = location.pathname.includes('/quiz/') && !location.pathname.includes('/result')
  const isQuizPlayPage = location.pathname.includes('/quiz/') && location.pathname.includes('/play')
  const isQuizResultPage = location.pathname.includes('/result')
  const hideSidebar = isQuizPlayPage || isQuizResultPage

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
    ...POLL_QUERY_CONFIG,
  })

  // ── Doubt Chat unread count ───────────────────────────────────────────────
  const { data: chatCountData } = useQuery({
    queryKey: ['chat-unread-count'],
    queryFn: () => api.get('/chat/unread-count').then(r => r.data),
    refetchInterval: 15000,
    enabled: !isQuizPage,
    ...POLL_QUERY_CONFIG,
  })

  const { data: appConfig } = useQuery({
    queryKey: ['app-config-public'],
    queryFn: () => api.get('/public/logo').then(r => r.data).catch(() => ({})),
    staleTime: 60000,
  })

  const logoUrl = appConfig?.logoUrl || APP_LOGO_URL

  // ── Push notifications ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return

    if (!isPushSupported()) {
      console.warn(
        '[Push] Not supported in this context.',
        { protocol: window.location.protocol, hasSW: 'serviceWorker' in navigator, hasPush: 'PushManager' in window }
      )
      return
    }

    const currentPermission = getPushPermissionState()

    if (currentPermission === 'denied') {
      console.warn('[Push] Permission denied by user/browser')
      return
    }

    const timer = setTimeout(() => {
      subscribeToPush(api, getDeviceId()).then((res) => {
        if (res.ok) {
          if (currentPermission === 'default') toast.success('Push notifications enabled')
        } else {
          console.warn('[Push] subscribeToPush failed:', res.reason)
        }
      })
    }, currentPermission === 'granted' ? 500 : 2000)

    return () => clearTimeout(timer)
  }, [user?.uid])

  // ── WebSocket ──────────────────────────────────────────────────────────────
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

    socket.on('connect', () => socket.emit('join', { userId: user.uid, deviceId: getDeviceId() }))

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
    <div className="flex h-screen overflow-hidden bg-[#F7F8FC]">
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
          bg-white border-r border-slate-200
          transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Header block with gradient wash */}
          <div className="relative px-5 pt-6 pb-5 overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(99,102,241,0.14) 0%, transparent 70%)' }} />
            <div className="relative flex items-center justify-between mb-5">
              <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-900 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-500/10 flex items-center justify-center text-white p-0.5">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <Zap size={16} className="text-indigo-400" fill="currentColor" />
                  )}
                </div>
                <span className="font-black text-slate-900 text-[15px] tracking-tight">
                  AR <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Education</span>
                </span>
              </Link>
              <button className="text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100" onClick={() => setSidebarOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="relative flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-500/30" />
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-600">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{user?.name || 'Student'}</div>
                <div className="text-xs text-slate-500 truncate max-w-[150px]">{user?.email}</div>
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
                  relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-bold transition-all
                  ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-indigo-600" />}
                    <Icon size={17} className={isActive ? 'text-indigo-600' : ''} />
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
                relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-bold transition-all
                ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-indigo-600" />}
                  <MessageSquare size={17} className={isActive ? 'text-indigo-600' : ''} />
                  Doubt Chat
                  <Badge count={chatUnread} position="sidebar" />
                </>
              )}
            </NavLink>
          </nav>

          <div className="px-3 pb-5 space-y-0.5 border-t border-slate-200 pt-3">
            <NavLink to="/notifications" onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-bold transition-all relative ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
              <Bell size={17} />
              Notifications
              <Badge count={unreadCount} position="sidebar" />
            </NavLink>
            <NavLink to="/profile" onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
              <User size={17} />Profile
            </NavLink>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all">
              <LogOut size={17} />Logout
            </button>
          </div>
        </aside>
      )}

      {/* ── DESKTOP PERMANENT SIDEBAR ────────────────────────────────────────── */}
      {!hideSidebar && (
        <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[248px] flex-col
          bg-white/85 backdrop-blur-2xl border-r border-slate-200/60">
          <Link to="/" className="flex items-center gap-3 px-5 h-20 border-b border-slate-200/60">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-900 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-500/10 flex items-center justify-center text-white p-0.5">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
              ) : (
                <Zap size={16} className="text-indigo-400" fill="currentColor" />
              )}
            </div>
            <span className="font-black text-slate-900 text-[15px] tracking-tight">
              AR <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Education</span>
            </span>
          </Link>

          <nav className="flex-1 overflow-y-auto px-3.5 py-5 space-y-1">
            <p className="eyebrow px-2.5 pb-2">Menu</p>
            {NAV.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) => `
                  relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                  ${isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span layoutId="sidebar-nav-pill" className="absolute inset-0 rounded-xl -z-10 shadow-lg shadow-indigo-500/25
                        bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700"
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
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                ${isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="sidebar-nav-pill" className="absolute inset-0 rounded-xl -z-10 shadow-lg shadow-indigo-500/25
                      bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700"
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
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                ${isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="sidebar-nav-pill" className="absolute inset-0 rounded-xl -z-10 shadow-lg shadow-indigo-500/25
                      bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700"
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
          <div className="p-3.5 border-t border-slate-200/60 space-y-1">
            <NavLink to="/profile" className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all ${isActive ? 'bg-slate-100' : 'hover:bg-slate-100'}`
            }>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-600">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-slate-800 text-sm font-bold truncate">{user?.name?.split(' ')[0] || 'Student'}</p>
                <p className="text-slate-500 text-[11px] truncate">View profile</p>
              </div>
            </NavLink>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all">
              <LogOut size={16} />Logout
            </button>
          </div>
        </aside>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className={`flex-1 overflow-y-auto ${hideSidebar ? '' : 'lg:ml-[248px]'}`}>
        {/* Mobile header */}
        {!hideSidebar && (
          <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-16
            bg-white/85 backdrop-blur-2xl border-b border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-600 hover:text-slate-900 p-2 -ml-2 rounded-xl hover:bg-slate-100">
              <Menu size={20} />
            </button>
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-900 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-500/10 flex items-center justify-center text-white flex-shrink-0 p-0.5">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Zap size={15} className="text-indigo-400" fill="currentColor" />
                )}
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-black text-sm tracking-tight text-slate-900">
                  AR{' '}
                  <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    Education
                  </span>
                </span>
                <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              </div>
            </Link>

            {/* Mobile header: Doubt Chat + Bell icons with badges */}
            <div className="flex items-center gap-1">
              <NavLink to="/doubt-chat" className="relative text-slate-600 hover:text-indigo-600 p-2 rounded-xl hover:bg-slate-100">
                <MessageSquare size={19} />
                <Badge count={chatUnread} position="icon" />
              </NavLink>
              <NavLink to="/notifications" className="relative text-slate-600 hover:text-indigo-600 p-2 rounded-xl hover:bg-slate-100">
                <Bell size={19} />
                <Badge count={unreadCount} position="icon" />
              </NavLink>
            </div>
          </div>
        )}

        {/* 
           ⭐ Updated container logic: 
           If hideSidebar is true (Result page), we remove all horizontal padding 
           and width constraints so the UI takes up the full screen perfectly.
        */}
        <div className={`p-4 lg:p-8 pb-28 lg:pb-8 max-w-5xl mx-auto ${hideSidebar ? '!p-0 !max-w-full' : ''}`}>
          <Outlet />
        </div>
      </main>

      {/* ── MOBILE BOTTOM TAB BAR (floating pill, Rupesh Store style) ───────── */}
      {!hideSidebar && (
        <div className="lg:hidden fixed bottom-5 inset-x-0 z-30 flex justify-center px-4 pointer-events-none"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
          <nav className="pointer-events-auto bg-white/85 backdrop-blur-2xl border border-slate-200/90
            shadow-[0_14px_40px_rgba(0,0,0,0.14)] rounded-full p-1.5 flex items-center gap-0.5 max-w-full overflow-x-auto no-scrollbar">
            {BOTTOM_NAV.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className="relative flex items-center gap-1.5 px-3.5 py-2.5 rounded-full transition-colors duration-200 font-bold text-[11px] select-none"
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeFloatingPill"
                        className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 rounded-full shadow-lg shadow-indigo-500/35"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 ${isActive ? 'text-white' : 'text-slate-600'}`}>
                      <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
                      <span className="tracking-wide">{label}</span>
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}
