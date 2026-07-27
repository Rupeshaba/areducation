import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Trophy, TrendingUp, Flame, Play, ArrowRight,
  GraduationCap, MessageSquare, ShoppingBag, Book, FileText,
  Brain, ChevronRight, Zap, Sparkles,
} from 'lucide-react'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { useCoursesProgress } from '../../hooks/useCoursesProgress'
import CardThumbnail from '../../components/CardThumbnail'
import { DEFAULT_THUMBNAILS, APP_LOGO_URL } from '../../constants/branding'
import { getRecentQuizzes } from '../../utils/quizCache'

/* ═══════════════════════════════════════════════════════════════════════
   AR Education — Home  (fresh "clean dashboard" redesign)
   Flat dark surfaces, one signature hero card, unified stat strip, and
   calm colored-icon tiles. Indigo primary + mint / amber accents.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Brand logo fallback ─────────────────────────────────────────────── */
function LogoFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-dark-700">
      <img src={APP_LOGO_URL} alt="" className="w-1/3 h-1/3 object-contain opacity-25 grayscale" />
    </div>
  )
}

/* ── Skeleton block ──────────────────────────────────────────────────── */
function Skeleton({ className = '' }) {
  return <div className={`bg-white/[0.05] animate-pulse rounded-2xl ${className}`} />
}

/* ── Compact top header: avatar + greeting + streak ──────────────────── */
function TopBar({ user, streak }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] || 'Student'
  const initial = firstName.charAt(0).toUpperCase()

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-2xl bg-primary-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/25">
          <span className="text-lg font-black text-white">{initial}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white/45 leading-none">{greeting}</p>
          <h1 className="text-lg font-black text-white leading-tight truncate mt-1">{firstName}</h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/12 border border-amber-500/25 flex-shrink-0">
        <Flame size={15} className="text-amber-400" fill="currentColor" />
        <span className="text-sm font-black text-white">{streak}</span>
      </div>
    </div>
  )
}

/* ── Signature hero card ─────────────────────────────────────────────── */
function HeroCard({ continueItem, continueTitle, continueUrl, progressPercent }) {
  // Continue-learning variant
  if (continueUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link to={continueUrl} className="block group">
          <div className="relative overflow-hidden rounded-3xl bg-dark-800 border border-white/[0.07]">
            {/* thumbnail top */}
            <div className="relative aspect-[16/9] w-full bg-dark-700 overflow-hidden">
              <CardThumbnail item={continueItem} alt={continueTitle} fallback={<LogoFallback />} />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-800 via-dark-800/20 to-transparent" />
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-mint-400 animate-pulse" />
                Continue watching
              </span>
              <div className="absolute right-3 bottom-3 w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-xl group-active:scale-90 transition-transform">
                <Play size={18} className="text-dark-900 ml-0.5" fill="currentColor" />
              </div>
            </div>

            {/* copy + progress */}
            <div className="p-4">
              <h3 className="text-[15px] font-bold text-white leading-snug line-clamp-2">
                {continueTitle || 'Resume your last lesson'}
              </h3>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{ width: `${Math.max(progressPercent, 4)}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-primary-300 flex-shrink-0">{progressPercent}%</span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    )
  }

  // Welcome variant (no history yet)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative overflow-hidden rounded-3xl bg-primary-500 p-5">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-2 top-10 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/20 text-white">
            <Sparkles size={11} /> Welcome
          </span>
          <h3 className="text-xl font-black text-white leading-tight mt-3 text-balance">
            Ready to start learning?
          </h3>
          <p className="text-[13px] text-white/85 mt-1.5 leading-relaxed">
            Pick a course and build your streak today.
          </p>
          <Link
            to="/free-courses"
            className="inline-flex items-center gap-1.5 mt-4 bg-white text-primary-600 font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
          >
            <Zap size={15} /> Explore courses
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Unified stat strip ──────────────────────────────────────────────── */
function StatStrip({ todayPoints, streak, progressPercent }) {
  const stats = [
    { icon: Trophy, value: todayPoints, label: 'Points', color: '#2DD4BF' },
    { icon: Flame, value: streak, label: 'Streak', color: '#FFB020' },
    { icon: TrendingUp, value: `${progressPercent}%`, label: 'Progress', color: '#8B7CFF' },
  ]
  return (
    <div className="flex items-stretch rounded-3xl bg-dark-800 border border-white/[0.07] overflow-hidden">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`flex-1 flex flex-col items-center justify-center py-4 gap-1.5 ${i > 0 ? 'border-l border-white/[0.07]' : ''}`}
        >
          <s.icon size={17} style={{ color: s.color }} />
          <span className="text-lg font-black text-white leading-none">{s.value}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Section heading ─────────────────────────────────────────────────── */
function SectionTitle({ children, seeAllTo, count }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-black text-white flex items-center gap-2">
        {children}
        {count > 0 && <span className="text-white/30 font-bold">{count}</span>}
      </h2>
      {seeAllTo && (
        <Link to={seeAllTo} className="text-xs font-semibold text-primary-400 active:text-primary-300">
          See all
        </Link>
      )}
    </div>
  )
}

/* ── Clean category tile ─────────────────────────────────────────────── */
function CategoryTile({ to, icon: Icon, label, description, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={to}
        className="block h-full rounded-3xl bg-dark-800 border border-white/[0.07] p-4 active:scale-[0.97] transition-transform"
      >
        <div className="flex items-center justify-between mb-4">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: `${accent}1f`, border: `1px solid ${accent}3a` }}
          >
            <Icon size={19} style={{ color: accent }} />
          </div>
          <div className="w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center">
            <ArrowRight size={13} className="text-white/50" />
          </div>
        </div>
        <h3 className="text-sm font-bold text-white leading-tight">{label}</h3>
        <p className="text-[11px] text-white/45 mt-0.5 truncate">{description}</p>
      </Link>
    </motion.div>
  )
}

/* ── Watch history card ──────────────────────────────────────────────── */
function WatchHistoryCard({ item, index }) {
  const itemUrl = item.courseId && item.subjectId && item.contentId
    ? `/courses/${item.courseId}/subjects/${item.subjectId}/content/${item.contentId}`
    : item.courseId && item.subjectId
    ? `/courses/${item.courseId}/subjects/${item.subjectId}`
    : '#'
  const isPdf = item.type === 'pdf'

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.4 }}
      className="min-w-[160px] w-[160px] flex-shrink-0"
      style={{ scrollSnapAlign: 'start' }}
    >
      <Link to={itemUrl} className="block group">
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-dark-700 border border-white/[0.07]">
          <CardThumbnail item={item} alt={item.title} fallback={<LogoFallback />} />
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-white/95 flex items-center justify-center">
              {isPdf
                ? <FileText size={15} className="text-dark-900" />
                : <Play size={15} className="text-dark-900 ml-0.5" fill="currentColor" />}
            </div>
          </div>
          <span
            className="absolute top-2 left-2 text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded text-white"
            style={{ background: isPdf ? 'rgba(255,92,92,0.92)' : 'rgba(109,94,245,0.92)' }}
          >
            {isPdf ? 'PDF' : 'Video'}
          </span>
        </div>
        <p className="text-[12px] font-semibold text-white/90 line-clamp-2 leading-snug mt-2 px-0.5">
          {item.title || 'Untitled Lesson'}
        </p>
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
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.4 }}
      className="min-w-[160px] w-[160px] flex-shrink-0"
      style={{ scrollSnapAlign: 'start' }}
    >
      <Link to={`/quiz/result/${latest.attemptId}`} className="block">
        <div className="rounded-2xl bg-dark-800 border border-white/[0.07] p-3.5 h-full active:scale-[0.97] transition-transform">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center">
              <Brain size={16} className="text-primary-300" />
            </div>
            <span className="text-lg font-black" style={{ color: scoreColor }}>{score}%</span>
          </div>
          <p className="text-[12px] font-bold text-white line-clamp-2 leading-snug min-h-[2rem]">
            {entry.quizName}
          </p>
          <span className="inline-block mt-2 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-white/50">
            {attemptsCount} attempt{attemptsCount > 1 ? 's' : ''}
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

/* ── Horizontal scroll row ───────────────────────────────────────────── */
function ScrollRow({ children }) {
  return (
    <div
      className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4"
      style={{ scrollSnapType: 'x proximity' }}
    >
      {children}
    </div>
  )
}

/* ═══════════════════════════════ MAIN ══════════════════════════════════ */
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

  const categories = [
    { to: '/free-courses', icon: BookOpen, label: 'Free Courses', description: 'Start learning free', accent: '#2DD4BF', delay: 0.05 },
    { to: '/books', icon: Book, label: 'Books', description: 'Read PDFs', accent: '#8B7CFF', delay: 0.10 },
    { to: '/store', icon: ShoppingBag, label: 'Store', description: 'Premium courses', accent: '#FFB020', delay: 0.15 },
    { to: '/progress', icon: TrendingUp, label: 'Progress', description: `${progressPercent}% complete`, accent: '#6D5EF5', delay: 0.20 },
  ]

  const hasRecent = classItems.length > 0 || notesItems.length > 0 || recentQuizzes.length > 0

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <TopBar user={user} streak={streak} />

      {isLoading ? (
        <>
          <Skeleton className="h-56 w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-3xl" />
        </>
      ) : (
        <>
          <HeroCard
            continueItem={lastContent || lastWatched}
            continueTitle={lastContent?.title || lastWatched.lastContentTitle}
            continueUrl={continueUrl}
            progressPercent={progressPercent}
          />

          <StatStrip todayPoints={todayPoints} streak={streak} progressPercent={progressPercent} />
        </>
      )}

      {/* Explore */}
      <section>
        <SectionTitle>
          <Sparkles size={15} className="text-primary-400" /> Explore
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((c) => (
            <CategoryTile key={c.to} {...c} />
          ))}
        </div>
      </section>

      {/* Doubt chat */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        <Link to="/doubt-chat" className="block group">
          <div className="flex items-center gap-3 rounded-3xl p-4 bg-mint-500/[0.08] border border-mint-500/25 active:scale-[0.98] transition-transform">
            <div className="w-11 h-11 rounded-2xl bg-mint-500/18 border border-mint-500/30 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={19} className="text-mint-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">Have a doubt?</p>
              <p className="text-[11px] text-white/50 truncate">Ask our mentors, get quick answers</p>
            </div>
            <ChevronRight size={18} className="text-mint-400 flex-shrink-0" />
          </div>
        </Link>
      </motion.div>

      {/* Recent activity */}
      {classItems.length > 0 && (
        <section>
          <SectionTitle seeAllTo="/watch-history" count={classItems.length}>
            <Play size={14} className="text-primary-400" fill="currentColor" /> Recent classes
          </SectionTitle>
          <ScrollRow>
            {classItems.map((item, idx) => (
              <WatchHistoryCard key={item.contentId || idx} item={item} index={idx} />
            ))}
          </ScrollRow>
        </section>
      )}

      {notesItems.length > 0 && (
        <section>
          <SectionTitle seeAllTo="/watch-history" count={notesItems.length}>
            <FileText size={14} className="text-primary-400" /> Notes
          </SectionTitle>
          <ScrollRow>
            {notesItems.map((item, idx) => (
              <WatchHistoryCard key={item.contentId || idx} item={item} index={idx} />
            ))}
          </ScrollRow>
        </section>
      )}

      {recentQuizzes.length > 0 && (
        <section>
          <SectionTitle count={recentQuizzes.length}>
            <Brain size={14} className="text-primary-400" /> Recent quizzes
          </SectionTitle>
          <ScrollRow>
            {recentQuizzes.map((entry, idx) => (
              <QuizHistoryCard key={`${entry.subject}::${entry.quizName}`} entry={entry} index={idx} />
            ))}
          </ScrollRow>
        </section>
      )}

      {/* Empty state */}
      {!hasRecent && !continueUrl && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="rounded-3xl border border-white/[0.07] bg-dark-800 p-6 text-center"
        >
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-primary-500/15 border border-primary-500/25 mb-3">
            <GraduationCap size={22} className="text-primary-400" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No activity yet</h3>
          <p className="text-xs text-white/50 leading-relaxed max-w-xs mx-auto">
            Your recent lessons and quizzes will appear here once you start learning.
          </p>
        </motion.div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
