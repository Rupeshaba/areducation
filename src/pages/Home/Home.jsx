import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Trophy, TrendingUp, Flame, Play, ArrowRight,
  Sparkles, GraduationCap, MessageSquare, ShoppingBag, Book, History,
  FileText, Brain, RotateCcw, Zap, ChevronRight,
} from 'lucide-react'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { useCoursesProgress } from '../../hooks/useCoursesProgress'
import CardThumbnail from '../../components/CardThumbnail'
import { APP_LOGO_URL } from '../../constants/branding'
import { getRecentQuizzes } from '../../utils/quizCache'

/* ═══════════════════════════════════════════════════════════════════════
   AR Education — Home
   Built around the app's "Indigo Aurora" system: indigo primary with
   mint + amber accents over a deep, softly-lit dark canvas.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Shimmer placeholder ─────────────────────────────────────────────── */
function Shimmer({ className = '' }) {
  return (
    <div className={`rounded-2xl relative overflow-hidden bg-white/[0.04] ${className}`}>
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }}
      />
    </div>
  )
}

/* ── Brand logo fallback (for thumbnails that fail to load) ──────────── */
function LogoFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-dark-700">
      <img src={APP_LOGO_URL} alt="" className="w-1/3 h-1/3 object-contain opacity-25 grayscale" />
    </div>
  )
}

/* ── Hero banner slider ───────────────────────────────────────────────
   Pulls admin-managed banners from GET /api/banners. Auto-plays, supports
   swipe/drag, and stays invisible if there are no active banners so it
   never leaves an empty gap. */
function HeroSlider() {
  const { data, isLoading } = useQuery({
    queryKey: ['home-banners'],
    queryFn: () => api.get('/banners').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const banners = data?.banners || []
  const [index, setIndex] = useState(0)
  const timerRef = useRef(null)

  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current) }

  useEffect(() => {
    if (banners.length <= 1) return
    clearTimer()
    timerRef.current = setInterval(() => {
      setIndex(i => (i + 1) % banners.length)
    }, 4500)
    return clearTimer
  }, [banners.length])

  const goTo = (i) => {
    clearTimer()
    setIndex(((i % banners.length) + banners.length) % banners.length)
  }

  const handleDragEnd = (_, info) => {
    const threshold = 45
    if (info.offset.x < -threshold) goTo(index + 1)
    else if (info.offset.x > threshold) goTo(index - 1)
  }

  if (isLoading) return <Shimmer className="w-full aspect-[16/8] rounded-3xl" />
  if (banners.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full aspect-[16/8] rounded-3xl overflow-hidden border border-white/[0.07] bg-dark-700"
    >
      <motion.div
        className="flex h-full cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        animate={{ x: `-${index * 100}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      >
        {banners.map((banner) => {
          const inner = (
            <img
              src={banner.imageUrl}
              alt={banner.title || ''}
              className="w-full h-full object-cover pointer-events-none select-none"
              draggable={false}
            />
          )
          return (
            <div key={banner.id} className="relative w-full h-full flex-shrink-0">
              {banner.linkType === 'internal' && banner.linkUrl ? (
                <Link to={banner.linkUrl} className="block w-full h-full">{inner}</Link>
              ) : banner.linkType === 'external' && banner.linkUrl ? (
                <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">{inner}</a>
              ) : inner}
              {banner.title && (
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-xs sm:text-sm font-bold text-white drop-shadow-md">{banner.title}</p>
                </div>
              )}
            </div>
          )
        })}
      </motion.div>

      {banners.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 18 : 6,
                background: i === index ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

/* ── Circular progress ring ───────────────────────────────────────────── */
function ProgressRing({ percent }) {
  const size = 82
  const stroke = 8
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6D5EF5" />
            <stop offset="100%" stopColor="#2DD4BF" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#ringGradient)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-white leading-none">{percent}%</span>
      </div>
    </div>
  )
}

/* ── Momentum stat card ──────────────────────────────────────────────── */
function StatCard({ icon: Icon, value, label, sublabel, color }) {
  return (
    <div
      className="flex-1 min-w-0 rounded-2xl p-2.5 border-l-2"
      style={{ background: `${color}12`, borderColor: color }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5" style={{ background: `${color}22` }}>
        <Icon size={13} style={{ color }} />
      </div>
      <div className="text-base font-black text-white leading-none truncate">{value}</div>
      <div className="text-[10px] font-semibold text-white/70 mt-1 truncate">{label}</div>
      {sublabel && <div className="text-[9px] text-white/40 mt-0.5 truncate">{sublabel}</div>}
    </div>
  )
}

/* ── Welcome hero (greeting + progress ring + stat row) ──────────────── */
function WelcomeHero({ user, isLoading, streak, todayPoints, progressPercent }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] || 'Student'

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-9 w-56" />
        <div className="flex gap-2">
          <Shimmer className="h-20 flex-1" />
          <Shimmer className="h-20 flex-1" />
          <Shimmer className="h-20 flex-1" />
        </div>
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
      {/* soft aurora wash */}
      <div className="absolute -top-12 -left-10 w-72 h-72 bg-primary-500/15 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute -top-6 right-0 w-52 h-52 bg-mint-500/10 rounded-full blur-[70px] pointer-events-none" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/[0.05] text-white/55 border border-white/[0.06]">
            <Sparkles size={10} className="text-primary-400" />
            {greeting}
          </span>

          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight mt-2.5 mb-1.5">
            Hey,{' '}
            <span
              style={{
                background: 'linear-gradient(120deg, #8B7CFF 0%, #6D5EF5 45%, #2DD4BF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {firstName}
            </span>{' '}
            <span className="inline-block animate-wave">👋</span>
          </h1>
          <p className="text-xs text-white/45">Today is a great day to learn something new! ✨</p>
        </div>

        <div className="text-center flex-shrink-0">
          <ProgressRing percent={progressPercent} />
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40 mt-1.5 max-w-[90px] leading-snug">
            Overall progress of your goal
          </p>
        </div>
      </div>

      <div className="flex gap-2.5 mt-4">
        <StatCard icon={Flame} value={streak} label="Day Streak" sublabel="Keep it up! 🔥" color="#FFB020" />
        <StatCard icon={Trophy} value={todayPoints} label="Points Today" sublabel="Doing great! ✨" color="#2DD4BF" />
        <StatCard icon={TrendingUp} value={`${progressPercent}%`} label="Course Progress" sublabel="Keep learning 🚀" color="#8B7CFF" />
      </div>
    </motion.div>
  )
}

/* ── Continue learning banner ────────────────────────────────────────── */
function ContinueLearning({ item, title, to, videoPercent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={to} className="block group">
        <div
          className="relative overflow-hidden rounded-2xl border border-primary-500/25"
          style={{ background: 'linear-gradient(120deg, rgba(109,94,245,0.18), rgba(45,212,191,0.06))' }}
        >
          <div className="flex items-stretch gap-2.5 p-2">
            {/* thumbnail */}
            <div className="relative w-20 sm:w-28 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-dark-700">
              <CardThumbnail item={item} alt={title} fallback={<LogoFallback />} />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play size={13} className="text-dark-900 ml-0.5" fill="currentColor" />
                </div>
              </div>
            </div>

            {/* copy */}
            <div className="flex flex-col justify-center min-w-0 flex-1 pr-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary-300 mb-0.5">
                Continue learning
              </span>
              <h3 className="text-[13px] sm:text-sm font-bold text-white leading-snug line-clamp-1">
                {title || 'Resume your last lesson'}
              </h3>

              {videoPercent > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${videoPercent}%`, background: 'linear-gradient(90deg, #6D5EF5, #2DD4BF)' }}
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-white/50 flex-shrink-0">{videoPercent}% completed</span>
                </div>
              )}

              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-mint-400 mt-1.5 group-hover:gap-2 transition-all">
                Resume Learning <ChevronRight size={12} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ── Quick access card (flat icon-top style) ─────────────────────────── */
function QuickAccessCard({ to, icon: Icon, label, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="min-w-0"
    >
      <Link to={to} className="block group">
        <div
          className="rounded-2xl px-1.5 py-3 border flex flex-col items-center gap-1.5 text-center transition-all duration-300 group-hover:scale-[1.03] active:scale-[0.97]"
          style={{ background: `${accent}12`, borderColor: `${accent}2e` }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}22` }}>
            <Icon size={15} style={{ color: accent }} />
          </div>
          <h3 className="text-[10.5px] font-bold text-white leading-tight truncate w-full">{label}</h3>
        </div>
      </Link>
    </motion.div>
  )
}

/* ── Horizontal scroll row ───────────────────────────────────────────── */
function ScrollRow({ icon: Icon, title, count, seeAllTo, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/45 flex items-center gap-1.5">
          <Icon size={13} className="text-primary-400" />
          {title} {count > 0 && <span className="text-white/30">({count})</span>}
        </h3>
        {seeAllTo && (
          <Link to={seeAllTo} className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors">
            View all
          </Link>
        )}
      </div>
      <div
        className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
        style={{ scrollSnapType: 'x proximity' }}
      >
        {children}
      </div>
    </div>
  )
}

/* ── Watch history card (video / pdf) ────────────────────────────────── */
function WatchHistoryCard({ item, index }) {
  const itemUrl = item.courseId && item.subjectId && item.contentId
    ? `/courses/${item.courseId}/subjects/${item.subjectId}/content/${item.contentId}`
    : item.courseId && item.subjectId
    ? `/courses/${item.courseId}/subjects/${item.subjectId}`
    : '#'
  const isPdf = item.type === 'pdf'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.05, duration: 0.4 }}
      className="min-w-[118px] w-[118px] flex-shrink-0"
      style={{ scrollSnapAlign: 'start' }}
    >
      <Link to={itemUrl} className="block group">
        <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
          <div className="relative aspect-video bg-dark-700">
            <CardThumbnail item={item} alt={item.title} fallback={<LogoFallback />} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            <span
              className="absolute top-1 left-1 text-[7px] font-extrabold uppercase tracking-wider px-1 py-0.5 rounded"
              style={{
                background: isPdf ? 'rgba(255,92,92,0.9)' : 'rgba(109,94,245,0.9)',
                color: 'white',
              }}
            >
              {isPdf ? 'PDF' : 'Video'}
            </span>

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                {isPdf ? <FileText size={12} className="text-dark-900" /> : <Play size={12} className="text-dark-900 ml-0.5" fill="currentColor" />}
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <p className="text-[10px] font-bold text-white line-clamp-1 leading-snug">
              {item.title || 'Untitled Lesson'}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ── Quiz history card ───────────────────────────────────────────────── */
function QuizHistoryCard({ entry, index }) {
  const latest = entry.attempts[0]
  const attemptsCount = entry.attempts.length
  const score = Math.round(latest.score)
  const scoreColor = score >= 75 ? '#2DD4BF' : score >= 50 ? '#FFB020' : '#FF5C5C'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.05, duration: 0.4 }}
      className="min-w-[118px] w-[118px] flex-shrink-0"
      style={{ scrollSnapAlign: 'start' }}
    >
      <Link to={`/quiz/result/${latest.attemptId}`} className="block group">
        <div
          className="rounded-xl overflow-hidden transition-all duration-300 relative aspect-[4/3.4] flex flex-col justify-between p-2 group-hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(140deg, rgba(109,94,245,0.16) 0%, rgba(109,94,245,0.03) 100%)',
            border: '1px solid rgba(109,94,245,0.28)',
          }}
        >
          <img src={APP_LOGO_URL} alt="" className="absolute inset-0 m-auto w-1/2 h-1/2 object-contain opacity-[0.06] pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="w-6 h-6 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
              <Brain size={12} className="text-primary-300" />
            </div>
            <div className="text-sm font-black" style={{ color: scoreColor }}>{score}%</div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-white line-clamp-1 leading-snug mb-1">
              {entry.quizName}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-extrabold uppercase tracking-wider px-1 py-0.5 rounded bg-primary-500/25 text-primary-200">
                {attemptsCount}x
              </span>
              <RotateCcw size={10} className="text-white/30 group-hover:text-primary-300 transition-colors" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ── Empty state (new users) ─────────────────────────────────────────── */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 text-center"
    >
      <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-primary-500/15 border border-primary-500/25 mb-3">
        <GraduationCap size={22} className="text-primary-400" />
      </div>
      <h3 className="text-base font-bold text-white mb-1">Start your journey</h3>
      <p className="text-xs text-white/50 mb-4 max-w-xs mx-auto leading-relaxed">
        Your recent lessons and quizzes will show up here. Pick a course to get going.
      </p>
      <Link to="/free-courses" className="btn-primary inline-flex items-center gap-1.5 text-sm">
        <Zap size={15} /> Explore free courses
      </Link>
    </motion.div>
  )
}

/* ═══════════════════════════ MAIN ═══════════════════════════ */
export default function Home() {
  const user = useAuthStore(s => s.user)
  const [recentlyWatched, setRecentlyWatched] = useState([])
  const [recentQuizzes, setRecentQuizzes] = useState([])

  useEffect(() => {
    try {
      setRecentlyWatched(JSON.parse(localStorage.getItem('ar_recently_watched') || '[]'))
    } catch (e) {
      console.error('[v0] Error loading recently watched:', e)
    }
    try {
      setRecentQuizzes(getRecentQuizzes(20))
    } catch (e) {
      console.error('[v0] Error loading quiz history:', e)
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

  const courseIds = purchases.map(p => p.courseId).filter(Boolean)
  const { overall } = useCoursesProgress(courseIds)

  // ── Continue learning: prefer the most recently watched video from this
  // device (classItems[0] — freshest, updated the instant a video is
  // opened) and only fall back to the server's last-progress record when
  // there's no local history yet (e.g. a brand-new device/browser).
  const recentVideo = classItems[0] || null

  const continueContentId = recentVideo?.contentId || lastWatched.lastContentId
  const continueSubjectId = recentVideo?.subjectId || lastWatched.lastContentSubjectId
  const continueCourseId = recentVideo?.courseId || lastWatched.lastContentCourseId

  const { data: continueContentData } = useQuery({
    queryKey: ['continue-content-detail', continueContentId],
    queryFn: () =>
      api.get(`/content/${continueContentId}${continueSubjectId ? `?subjectId=${continueSubjectId}` : ''}`).then(r => r.data),
    enabled: !!continueContentId,
    staleTime: 60000,
  })

  const continueContent = continueContentData?.content

  const continueUrl =
    continueContentId && continueCourseId && continueSubjectId
      ? `/courses/${continueCourseId}/subjects/${continueSubjectId}/content/${continueContentId}`
      : continueSubjectId && continueCourseId
      ? `/courses/${continueCourseId}/subjects/${continueSubjectId}`
      : null

  const continueTitle = recentVideo?.title || continueContent?.title || lastWatched.lastContentTitle
  const continueThumbItem = recentVideo || continueContent || lastWatched

  // Real per-video progress: resume position (the same `ar_pos_<id>` key
  // the player itself reads to resume playback) divided by the content's
  // actual total duration — not the overall course completion percent.
  let videoPercent = 0
  if (continueContentId && continueContent?.duration > 0) {
    try {
      const savedPos = parseFloat(localStorage.getItem(`ar_pos_${continueContentId}`))
      if (!isNaN(savedPos) && savedPos > 0) {
        videoPercent = Math.min(100, Math.round((savedPos / continueContent.duration) * 100))
      }
    } catch {
      // localStorage unavailable — leave at 0, bar just won't show
    }
  }

  const isLoading = pointsLoading || purchasesLoading

  const progressPercent = overall.total > 0 ? Math.round((overall.completed / overall.total) * 100) : 0
  const streak = user?.streak || 0
  const todayPoints = points.daily || 0

  const staticCards = [
    { to: '/free-courses', icon: BookOpen, label: 'Free Courses', accent: '#2DD4BF', delay: 0.12 },
    { to: '/books', icon: Book, label: 'Books', accent: '#8B7CFF', delay: 0.18 },
    { to: '/store', icon: ShoppingBag, label: 'Store', accent: '#FFB020', delay: 0.24 },
    { to: '/progress', icon: TrendingUp, label: 'Progress', accent: '#6D5EF5', delay: 0.30 },
  ]

  const hasRecent = classItems.length > 0 || notesItems.length > 0 || recentQuizzes.length > 0

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-10">
      <HeroSlider />

      <WelcomeHero
        user={user}
        isLoading={isLoading}
        streak={streak}
        todayPoints={todayPoints}
        progressPercent={progressPercent}
      />

      {continueUrl && (
        <ContinueLearning
          item={continueThumbItem}
          title={continueTitle}
          to={continueUrl}
          videoPercent={videoPercent}
        />
      )}

      {/* Quick access */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/45 mb-2.5">Quick Access</h3>
        <div className="grid grid-cols-4 gap-2">
          {staticCards.map((card, i) => (
            <QuickAccessCard key={i} {...card} />
          ))}
        </div>
      </div>

      {/* Recent activity */}
      {classItems.length > 0 && (
        <ScrollRow icon={History} title="Class" count={classItems.length} seeAllTo="/watch-history">
          {classItems.map((item, idx) => (
            <WatchHistoryCard key={item.contentId || idx} item={item} index={idx} />
          ))}
        </ScrollRow>
      )}

      {notesItems.length > 0 && (
        <ScrollRow icon={FileText} title="Notes" count={notesItems.length} seeAllTo="/watch-history">
          {notesItems.map((item, idx) => (
            <WatchHistoryCard key={item.contentId || idx} item={item} index={idx} />
          ))}
        </ScrollRow>
      )}

      {recentQuizzes.length > 0 && (
        <ScrollRow icon={Brain} title="Quiz" count={recentQuizzes.length}>
          {recentQuizzes.map((entry, idx) => (
            <QuizHistoryCard key={`${entry.subject}::${entry.quizName}`} entry={entry} index={idx} />
          ))}
        </ScrollRow>
      )}

      {!hasRecent && !continueUrl && !isLoading && <EmptyState />}

      <style>{`
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        @keyframes wave {
          0% { transform: rotate(0deg) } 10% { transform: rotate(14deg) }
          20% { transform: rotate(-8deg) } 30% { transform: rotate(14deg) }
          40% { transform: rotate(-4deg) } 50% { transform: rotate(10deg) }
          60% { transform: rotate(0deg) } 100% { transform: rotate(0deg) }
        }
        .animate-wave { animation: wave 2.5s infinite; transform-origin: 70% 70%; display: inline-block; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
