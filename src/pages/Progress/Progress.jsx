import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp, CheckCircle, BookOpen, Trophy, Clock, Target,
  BarChart3, Flame, Zap, Star, ArrowUpRight, Calendar, Award, Layers
} from 'lucide-react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'

/* ─── Shimmer ─── */
function Shimmer({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-white/[0.03] via-white/[0.08] to-white/[0.03] bg-[length:200%_100%] ${className}`}
      style={{ animation: 'shimmer 1.5s infinite' }} />
  )
}

/* ─── Stat Card ─── */
function StatCard({ label, value, icon: Icon, color, bg, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-5 hover:border-white/[0.15] hover:bg-white/[0.05] transition-all duration-500 group"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`} style={{ backgroundColor: `${color}15` }}>
          <Icon size={22} style={{ color }} />
        </div>
        <div className="text-3xl font-black text-white mb-1">{value}</div>
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</div>
      </div>
    </motion.div>
  )
}

/* ─── Circular Stat ─── */
function CircleStat({ label, value, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-5 text-center hover:border-white/[0.15] transition-all duration-500"
    >
      <div className="w-24 h-24 mx-auto mb-4">
        <CircularProgressbar
          value={value}
          text={`${value}%`}
          styles={buildStyles({
            pathColor: color,
            textColor: '#ffffff',
            trailColor: 'rgba(255,255,255,0.05)',
            textSize: '24px',
            pathTransitionDuration: 1,
          })}
        />
      </div>
      <div className="text-sm font-bold text-white mb-1">{label}</div>
      <div className="text-xs text-gray-500">{value >= 80 ? 'Excellent!' : value >= 50 ? 'Good progress' : 'Keep going'}</div>
    </motion.div>
  )
}

/* ─── Points Card ─── */
function PointsCard({ label, value, color, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="relative overflow-hidden rounded-xl p-4 border transition-all duration-300 hover:scale-[1.02] group"
      style={{ backgroundColor: `${color}08`, borderColor: `${color}20` }}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon size={18} style={{ color }} />
        <ArrowUpRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
      </div>
      <div className="text-2xl font-black text-white mb-1">{value.toLocaleString()}</div>
      <div className="text-xs font-medium uppercase tracking-wider" style={{ color: `${color}aa` }}>{label}</div>
    </motion.div>
  )
}

/* ─── Study Stat Row ─── */
function StudyRow({ label, value, icon: Icon, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center justify-between py-3.5 border-b border-white/[0.05] last:border-0 group"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{label}</span>
      </div>
      <span className="text-sm font-bold text-white">{value}</span>
    </motion.div>
  )
}

/* ─── Subject Progress Row ─── */
function SubjectProgressRow({ subject, progress, index }) {
  const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}>
          <Layers size={14} className="text-primary-400" />
        </div>
        <span className="text-sm text-gray-300">{subject.name || subject.id}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">{progress.completed}/{progress.total}</span>
        <div className="w-12 h-12 relative">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
            <circle
              cx="12" cy="12" r="10"
              stroke="#10b981"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 10}`}
              strokeDashoffset={`${2 * Math.PI * 10 * (1 - progressPct / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{progressPct}%</span>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Quiz Attempt Card ─── */
function QuizCard({ attempt, index }) {
  const getColor = (score) => {
    if (score >= 80) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', bar: '#10b981' }
    if (score >= 50) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', bar: '#f59e0b' }
    return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', bar: '#ef4444' }
  }

  const colors = getColor(attempt.score)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`relative overflow-hidden rounded-xl ${colors.bg} border ${colors.border} p-4 hover:scale-[1.01] transition-all duration-300`}
    >
      <div className="flex items-center gap-4">
        {/* Score Circle */}
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 transform -rotate-90">
            <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
            <circle
              cx="28" cy="28" r="24"
              stroke={colors.bar}
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - attempt.score / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-black ${colors.text}`}>{attempt.score}%</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate mb-1">{attempt.quizName}</div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Target size={10} /> {attempt.subject}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle size={10} /> {attempt.correct}/{attempt.total}
            </span>
          </div>
        </div>

        {/* Points */}
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center gap-1 text-primary-400">
            <Zap size={12} />
            <span className="text-sm font-bold">+{attempt.points || 0}</span>
          </div>
          <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">points</div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Progress() {
  const user = useAuthStore(s => s.user)

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['user-progress'],
    queryFn: () => api.get('/user/progress').then(r => r.data),
  })

  const { data: pointsData, isLoading: pointsLoading } = useQuery({
    queryKey: ['my-points'],
    queryFn: () => api.get('/my-points').then(r => r.data),
  })

  const { data: purchasesData } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/store/my-purchases').then(r => r.data),
  })

  // Fetch course-wise progress for all purchased courses
  const purchases = purchasesData?.purchases || []
  const { data: courseProgressData, isLoading: courseProgressLoading } = useQuery({
    queryKey: ['all-courses-progress', purchases.map(p => p.courseId).join(',')],
    queryFn: async () => {
      const results = {}
      for (const purchase of purchases) {
        const courseId = purchase.courseId
        if (courseId) {
          try {
            const res = await api.get(`/user/progress?courseId=${courseId}`)
            results[courseId] = res.data
          } catch (e) {
            results[courseId] = { progress: { totalSeen: 0, totalWatched: 0 }, subjectProgress: {} }
          }
        }
      }
      return results
    },
    enabled: !!purchases.length,
    staleTime: 0,
    gcTime: 60000,
  })

  const recentAttempts = (() => {
    try { return JSON.parse(localStorage.getItem('ar_recent_attempts') || '[]') } catch { return [] }
  })()

  const progress = progressData?.progress || {}
  const points = pointsData?.points || {}

  const completedContent = progress.totalWatched || 0
  const totalContent = progress.totalSeen || 0
  const completionPct = totalContent > 0 ? Math.round((completedContent / totalContent) * 100) : 0

  const avgScore = recentAttempts.length > 0
    ? Math.round(recentAttempts.reduce((s, a) => s + a.score, 0) / recentAttempts.length)
    : 0

  const bestScore = recentAttempts.length > 0 ? Math.max(...recentAttempts.map(a => a.score)) : 0
  const totalPoints = recentAttempts.reduce((s, a) => s + (a.points || 0), 0)

  const isLoading = progressLoading || pointsLoading

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      
      {/* ═══ HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600/20 via-primary-500/10 to-transparent border border-primary-500/20 p-6 sm:p-8"
      >
        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-violet-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/25 to-primary-600/10 border border-primary-500/30 flex items-center justify-center shadow-lg shadow-primary-500/10">
            <BarChart3 size={32} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-1">Your Progress</h1>
            <p className="text-gray-400 text-sm">Track every milestone on your learning journey</p>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="relative z-10 flex flex-wrap gap-3 mt-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Flame size={14} className="text-orange-400" />
            <span className="text-sm text-gray-300 font-medium">{user?.streak || 0} day streak</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Trophy size={14} className="text-amber-400" />
            <span className="text-sm text-gray-300 font-medium">{points.allTime || 0} total points</span>
          </div>
        </div>
      </motion.div>

      {/* ═══ LOADING STATE ═══ */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
                <Shimmer className="w-12 h-12 rounded-xl mb-4" />
                <Shimmer className="h-8 w-20 rounded mb-2" />
                <Shimmer className="h-3 w-16 rounded" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 space-y-3">
            <Shimmer className="h-5 w-40 rounded" />
            <div className="grid grid-cols-2 gap-3">
              <Shimmer className="h-20 rounded-xl" />
              <Shimmer className="h-20 rounded-xl" />
              <Shimmer className="h-20 rounded-xl" />
              <Shimmer className="h-20 rounded-xl" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ═══ CIRCULAR PROGRESS ═══ */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Target size={16} className="text-primary-400" />
              <h2 className="text-lg font-bold text-white">Performance Overview</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <CircleStat label="Content Done" value={completionPct} color="#6366f1" delay={0} />
              <CircleStat label="Quiz Average" value={avgScore} color="#10b981" delay={0.1} />
              <CircleStat label="Best Score" value={bestScore} color="#f59e0b" delay={0.2} />
              <CircleStat label="Weekly Goal" value={Math.min(Math.round((points.weekly || 0) / 10), 100)} color="#8b5cf6" delay={0.3} />
            </div>
          </div>

          {/* ═══ POINTS BREAKDOWN ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Award size={18} className="text-amber-400" />
              <h2 className="text-lg font-bold text-white">Points Breakdown</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PointsCard label="All Time" value={points.allTime || 0} color="#f59e0b" icon={Trophy} delay={0.1} />
              <PointsCard label="Monthly" value={points.monthly || 0} color="#3b82f6" icon={Calendar} delay={0.15} />
              <PointsCard label="Weekly" value={points.weekly || 0} color="#10b981" icon={TrendingUp} delay={0.2} />
              <PointsCard label="Today" value={points.daily || 0} color="#8b5cf6" icon={Star} delay={0.25} />
            </div>
          </motion.div>

          {/* ═══ STUDY STATS ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-primary-400" />
              <h2 className="text-lg font-bold text-white">Study Stats</h2>
            </div>
            <div className="space-y-1">
              <StudyRow label="Study Streak" value={`${user?.streak || 0} days 🔥`} icon={Flame} color="#f97316" delay={0.1} />
              <StudyRow label="Content Completed" value={`${completedContent} / ${totalContent}`} icon={CheckCircle} color="#6366f1" delay={0.15} />
              <StudyRow label="Quizzes Taken" value={recentAttempts.length} icon={Target} color="#10b981" delay={0.2} />
              <StudyRow label="Points from Quizzes" value={totalPoints} icon={Zap} color="#f59e0b" delay={0.25} />
            </div>
          </motion.div>

          {/* ═══ COURSE PROGRESS ═══ */}
          {purchases.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={18} className="text-primary-400" />
                <h2 className="text-lg font-bold text-white">Course Progress</h2>
              </div>
              <div className="space-y-1">
                {purchases.map((purchase, i) => {
                  const course = purchase.courseDetails || {}
                  const courseId = course.id || course._id || purchase.courseId
                  const courseProgress = courseProgressData?.[courseId]?.progress || { totalSeen: 0, totalWatched: 0 }
                  const progressPct = courseProgress.totalSeen > 0 
                    ? Math.round((courseProgress.totalWatched / courseProgress.totalSeen) * 100) 
                    : 0
                  
                  return (
                    <div key={purchase.id} className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}>
                          <BookOpen size={14} className="text-primary-400" />
                        </div>
                        <span className="text-sm text-gray-300">{purchase.courseName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{courseProgress.totalWatched}/{courseProgress.totalSeen}</span>
                        <div className="w-12 h-12 relative">
                          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
                            <circle
                              cx="12" cy="12" r="10"
                              stroke="#6366f1"
                              strokeWidth="2"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 10}`}
                              strokeDashoffset={`${2 * Math.PI * 10 * (1 - progressPct / 100)}`}
                              strokeLinecap="round"
                              className="transition-all duration-500"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{progressPct}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ SUBJECT PROGRESS ═══ */}
          {purchases.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Layers size={18} className="text-primary-400" />
                <h2 className="text-lg font-bold text-white">Subject Progress</h2>
              </div>
              <div className="space-y-1">
                {purchases.map((purchase, i) => {
                  const course = purchase.courseDetails || {}
                  const courseId = course.id || course._id || purchase.courseId
                  const subjectProgress = courseProgressData?.[courseId]?.subjectProgress || {}
                  
                  return Object.entries(subjectProgress).map(([subjectId, sp], j) => (
                    <div key={subjectId} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}>
                          <Layers size={12} className="text-primary-400" />
                        </div>
                        <span className="text-xs text-gray-400">{subjectId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">{sp.completed}/{sp.total}</span>
                        <div className="w-8 h-8 relative">
                          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 16 16">
                            <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" fill="none" />
                            <circle
                              cx="8" cy="8" r="6"
                              stroke="#10b981"
                              strokeWidth="1.5"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 6}`}
                              strokeDashoffset={`${2 * Math.PI * 6 * (1 - (sp.total > 0 ? sp.completed / sp.total : 0))}`}
                              strokeLinecap="round"
                              className="transition-all duration-500"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                            {sp.total > 0 ? Math.round((sp.completed / sp.total) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ RECENT QUIZZES ═══ */}
          {recentAttempts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Recent Quiz Attempts</h2>
              </div>
              <div className="space-y-3">
                {recentAttempts.map((attempt, i) => (
                  <QuizCard key={i} attempt={attempt} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </>
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
