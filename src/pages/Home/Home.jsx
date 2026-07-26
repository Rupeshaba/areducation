import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Trophy, TrendingUp, Flame, Play, CheckCircle,
  ArrowRight, Clock, Sparkles, ChevronRight, GraduationCap,
  Compass, Zap, MessageSquare, ShoppingBag, User, Bell, Book, History,
  FileText, Brain, RotateCcw
} from 'lucide-react'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { useCoursesProgress } from '../../hooks/useCoursesProgress'
import CardThumbnail from '../../components/CardThumbnail'
import { DEFAULT_THUMBNAILS, APP_LOGO_URL } from '../../constants/branding'
import { getRecentQuizzes } from '../../utils/quizCache'

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
          className="rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden aspect-square"
          style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          {/* Thumbnail fills the entire card */}
          {thumbnailUrl && (
            <img src={thumbnailUrl} alt={label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          )}
          {/* Gradient + hover glow so the text stays readable over the image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: `radial-gradient(circle at center, ${accent}15 0%, transparent 70%)` }} />

          {/* Text pinned to the bottom, over the image */}
          <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-white mb-0.5 drop-shadow-md truncate">{label}</h3>
              <p className="text-[9px] text-white/60 truncate">{description}</p>
            </div>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:translate-x-0.5 backdrop-blur-sm"
              style={{ background: `${accent}25`, border: `1px solid ${accent}40` }}>
              <ArrowRight size={12} style={{ color: accent }} />
            </div>
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

/* ═══ LOGO FALLBACK (shown when a card has no real thumbnail) ═══ */
function LogoFallback({ className = '' }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${className}`}
      style={{ background: 'linear-gradient(135deg, #10142A 0%, #151932 100%)' }}>
      <img src={APP_LOGO_URL} alt="" className="w-1/2 h-1/2 object-contain opacity-40" />
    </div>
  )
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
          {/* Thumbnail fills the entire card */}
          <CardThumbnail
            item={item}
            alt={item.title}
            fallback={<LogoFallback />}
          />
          
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

/* ═══ HORIZONTAL SCROLL ROW (no visible scrollbar) ═══ */
function ScrollRow({ icon: Icon, title, count, seeAllTo, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
          <Icon size={12} className="text-primary-400" />
          {title} {count > 0 && `(${count})`}
        </h3>
        {seeAllTo && (
          <Link to={seeAllTo}
            className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors">
            See All
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollSnapType: 'x proximity' }}>
        {children}
      </div>
    </div>
  )
}

/* ═══ QUIZ HISTORY CARD (recent activity → latest attempt for that quiz) ═══ */
function QuizHistoryCard({ entry, index }) {
  const latest = entry.attempts[0]
  const attemptsCount = entry.attempts.length
  const score = Math.round(latest.score)
  const scoreColor = score >= 75 ? '#2DD4BF' : score >= 50 ? '#FFB020' : '#FF5C5C'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
      className="min-w-[160px] w-[160px] flex-shrink-0"
      style={{ scrollSnapAlign: 'start' }}
    >
      <Link to={`/quiz/result/${latest.attemptId}`} className="block group">
        <div className="rounded-2xl overflow-hidden transition-all duration-300 relative aspect-square flex flex-col justify-between p-3"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.14) 0%, rgba(139, 92, 246, 0.03) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
          }}
        >
          {/* Logo watermark — quizzes have no real thumbnail */}
          <img src={APP_LOGO_URL} alt="" className="absolute inset-0 m-auto w-1/2 h-1/2 object-contain opacity-[0.08] pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Brain size={15} className="text-violet-300" />
            </div>
            <div className="text-right">
              <div className="text-lg font-black" style={{ color: scoreColor }}>{score}%</div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-white line-clamp-2 leading-snug mb-1">
              {entry.quizName}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/25 text-violet-200">
                {attemptsCount} attempt{attemptsCount > 1 ? 's' : ''}
              </span>
              <RotateCcw size={11} className="text-white/30 group-hover:text-violet-300 transition-colors" />
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
  const [recentQuizzes, setRecentQuizzes] = useState([])

  // Load recently watched items + quiz attempt history from localStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ar_recently_watched') || '[]')
      setRecentlyWatched(stored)
    } catch (e) {
      console.error('Error loading recently watched:', e)
    }
    try {
      setRecentQuizzes(getRecentQuizzes(20))
    } catch (e) {
      console.error('Error loading quiz history:', e)
    }
  }, [])

  const classItems = recentlyWatched.filter(item => item.type !== 'pdf')
  const notesItems = recentlyWatched.filter(item => item.type === 'pdf')

  const { data: pointsData, isLoading: pointsLoading } = useQuery({
    queryKey: ['my-points'],
    queryFn: () => api.get('/my-points').then(r => r.data),
  })

  const { data: lastWatchedData } = useQuery({
    queryKey: ['user-last-watched'],
    queryFn: () => api.get('/user/progress').then(r => r.data),
  })

  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/store/my-purchases').then(r => r.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const points = pointsData?.points || {}
  const lastWatched = lastWatchedData?.progress || {}
  const purchases = purchasesData?.purchases || []

  // Overall "% complete" — computed locally from cached subject structure +
  // local completion state, same source every page in the app agrees on.
  const courseIds = purchases.map(p => p.courseId).filter(Boolean)
  const { overall } = useCoursesProgress(courseIds)

  const lastContentId = lastWatched.lastContentId
  const lastSubjectId = lastWatched.lastContentSubjectId
  const lastCourseId = lastWatched.lastContentCourseId

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

  const isLoading = pointsLoading || purchasesLoading

  // Static cards with thumbnail support
  const staticCards = [
    { to: '/free-courses', icon: BookOpen, label: 'Free Courses', description: 'Start learning free', accent: '#10B981', delay: 0.12, thumbnailUrl: DEFAULT_THUMBNAILS.freeCourses },
    { to: '/books', icon: Book, label: 'Books', description: 'Read PDFs', accent: '#6366F1', delay: 0.18, thumbnailUrl: DEFAULT_THUMBNAILS.books },
    { to: '/store', icon: ShoppingBag, label: 'Store', description: 'Premium courses', accent: '#FF6B4A', delay: 0.24, thumbnailUrl: DEFAULT_THUMBNAILS.store },
  ]

  // Progress card data
  const progressPercent = overall.total > 0 ? Math.round((overall.completed / overall.total) * 100) : 0
  const progressCard = {
    to: '/progress',
    icon: TrendingUp,
    label: 'Progress',
    description: `${progressPercent}% Complete`,
    accent: '#10B981',
    delay: 0.36,
    thumbnailUrl: DEFAULT_THUMBNAILS.progress,
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

      {/* ── CLASS (recent videos) ── */}
      {classItems.length > 0 && (
        <ScrollRow icon={History} title="Class" count={classItems.length} seeAllTo="/watch-history">
          {classItems.map((item, idx) => (
            <WatchHistoryCard key={item.contentId || idx} item={item} index={idx} />
          ))}
        </ScrollRow>
      )}

      {/* ── NOTES (recent PDFs) ── */}
      {notesItems.length > 0 && (
        <ScrollRow icon={FileText} title="Notes" count={notesItems.length} seeAllTo="/watch-history">
          {notesItems.map((item, idx) => (
            <WatchHistoryCard key={item.contentId || idx} item={item} index={idx} />
          ))}
        </ScrollRow>
      )}

      {/* ── QUIZ (recent attempts, one card per quiz — latest attempt shown) ── */}
      {recentQuizzes.length > 0 && (
        <ScrollRow icon={Brain} title="Quiz" count={recentQuizzes.length}>
          {recentQuizzes.map((entry, idx) => (
            <QuizHistoryCard key={`${entry.subject}::${entry.quizName}`} entry={entry} index={idx} />
          ))}
        </ScrollRow>
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
