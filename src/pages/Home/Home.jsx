import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
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
import { DEFAULT_THUMBNAILS, APP_LOGO_URL } from '../../constants/branding'
import { getRecentQuizzes } from '../../utils/quizCache'

/* ═══════════════════════════════════════════════════════════════════════
   AR Education — Home
   Redesigned to match the provided "Indigo Aurora" dark mode mockup.
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

/* ── Brand logo fallback ─────────────────────────────────────────────── */
function LogoFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#10121A]">
      <img src={APP_LOGO_URL} alt="" className="w-1/3 h-1/3 object-contain opacity-25 grayscale" />
    </div>
  )
}

/* ── Circular Progress Indicator ─────────────────────────────────────── */
function CircularProgress({ percent }) {
  const size = 100
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative w-[100px] h-[100px] flex-shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id="circleProgress" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="100%" stopColor="#8B7CFF" />
          </linearGradient>
        </defs>
        {/* Background Track */}
        <circle
          className="text-white/10"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress Ring */}
        <circle
          stroke="url(#circleProgress)"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black text-white leading-none">{percent}%</span>
        <span className="text-[8px] font-bold text-white/60 mt-0.5 leading-tight">Overall<br />Progress</span>
      </div>
    </div>
  )
}

/* ── Welcome hero ────────────────────────────────────────────────────── */
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
          <Shimmer className="h-14 flex-1" />
          <Shimmer className="h-14 flex-1" />
          <Shimmer className="h-14 flex-1" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative pt-1"
    >
      {/* Soft ambient glow */}
      <div className="absolute -top-12 -left-10 w-64 h-64 bg-primary-500/15 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute -top-6 right-20 w-40 h-40 bg-mint-500/10 rounded-full blur-[70px] pointer-events-none" />

      <div className="flex justify-between items-start">
        {/* Left Content */}
        <div className="flex-1">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/[0.05] text-white/55 border border-white/[0.06]">
            <Sparkles size={10} className="text-mint-400" />
            {greeting}
          </span>

          <h1 className="text-3xl font-black text-white leading-tight tracking-tight mt-2.5 mb-1">
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
          <p className="text-xs text-white/60 font-medium">Today is a great day to learn something new! ✨</p>
        </div>

        {/* Right: Circular Progress */}
        <div className="flex-shrink-0 -mt-2">
          <CircularProgress percent={progressPercent} />
        </div>
      </div>

      {/* Stat Chips */}
      <div className="flex gap-2 mt-5">
        <div className="bg-[#13161F] rounded-2xl flex-1 p-3 border border-white/[0.05] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0 border border-orange-500/20">
            <Flame size={16} className="text-orange-400" />
          </div>
          <div>
            <div className="text-base font-black text-white leading-none">{streak}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-white/40 mt-0.5">Day Streak</div>
          </div>
        </div>

        <div className="bg-[#13161F] rounded-2xl flex-1 p-3 border border-white/[0.05] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mint-500/20 flex items-center justify-center flex-shrink-0 border border-mint-500/20">
            <Trophy size={16} className="text-mint-400" />
          </div>
          <div>
            <div className="text-base font-black text-white leading-none">{todayPoints}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-white/40 mt-0.5">Points Today</div>
          </div>
        </div>

        <div className="bg-[#13161F] rounded-2xl flex-1 p-3 border border-white/[0.05] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0 border border-primary-500/20">
            <TrendingUp size={16} className="text-primary-400" />
          </div>
          <div>
            <div className="text-base font-black text-white leading-none">{progressPercent}%</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-white/40 mt-0.5">Course Progress</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Continue learning banner ────────────────────────────────────────── */
function ContinueLearning({ item, title, to }) {
  const progressPercent = Math.min(Math.round((item?.progress || 0) * 100), 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={to} className="block group">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#181C2C] p-3 flex gap-4">
          {/* Thumbnail */}
          <div className="w-[120px] aspect-video rounded-2xl overflow-hidden flex-shrink-0 bg-[#141827] relative">
            <CardThumbnail item={item} alt={title} fallback={<LogoFallback />} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xl">
                <Play size={18} className="text-dark-900 ml-0.5 fill-current" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-between py-0.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">Continue Learning</span>
              <h3 className="text-[15px] font-bold text-white leading-tight mt-0.5 line-clamp-2">
                {title || 'Resume your last lesson'}
              </h3>
            </div>

            <div className="flex items-center justify-between mt-2 gap-2">
              <div className="flex-1">
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-400 to-mint-400 rounded-full" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="text-[9px] text-white/40 font-semibold mt-1 block">{progressPercent}% completed</span>
              </div>
              <span className="text-[11px] font-bold text-mint-400 bg-mint-400/10 border border-mint-400/20 px-3 py-1.5 rounded-full flex items-center gap-1 group-hover:bg-mint-400/20 transition-colors">
                Resume Learning <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ── Quick action card ───────────────────────────────────────────────── */
function QuickActionCard({ to, icon: Icon, label, description, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={to} className="block group">
        <div className="rounded-3xl border border-white/[0.06] bg-[#13161F] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden aspect-square flex flex-col justify-between p-4">
          {/* Top: Icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}>
            <Icon size={18} style={{ color: accent }} />
          </div>

          {/* Bottom: Text + Arrow */}
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[14px] font-bold text-white leading-tight truncate">{label}</h3>
              <p className="text-[10px] text-white/40 truncate">{description}</p>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 border border-white/10 transition-all duration-300 group-hover:translate-x-0.5">
              <ArrowRight size={12} className="text-white/70" />
            </div>
          </div>
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
        <h3 className="text-xs font-black uppercase tracking-wider text-white/40 flex items-center gap-1.5">
          <Icon size={14} className="text-primary-400" />
          {title} {count > 0 && <span className="text-white/20">({count})</span>}
        </h3>
        {seeAllTo && (
          <Link to={seeAllTo} className="text-[10px] font-bold text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-0.5">
            View all <ChevronRight size={14} />
          </Link>
        )}
      </div>
      <div
        className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1"
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
  const progress = Math.min(Math.round((item.progress || 0) * 100), 100)
  const duration = item.duration || '00:00'
  const accentColor = isPdf ? '#FF5C5C' : '#8B7CFF'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.05 + index * 0.06, duration: 0.3 }}
      className="min-w-[160px] w-[160px] flex-shrink-0"
      style={{ scrollSnapAlign: 'start' }}
    >
      <Link to={itemUrl} className="block group">
        <div className="rounded-2xl overflow-hidden transition-all duration-300 relative aspect-[3/4] bg-[#10121A] border border-white/[0.06]">
          <CardThumbnail item={item} alt={item.title} fallback={<LogoFallback />} />
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B12] via-transparent to-transparent opacity-90" />
          
          {/* Badge */}
          <span className="absolute top-2 left-2 text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border" style={{ background: `${accentColor}25`, borderColor: `${accentColor}40`, color: accentColor }}>
            {isPdf ? 'PDF' : 'Video'}
          </span>

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
            {isPdf ? (
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                <FileText size={16} className="text-white" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                <Play size={16} className="text-white ml-0.5" fill="currentColor" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 inset-x-0 p-2.5 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-white line-clamp-2 leading-tight">
              {item.title || 'Untitled Lesson'}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary-400 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[8px] font-bold text-white/40">{isPdf ? `${progress}%` : duration}</span>
            </div>
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
      transition={{ delay: 0.05 + index * 0.06, duration: 0.3 }}
      className="min-w-[160px] w-[160px] flex-shrink-0"
      style={{ scrollSnapAlign: 'start' }}
    >
      <Link to={`/quiz/result/${latest.attemptId}`} className="block group">
        <div className="rounded-2xl overflow-hidden transition-all duration-300 relative aspect-[3/4] bg-[#10121A] border border-white/[0.06] p-3 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary-500/20 border border-primary-500/20 flex items-center justify-center">
              <Brain size={15} className="text-primary-300" />
            </div>
            <div className="text-xl font-black" style={{ color: scoreColor }}>{score}%</div>
          </div>

          <div className="mt-auto">
            <p className="text-[11px] font-bold text-white line-clamp-2 leading-snug mb-4">
              {entry.quizName}
            </p>
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">
                {attemptsCount} Attempt{attemptsCount > 1 ? 's' : ''}
              </span>
              <RotateCcw size={12} className="text-white/30 group-hover:text-primary-300 transition-colors" />
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
      className="rounded-3xl border border-white/[0.07] bg-[#10121A] p-6 text-center"
    >
      <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-primary-500/15 border border-primary-500/25 mb-3">
        <GraduationCap size={22} className="text-primary-400" />
      </div>
      <h3 className="text-base font-bold text-white mb-1">Start your journey</h3>
      <p className="text-xs text-white/40 mb-4 max-w-xs mx-auto leading-relaxed">
        Your recent lessons and quizzes will show up here. Pick a course to get going.
      </p>
      <Link to="/free-courses" className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-primary-500 hover:bg-primary-400 transition-colors px-4 py-2 rounded-full">
        <Zap size={15} /> Explore free courses
      </Link>
    </motion.div>
  )
}

/* ── Doubt Chat CTA Banner ───────────────────────────────────────────── */
function DoubtCTA() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.36, duration: 0.5 }}
    >
      <Link to="/doubt-chat" className="block group">
        <div className="relative flex items-center gap-3 rounded-3xl p-4 bg-gradient-to-r from-[#0D2B2B] to-[#051515] border border-mint-500/20 overflow-hidden">
          {/* Background Waves */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 50 Q 20 40, 40 50 T 80 50 T 100 50" fill="none" stroke="#2DD4BF" strokeWidth="1" />
              <path d="M0 60 Q 25 70, 50 60 T 100 60" fill="none" stroke="#2DD4BF" strokeWidth="1" />
            </svg>
          </div>

          <div className="w-10 h-10 rounded-full bg-mint-500/20 border border-mint-500/40 flex items-center justify-center flex-shrink-0 relative z-10">
            <MessageSquare size={18} className="text-mint-400" />
          </div>
          <div className="min-w-0 flex-1 relative z-10">
            <p className="text-sm font-bold text-white">Have a doubt?</p>
            <p className="text-[10px] text-white/50 truncate">Ask our mentors and get quick answers</p>
          </div>
          <div className="relative z-10 bg-mint-500 hover:bg-mint-400 text-[#0A1A1A] text-[11px] font-extrabold px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors">
            Ask Now <ArrowRight size={14} />
          </div>
        </div>
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
      console.error('[Home] Error loading recently watched:', e)
    }
    try {
      setRecentQuizzes(getRecentQuizzes(20))
    } catch (e) {
      console.error('[Home] Error loading quiz history:', e)
    }
  }, [])

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

  const lastContentId = lastWatched.lastContentId
  const lastSubjectId = lastWatched.lastContentSubjectId
  const lastCourseId = lastWatched.lastContentCourseId

  const { data: lastContentData } = useQuery({
    queryKey: ['last-content-detail', lastContentId],
    queryFn: () =>
      api.get(`/content/${lastContentId}${lastSubjectId ? `?subjectId=${lastSubjectId}` : ''}`).then(r => r.data),
    enabled: !!lastContentId,
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

  const progressPercent = overall.total > 0 ? Math.round((overall.completed / overall.total) * 100) : 0
  const streak = user?.streak || 0
  const todayPoints = points.daily || 0

  const staticCards = [
    { to: '/free-courses', icon: BookOpen, label: 'Free Courses', description: 'Start learning free', accent: '#2DD4BF', delay: 0.10 },
    { to: '/books', icon: Book, label: 'Books', description: 'Read PDFs', accent: '#8B7CFF', delay: 0.16 },
    { to: '/store', icon: ShoppingBag, label: 'Store', description: 'Premium courses', accent: '#FFB020', delay: 0.22 },
    { to: '/progress', icon: TrendingUp, label: 'Progress', description: 'Track your journey', accent: '#6D5EF5', delay: 0.28 },
  ]

  // Combine video and pdf items into one scrollable list for "Continue where you left off"
  const watchHistoryItems = recentlyWatched
  const hasRecent = watchHistoryItems.length > 0 || recentQuizzes.length > 0

  return (
    <div className="space-y-7 max-w-2xl mx-auto pb-8">
      <WelcomeHero
        user={user}
        isLoading={isLoading}
        streak={streak}
        todayPoints={todayPoints}
        progressPercent={progressPercent}
      />

      {continueUrl && (
        <ContinueLearning
          item={lastContent || lastWatched}
          title={lastContent?.title || lastWatched.lastContentTitle}
          to={continueUrl}
        />
      )}

      {/* Quick actions */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-white/40 flex items-center gap-1.5">
          <Sparkles size={14} className="text-primary-400" />
          QUICK ACCESS
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {staticCards.map((card, i) => (
            <QuickActionCard key={i} {...card} />
          ))}
        </div>
      </div>

      {/* Doubt chat CTA */}
      <DoubtCTA />

      {/* Continue Where You Left Off */}
      {watchHistoryItems.length > 0 && (
        <ScrollRow icon={History} title="Continue where you left off" count={watchHistoryItems.length} seeAllTo="/watch-history">
          {watchHistoryItems.map((item, idx) => (
            <WatchHistoryCard key={item.contentId || idx} item={item} index={idx} />
          ))}
        </ScrollRow>
      )}

      {/* Quiz Performance */}
      {recentQuizzes.length > 0 && (
        <ScrollRow icon={Brain} title="Quiz Performance" count={recentQuizzes.length} seeAllTo="/quiz/history">
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
