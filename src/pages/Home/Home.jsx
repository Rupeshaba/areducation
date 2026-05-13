import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  BookOpen, Trophy, TrendingUp, Flame, Play, CheckCircle,
  ArrowRight, Clock,
} from 'lucide-react'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'

/* ═══ SHIMMER ═══ */
function Shimmer({ className = '' }) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{
        background: 'rgba(255,255,255,0.05)',
        animation: 'shimmerPulse 1.8s ease-in-out infinite',
      }}
    />
  )
}

/* ═══ STAT CARD ═══ */
function StatCard({ label, value, icon: Icon, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col items-center justify-center gap-1 py-4 px-2 rounded-2xl overflow-hidden group cursor-default"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 110%, ${accent}1a 0%, transparent 70%)` }}
      />
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-0.5 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
      >
        <Icon size={17} style={{ color: accent }} />
      </div>
      <span className="text-xl font-black text-white leading-none tracking-tight">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-widest"
        style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
    </motion.div>
  )
}

/* ═══ COURSE CARD ═══ */
function CourseCard({ purchase, index }) {
  const course = purchase.courseDetails || {}
  const courseId = course.id || course._id || purchase.courseId

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/courses/${courseId}/subjects`} className="block group">
        <div
          className="rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Thumbnail */}
          <div className="relative aspect-[16/9] overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0d0d2b 0%, #0a0a1a 100%)' }}>
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={purchase.courseName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600 ease-out"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={24} className="text-white/15" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-10"
              style={{ background: 'linear-gradient(to top, #0a0a1a, transparent)' }} />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.85)', backdropFilter: 'blur(4px)' }}>
                <Play size={13} fill="white" color="white" />
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="px-3 py-2.5">
            <p className="text-xs font-semibold line-clamp-1 group-hover:text-white transition-colors duration-200"
              style={{ color: 'rgba(255,255,255,0.75)' }}>
              {purchase.courseName}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ═══ MAIN ═══ */
export default function Home() {
  const user = useAuthStore(s => s.user)

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

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] || 'Student'

  const isLoading = pointsLoading || progressLoading || purchasesLoading

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── GREETING ── */}
      {isLoading ? (
        <div className="space-y-2 pt-1">
          <Shimmer className="h-3.5 w-24 rounded-md" />
          <Shimmer className="h-7 w-44 rounded-md" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="pt-1"
        >
          <p className="text-[11px] font-medium uppercase tracking-widest mb-1"
            style={{ color: 'rgba(255,255,255,0.38)' }}>
            {greeting}
          </p>
          <h1 className="text-2xl sm:text-[28px] font-black text-white leading-tight">
            Hey, <span style={{
              background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>{firstName}</span> 👋
          </h1>
        </motion.div>
      )}

      {/* ── STREAK + POINTS STRIP ── */}
      {isLoading ? (
        <div className="flex gap-2">
          <Shimmer className="h-[60px] flex-1 rounded-2xl" />
          <Shimmer className="h-[60px] flex-1 rounded-2xl" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="flex gap-2"
        >
          {[
            {
              icon: Flame,
              value: `${user?.streak || 0} days`,
              label: 'streak',
              accent: '#fb923c',
              bg: 'rgba(249,115,22,0.1)',
              border: 'rgba(249,115,22,0.22)',
              iconBg: 'rgba(249,115,22,0.2)',
            },
            {
              icon: Trophy,
              value: points.allTime || 0,
              label: 'total points',
              accent: '#facc15',
              bg: 'rgba(234,179,8,0.1)',
              border: 'rgba(234,179,8,0.22)',
              iconBg: 'rgba(234,179,8,0.2)',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl flex-1"
              style={{ background: item.bg, border: `1px solid ${item.border}` }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: item.iconBg }}>
                <item.icon size={15} style={{ color: item.accent }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white leading-none">{item.value}</p>
                <p className="text-[10px] mt-0.5 uppercase tracking-wide"
                  style={{ color: 'rgba(255,255,255,0.38)' }}>{item.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── STATS ROW ── */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          <Shimmer className="h-24 rounded-2xl" />
          <Shimmer className="h-24 rounded-2xl" />
          <Shimmer className="h-24 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="All-time" value={points.allTime || 0} icon={Trophy} accent="#f59e0b" delay={0.1} />
          <StatCard label="Weekly" value={points.weekly || 0} icon={TrendingUp} accent="#34d399" delay={0.17} />
          <StatCard label="Done" value={progress.totalWatched || 0} icon={CheckCircle} accent="#60a5fa" delay={0.24} />
        </div>
      )}

      {/* ── CONTINUE LEARNING ── */}
      {!isLoading && continueUrl && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>
              Continue
            </p>
            {progress.lastContentAt && (
              <span className="text-[11px] flex items-center gap-1"
                style={{ color: 'rgba(255,255,255,0.28)' }}>
                <Clock size={11} />
                {new Date(progress.lastContentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          <Link to={continueUrl}>
            <div
              className="group flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.11) 0%, rgba(139,92,246,0.06) 100%)',
                border: '1px solid rgba(99,102,241,0.25)',
              }}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.2)' }}>
                {lastContent?.thumbnailUrl ? (
                  <img src={lastContent.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Play size={18} style={{ color: '#818cf8' }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {contentLoading ? (
                  <div className="space-y-1.5">
                    <Shimmer className="h-4 w-40 rounded" />
                    <Shimmer className="h-3 w-24 rounded" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors duration-200">
                      {lastContent?.title || 'Resume where you left off'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {lastContent?.type && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                          style={{
                            background: lastContent.type === 'pdf' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.2)',
                            color: lastContent.type === 'pdf' ? '#f87171' : '#a5b4fc',
                          }}>
                          {lastContent.type === 'pdf' ? 'PDF' : 'Video'}
                        </span>
                      )}
                      <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Tap to resume
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 transition-transform duration-300"
                style={{ background: 'rgba(99,102,241,0.2)' }}>
                <ArrowRight size={15} style={{ color: '#818cf8' }} />
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* ── MY COURSES ── */}
      {isLoading ? (
        <div>
          <Shimmer className="h-3.5 w-20 rounded mb-3" />
          <div className="grid grid-cols-2 gap-2.5">
            <Shimmer className="aspect-[4/3] rounded-2xl" />
            <Shimmer className="aspect-[4/3] rounded-2xl" />
            <Shimmer className="aspect-[4/3] rounded-2xl" />
            <Shimmer className="aspect-[4/3] rounded-2xl" />
          </div>
        </div>
      ) : purchases.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>
              My Courses
            </p>
            <Link to="/my-courses"
              className="text-xs flex items-center gap-0.5 transition-colors duration-200"
              style={{ color: 'rgba(129,140,248,0.75)' }}>
              See all <ArrowRight size={11} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {purchases.slice(0, 4).map((purchase, i) => (
              <CourseCard key={purchase.id} purchase={purchase} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      <style>{`
        @keyframes shimmerPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
