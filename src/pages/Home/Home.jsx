import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Trophy, TrendingUp, Flame, Play, CheckCircle,
  ArrowRight, Clock, Sparkles, ChevronRight, GraduationCap,
  Compass, Zap
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

/* ═══ PREMIUM GLOWING STAT CARD ═══ */
function StatCard({ label, value, icon: Icon, accent, delay, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col justify-between p-5 rounded-3xl overflow-hidden group cursor-default transition-all duration-300 hover:translate-y-[-2px]"
      style={{ 
        background: 'rgba(255, 255, 255, 0.02)', 
        border: '1px solid rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(12px)'
      }}
    >
      {/* Dynamic Hover Glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 100%, ${accent}15 0%, transparent 85%)` }}
      />
      
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ background: `${accent}12`, border: `1px solid ${accent}25` }}
        >
          <Icon size={18} style={{ color: accent }} />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.04] text-white/40">
          Stat
        </div>
      </div>

      {/* Content */}
      <div>
        <h3 className="text-2xl font-black text-white leading-none tracking-tight flex items-baseline gap-1">
          {value}
        </h3>
        <p className="text-xs font-semibold mt-1.5 text-white/70 tracking-wide">
          {label}
        </p>
        {description && (
          <p className="text-[10px] text-white/40 mt-1">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  )
}

/* ═══ REDESIGNED COURSE CARD ═══ */
function CourseCard({ purchase, index }) {
  const course = purchase.courseDetails || {}
  const courseId = course.id || course._id || purchase.courseId

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={`/courses/${courseId}/subjects`} className="block group relative">
        <div
          className="rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/30"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Thumbnail Container */}
          <div className="relative aspect-[16/10] overflow-hidden bg-dark-950">
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={purchase.courseName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10142A 0%, #151932 100%)' }}>
                <BookOpen size={28} className="text-white/10" />
              </div>
            )}
            
            {/* Ambient vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-transparent to-transparent" />
            
            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300"
                style={{ background: 'rgba(255, 107, 74, 0.9)', boxShadow: '0 8px 24px rgba(255, 107, 74, 0.4)' }}>
                <Play size={15} fill="white" color="white" className="ml-0.5" />
              </div>
            </div>

            {/* Badge */}
            <span className="absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-black/50 backdrop-blur-md text-white/90 border border-white/10">
              Active Course
            </span>
          </div>

          {/* Details */}
          <div className="p-4">
            <h4 className="text-sm font-bold text-white/90 line-clamp-1 group-hover:text-primary-400 transition-colors duration-200">
              {purchase.courseName}
            </h4>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
              <span className="text-[10px] text-white/40 font-medium">Ready to study</span>
              <span className="text-[10px] text-primary-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform duration-200">
                Start <ChevronRight size={10} />
              </span>
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
    enabled: !!lastContentId && recentlyWatched.length === 0, // only fetch if no local storage history yet
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
    <div className="space-y-7 max-w-2xl mx-auto pb-10">

      {/* ── GREETING HERO ── */}
      {isLoading ? (
        <div className="space-y-3 pt-2">
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-10 w-64" />
        </div>
      ) : (
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
          
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
            Hey, <span style={{
              background: 'linear-gradient(135deg, #FF9270 0%, #FF6B4A 50%, #FF85A2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>{firstName}</span> <span className="inline-block origin-[70%_70%] animate-wave">👋</span>
          </h1>
          <p className="text-xs text-white/50 mt-1.5 font-medium max-w-md">
            Welcome back to your dashboard. Ready to conquer your learning goals today?
          </p>
        </motion.div>
      )}

      {/* ── STREAK & POINTS HERO WIDGET ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3.5">
          <Shimmer className="h-[76px]" />
          <Shimmer className="h-[76px]" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 gap-3.5"
        >
          {/* Streak Banner */}
          <div
            className="relative flex items-center gap-3.5 p-4 rounded-3xl overflow-hidden group transition-all duration-300 hover:scale-[1.01]"
            style={{ 
              background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(249,115,22,0.02) 100%)', 
              border: '1px solid rgba(249,115,22,0.2)' 
            }}
          >
            <div className="absolute inset-0 bg-radial-glow opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 100% 100%, rgba(249,115,22,0.12) 0%, transparent 70%)' }} />
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.25)' }}>
              <Flame size={18} fill="#ff7c25" className="text-orange-500 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-white leading-none">{user?.streak || 0} Days</p>
              <p className="text-[10px] mt-1 font-bold uppercase tracking-wider text-orange-400">Current Streak</p>
            </div>
          </div>

          {/* Reward Points Banner */}
          <div
            className="relative flex items-center gap-3.5 p-4 rounded-3xl overflow-hidden group transition-all duration-300 hover:scale-[1.01]"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,176,32,0.08) 0%, rgba(255,176,32,0.02) 100%)', 
              border: '1px solid rgba(255,176,32,0.2)' 
            }}
          >
            <div className="absolute inset-0 bg-radial-glow opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 100% 100%, rgba(255,176,32,0.12) 0%, transparent 70%)' }} />
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,176,32,0.15)', border: '1px solid rgba(255,176,32,0.25)' }}>
              <Trophy size={18} fill="#FFB020" className="text-yellow-500" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-white leading-none">{points.allTime || 0}</p>
              <p className="text-[10px] mt-1 font-bold uppercase tracking-wider text-yellow-500">All-time Points</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── METRICS GRID ── */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3.5">
          <Shimmer className="h-32" />
          <Shimmer className="h-32" />
          <Shimmer className="h-32" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3.5">
          <StatCard 
            label="Total XP" 
            value={points.allTime || 0} 
            icon={Trophy} 
            accent="#FFB020" 
            delay={0.12} 
            description="Lifetime Points"
          />
          <StatCard 
            label="Weekly XP" 
            value={points.weekly || 0} 
            icon={TrendingUp} 
            accent="#10B981" 
            delay={0.18} 
            description="This week's gain"
          />
          <StatCard 
            label="Completed" 
            value={progress.totalWatched || 0} 
            icon={CheckCircle} 
            accent="#FF6B4A" 
            delay={0.24} 
            description="Lectures Finished"
          />
        </div>
      )}

      {/* ── CONTINUE LEARNING (RESUME CAROUSEL - Displays last 10 contents) ── */}
      {!isLoading && (recentlyWatched.length > 0 || (continueUrl && lastContent)) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
              <Clock size={12} className="text-primary-400" />
              Resume Learning {recentlyWatched.length > 0 && `(${recentlyWatched.length})`}
            </h3>
            {progress.lastContentAt && (
              <span className="text-[10px] font-semibold flex items-center gap-1 bg-white/[0.03] px-2.5 py-1 rounded-full text-white/50 border border-white/[0.04]">
                Recent activities
              </span>
            )}
          </div>

          {recentlyWatched.length > 0 ? (
            /* Horizontal Carousel of up to 10 recently watched items */
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {recentlyWatched.map((item, idx) => {
                const itemUrl = item.courseId && item.subjectId && item.contentId
                  ? `/courses/${item.courseId}/subjects/${item.subjectId}/content/${item.contentId}`
                  : item.courseId && item.subjectId
                  ? `/courses/${item.courseId}/subjects/${item.subjectId}`
                  : '#'
                
                return (
                  <motion.div
                    key={item.contentId || idx}
                    className="min-w-[280px] w-[280px] flex-shrink-0"
                    whileHover={{ y: -2 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Link to={itemUrl} className="block group">
                      <div className="p-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 relative overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 107, 74, 0.08) 0%, rgba(255, 107, 74, 0.02) 100%)',
                          border: '1px solid rgba(255, 107, 74, 0.18)',
                        }}
                      >
                        {/* Ambient glow in individual card */}
                        <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-md bg-white/[0.03]"
                          style={{ border: '1px solid rgba(255, 107, 74, 0.15)' }}>
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Play size={16} className="text-primary-400" />
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={10} fill="white" color="white" />
                          </div>
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-primary-400 transition-colors duration-200">
                            {item.title || 'Untitled Lesson'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{
                                background: item.type === 'pdf' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 107, 74, 0.15)',
                                color: item.type === 'pdf' ? '#ef4444' : '#FF9270',
                              }}>
                              {item.type === 'pdf' ? 'PDF' : 'Video'}
                            </span>
                            {item.lastActiveAt && (
                              <span className="text-[10px] text-white/30 truncate">
                                {new Date(item.lastActiveAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Play Arrow icon */}
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 transition-all duration-300 bg-primary-500/10 border border-primary-500/20">
                          <ArrowRight size={13} className="text-primary-400" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            /* Fallback single resume card if local history is empty */
            <Link to={continueUrl}>
              <div
                className="group flex items-center gap-4 p-4.5 rounded-3xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 107, 74, 0.08) 0%, rgba(255, 107, 74, 0.02) 100%)',
                  border: '1px solid rgba(255, 107, 74, 0.2)',
                }}
              >
                <div className="absolute -right-20 -bottom-20 w-44 h-44 bg-primary-500/10 rounded-full blur-[40px] pointer-events-none group-hover:scale-110 transition-transform duration-500" />

                <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-lg shadow-black/20"
                  style={{ background: 'rgba(255, 107, 74, 0.12)', border: '1px solid rgba(255, 107, 74, 0.15)' }}>
                  {lastContent?.thumbnailUrl ? (
                    <img src={lastContent.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Play size={20} className="text-primary-400" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Play size={12} fill="white" color="white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {contentLoading ? (
                    <div className="space-y-2">
                      <Shimmer className="h-4 w-48" />
                      <Shimmer className="h-3.5 w-28" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-primary-400 transition-colors duration-200">
                        {lastContent?.title || 'Resume where you left off'}
                      </p>
                      <div className="flex items-center gap-2.5 mt-1.5">
                        {lastContent?.type && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                            style={{
                              background: lastContent.type === 'pdf' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 107, 74, 0.15)',
                              color: lastContent.type === 'pdf' ? '#ef4444' : '#FF9270',
                              border: lastContent.type === 'pdf' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,107,74,0.2)'
                            }}>
                            {lastContent.type === 'pdf' ? 'PDF Resource' : 'Video Lecture'}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-white/40 flex items-center gap-1">
                          Tap to resume <ChevronRight size={10} />
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:translate-x-1 group-hover:scale-105 transition-all duration-300"
                  style={{ background: 'rgba(255, 107, 74, 0.15)', border: '1px solid rgba(255, 107, 74, 0.25)' }}>
                  <ArrowRight size={15} className="text-primary-400" />
                </div>
              </div>
            </Link>
          )}
        </motion.div>
      )}

      {/* ── MY ENROLLED COURSES ── */}
      {isLoading ? (
        <div className="space-y-4">
          <Shimmer className="h-4 w-28" />
          <div className="grid grid-cols-2 gap-4">
            <Shimmer className="aspect-[4/3]" />
            <Shimmer className="aspect-[4/3]" />
          </div>
        </div>
      ) : purchases.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
              <GraduationCap size={13} className="text-primary-400" />
              My Enrolled Courses
            </h3>
            <Link to="/my-courses"
              className="text-xs font-semibold flex items-center gap-0.5 text-primary-400 hover:text-primary-300 transition-colors duration-200 bg-primary-500/8 px-3 py-1 rounded-full border border-primary-500/12">
              See All ({purchases.length}) <ArrowRight size={11} className="ml-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {purchases.slice(0, 4).map((purchase, i) => (
              <CourseCard key={purchase.id || purchase._id || i} purchase={purchase} index={i} />
            ))}
          </div>
        </motion.div>
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
