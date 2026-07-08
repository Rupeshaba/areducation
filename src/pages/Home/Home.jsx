import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Trophy, TrendingUp, Flame, Play, CheckCircle,
  ArrowRight, Clock, Sparkles, ChevronRight, GraduationCap,
  Compass, Zap, MessageSquare, ShoppingBag, User, Bell, Book, History
} from 'lucide-react'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'

/* ═══ MODERN PULSE SHIMMER ═══ */
function Shimmer({ className = '' }) {
  return (
    <div
      className={`rounded-2xl relative overflow-hidden bg-white/[0.03] ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
        }}
      />
    </div>
  )
}

/* ═══ ENHANCED WELCOME HERO ═══ */
function WelcomeHero({ user, isLoading }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] || 'Student'

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Shimmer className="h-4 w-28" />
        <Shimmer className="h-10 w-64" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative pt-2"
    >
      {/* Subtle colorful background radial wash */}
      <div className="absolute -top-10 -left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-0 right-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/[0.04] text-white/50 border border-white/[0.05] flex items-center gap-1.5">
          <Sparkles size={10} className="text-primary-400" />
          {greeting}
        </span>
      </div>
      
      <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight mb-2">
        Hey, <span style={{
          background: 'linear-gradient(135deg, #FF9270 0%, #FF6B4A 50%, #FF85A2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>{firstName}</span> <span className="inline-block origin-[70%_70%] animate-wave">👋</span>
      </h1>
      <p className="text-xs text-white/50 font-medium max-w-md">
        Welcome back to your dashboard. Ready to conquer your learning goals today?
      </p>
    </motion.div>
  )
}

/* ═══ QUICK ACTION CARD ═══ */
function QuickActionCard({ to, icon: Icon, label, description, accent, delay, thumbnailUrl }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={to} className="block group">
        <div
          className="rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden aspect-square"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {/* Hover glow effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: `radial-gradient(circle at center, ${accent}15 0%, transparent 70%)` }} />
          
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={label} className="w-12 h-12 rounded-xl object-cover mb-2" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
              style={{ background: `${accent}12`, border: `1px solid ${accent}25` }}>
              <Icon size={22} style={{ color: accent }} />
            </div>
          )}
          
          <h3 className="text-xs font-bold text-white/90 mb-1">{label}</h3>
          <p className="text-[9px] text-white/40">{description}</p>
          
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mt-2 transition-all duration-300 group-hover:translate-x-0.5"
            style={{ background: `${accent}10`, border: `1px solid ${accent}20` }}>
            <ArrowRight size={12} style={{ color: accent }} />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// Icon mapping for dynamic cards
const iconMap = {
  BookOpen,
  Book,
  GraduationCap,
  ShoppingBag,
  MessageSquare,
}

/* ═══ WATCH HISTORY CARD ═══ */
function WatchHistoryCard({ item, index }) {
  const itemUrl = item.courseId && item.subjectId && item.contentId
    ? `/courses/${item.courseId}/subjects/${item.subjectId}/content/${item.contentId}`
    : item.courseId && item.subjectId
    ? `/courses/${item.courseId}/subjects/${item.subjectId}`
    : '#'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
      className="min-w-[160px] w-[160px] flex-shrink-0"
    >
      <Link to={itemUrl} className="block group">
        <div className="rounded-2xl overflow-hidden transition-all duration-300 relative aspect-square"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 107, 74, 0.08) 0%, rgba(255, 107, 74, 0.02) 100%)',
            border: '1px solid rgba(255, 107, 74, 0.18)',
          }}
        >
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #10142A 0%, #151932 100%)' }}>
              <Play size={24} className="text-primary-400" />
            </div>
          )}
          
          {/* Text overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-xs font-bold text-white text-center line-clamp-1">
              {item.title || 'Untitled Lesson'}
            </p>
            <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded inline-block mt-0.5"
              style={{
                background: item.type === 'pdf' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 107, 74, 0.8)',
                color: 'white',
              }}>
              {item.type === 'pdf' ? 'PDF' : 'Video'}
            </span>
          </div>
          
          {/* Play overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <Play size={14} fill="white" color="white" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ═══ MAIN HOME VIEW ═══ */
export default function Home() {
  const user = useAuthStore(s => s.user)
  const [recentlyWatched, setRecentlyWatched] = useState([])

  // Load recently watched items from localStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ar_recently_watched') || '[]')
      setRecentlyWatched(stored)
    } catch (e) {
      console.error('Error loading recently watched:', e)
    }
  }, [])

  const { data: pointsData, isLoading: pointsLoading } = useQuery({
    queryKey: ['my-points'],
    queryFn: () => api.get('/my-points').then(r => r.data),
  })

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['user-progress'],
    queryFn: () => api.get('/user/progress').then(r => r.data),
  })

  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/store/my-purchases').then(r => r.data),
  })

  const points = pointsData?.points || {}
  const progress = progressData?.progress || {}
  const purchases = purchasesData?.purchases || []

  const lastContentId = progress.lastContentId
  const lastSubjectId = progress.lastContentSubjectId
  const lastCourseId = progress.lastContentCourseId

  const { data: lastContentData, isLoading: contentLoading } = useQuery({
    queryKey: ['last-content-detail', lastContentId],
    queryFn: () =>
      api.get(`/content/${lastContentId}${lastSubjectId ? `?subjectId=${lastSubjectId}` : ''}`).then(r => r.data),
    enabled: !!lastContentId && recentlyWatched.length === 0,
    staleTime: 60000,
  })

  const lastContent = lastContentData?.content

  const continueUrl =
    lastContentId && lastCourseId && lastSubjectId
      ? `/courses/${lastCourseId}/subjects/${lastSubjectId}/content/${lastContentId}`
      : lastSubjectId && lastCourseId
      ? `/courses/${lastCourseId}/subjects/${lastSubjectId}`
      : null

  const isLoading = pointsLoading || progressLoading || purchasesLoading

  // Static cards with thumbnail support
  const staticCards = [
    { to: '/free-courses', icon: BookOpen, label: 'Free Courses', description: 'Start learning free', accent: '#10B981', delay: 0.12 },
    { to: '/books', icon: Book, label: 'Books', description: 'Read PDFs', accent: '#6366F1', delay: 0.18 },
    { to: '/store', icon: ShoppingBag, label: 'Store', description: 'Premium courses', accent: '#FF6B4A', delay: 0.24 },
  ]

  // Progress card data
  const progressPercent = progress.percent || 0
  const progressCard = {
    to: '/progress',
    icon: TrendingUp,
    label: 'Progress',
    description: `${progressPercent}% Complete`,
    accent: '#10B981',
    delay: 0.36,
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">

      {/* ── CLEAN WELCOME HERO ── */}
      <WelcomeHero user={user} isLoading={isLoading} />

      {/* ── QUICK ACTION CARDS ── */}
      <div className="grid grid-cols-2 gap-3">
        {staticCards.map((card, i) => (
          <QuickActionCard key={i} {...card} />
        ))}
        <QuickActionCard {...progressCard} />
      </div>

      {/* ── WATCH HISTORY SECTION ── */}
      {recentlyWatched.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
              <History size={12} className="text-primary-400" />
              Recent ({recentlyWatched.length})
            </h3>
            <Link to="/watch-history"
              className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors">
              See All
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {recentlyWatched.slice(0, 4).map((item, idx) => (
              <WatchHistoryCard key={item.contentId || idx} item={item} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Inline styles for custom wave animation and shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes wave {
          0% { transform: rotate( 0.0deg) }
          10% { transform: rotate(14.0deg) }
          20% { transform: rotate(-8.0deg) }
          30% { transform: rotate(14.0deg) }
          40% { transform: rotate(-4.0deg) }
          50% { transform: rotate(10.0deg) }
          60% { transform: rotate( 0.0deg) }
          100% { transform: rotate( 0.0deg) }
        }
        .animate-wave {
          animation: wave 2.5s infinite;
          transform-origin: 70% 70%;
        }
      `}</style>
    </div>
  )
}

