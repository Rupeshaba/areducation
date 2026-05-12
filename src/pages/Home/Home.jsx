import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  BookOpen, Trophy, TrendingUp, Flame, Play, CheckCircle,
  ArrowRight, Clock, Sparkles
} from 'lucide-react'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'

/* ═══ SHIMMER ═══ */
function Shimmer({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-white/[0.03] via-white/[0.08] to-white/[0.03] bg-[length:200%_100%] ${className}`}
      style={{ animation: 'shimmer 1.5s infinite' }} />
  )
}

function ShimmerCard() {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
      <div className="flex items-center gap-3">
        <Shimmer className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-4 w-20 rounded" />
          <Shimmer className="h-3 w-12 rounded" />
        </div>
      </div>
    </div>
  )
}

function ShimmerBanner() {
  return (
    <div className="rounded-2xl border border-primary-500/10 p-6 space-y-3">
      <Shimmer className="h-4 w-32 rounded" />
      <Shimmer className="h-8 w-64 rounded" />
      <Shimmer className="h-4 w-48 rounded" />
      <div className="flex gap-4 mt-4">
        <Shimmer className="h-6 w-24 rounded-full" />
        <Shimmer className="h-6 w-24 rounded-full" />
      </div>
    </div>
  )
}

function ShimmerCourseCard() {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] overflow-hidden">
      <Shimmer className="aspect-[16/10] w-full" />
      <div className="p-4 space-y-3">
        <Shimmer className="h-5 w-3/4 rounded" />
        <Shimmer className="h-10 w-full rounded-xl" />
      </div>
    </div>
  )
}

/* ═══ COURSE CARD — CLEAN & PREMIUM ═══ */
function CourseCard({ purchase, index }) {
  const course = purchase.courseDetails || {}
  const courseId = course.id || course._id || purchase.courseId

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="group relative rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden hover:border-primary-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10">
        
        {/* Thumbnail — 16:10 Aspect Ratio */}
        <div className="relative aspect-[16/10] overflow-hidden bg-[#0a0a1a]">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={purchase.courseName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-900/30 to-violet-900/20">
              <BookOpen size={40} className="text-white/20" />
            </div>
          )}
          
          {/* Subtle gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0a0a1a] to-transparent opacity-80" />
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-primary-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-bold text-white mb-4 line-clamp-1 group-hover:text-primary-300 transition-colors duration-300">
            {purchase.courseName}
          </h3>

          <Link to={`/courses/${courseId}/subjects`}>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30">
              <Play size={16} fill="currentColor" />
              Start Learning
            </button>
          </Link>
        </div>
      </div>
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
    queryFn: () => api.get(`/content/${lastContentId}${lastSubjectId ? `?subjectId=${lastSubjectId}` : ''}`).then(r => r.data),
    enabled: !!lastContentId,
    staleTime: 60000,
  })

  const lastContent = lastContentData?.content

  const continueUrl = lastContentId && lastCourseId && lastSubjectId
    ? `/courses/${lastCourseId}/subjects/${lastSubjectId}/content/${lastContentId}`
    : lastSubjectId && lastCourseId
    ? `/courses/${lastCourseId}/subjects/${lastSubjectId}`
    : null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  const isLoading = pointsLoading || progressLoading || purchasesLoading

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* ── WELCOME BANNER ── */}
      {isLoading ? <ShimmerBanner /> : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600/30 via-primary-500/15 to-transparent border border-primary-500/20 p-6 sm:p-8"
        >
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-violet-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-primary-300 text-sm mb-2">
              <Sparkles size={14} className="text-amber-400" />
              <span>{greeting}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 leading-tight">
              Welcome back, <span className="bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">{user?.name?.split(' ')[0] || 'Student'}</span>! 👋
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">Keep up the momentum. You're doing great!</p>
            
            <div className="flex items-center gap-6 mt-5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                <Flame size={16} className="text-orange-400" />
                <span className="text-sm text-gray-300 font-medium">{user?.streak || 0} day streak</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Trophy size={16} className="text-amber-400" />
                <span className="text-sm text-gray-300 font-medium">{points.allTime || 0} points</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── STATS ── */}
      <div className="grid grid-cols-3 gap-3">
        {isLoading ? (
          <>
            <ShimmerCard />
            <ShimmerCard />
            <ShimmerCard />
          </>
        ) : (
          [
            { label: 'All-Time Points', value: points.allTime || 0, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/15', gradient: 'from-amber-500/20 to-orange-500/5' },
            { label: 'Weekly Points', value: points.weekly || 0, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', gradient: 'from-emerald-500/20 to-teal-500/5' },
            { label: 'Content Done', value: progress.totalWatched || 0, icon: CheckCircle, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/15', gradient: 'from-sky-500/20 to-blue-500/5' },
          ].map((stat, i) => (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border ${stat.border} p-4 text-center hover:scale-[1.03] hover:bg-white/[0.05] transition-all duration-300 group`}>
              
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                  <stat.icon size={22} className={stat.color} />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ── CONTINUE LEARNING ── */}
      {isLoading ? (
        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
          <Shimmer className="h-5 w-40 rounded mb-3" />
          <Shimmer className="aspect-[16/4] w-full rounded-xl" />
        </div>
      ) : continueUrl && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Play size={18} className="text-primary-400" /> Continue Learning
            </h3>
            {progress.lastContentAt && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={12} /> {new Date(progress.lastContentAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <Link to={continueUrl}
            className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary-500/10 to-primary-500/5 border border-primary-500/20 hover:border-primary-500/40 transition-all group">

            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary-500/20 to-primary-500/5 flex items-center justify-center shadow-lg shadow-primary-500/10">
              {lastContent?.thumbnailUrl ? (
                <img src={lastContent.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Play size={24} className="text-primary-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {contentLoading ? (
                <>
                  <Shimmer className="h-5 w-48 rounded mb-2" />
                  <Shimmer className="h-3 w-24 rounded" />
                </>
              ) : lastContent?.title ? (
                <>
                  <div className="text-base font-bold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                    {lastContent.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${lastContent.type === 'pdf' ? 'bg-red-500/10 text-red-400' : 'bg-primary-500/10 text-primary-400'}`}>
                      {lastContent.type === 'pdf' ? '📄 PDF' : '▶ Video'}
                    </span>
                    <span>· Tap to resume</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-base font-bold text-white group-hover:text-primary-300 transition-colors">
                    Resume where you left off
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Tap to continue</div>
                </>
              )}
            </div>

            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
              <ArrowRight size={20} className="text-primary-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </motion.div>
      )}

      {/* ── MY COURSES — FIXED CARDS ── */}
      {isLoading ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <Shimmer className="h-6 w-32 rounded" />
            <Shimmer className="h-4 w-16 rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ShimmerCourseCard />
            <ShimmerCourseCard />
            <ShimmerCourseCard />
            <ShimmerCourseCard />
          </div>
        </div>
      ) : purchases.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen size={18} className="text-primary-400" /> My Courses
            </h2>
            <Link to="/my-courses" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {purchases.slice(0, 4).map((purchase, i) => (
              <CourseCard key={purchase.id} purchase={purchase} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}