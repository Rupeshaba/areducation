import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp, CheckCircle, BookOpen, Trophy, Target,
  BarChart3, Flame, Zap, Star, Calendar, Award, ShoppingBag, ClipboardList
} from 'lucide-react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Cell
} from 'recharts'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { useCoursesProgress } from '../../hooks/useCoursesProgress'
import { getWeeklyActivity } from '../../utils/progress'
import { getAllRecentAttempts } from '../../utils/quizCache'

const COLORS = {
  primary: '#8B7CFF',
  mint: '#2DD4BF',
  amber: '#FFB020',
  danger: '#FF5C5C',
}

/* ─── Shimmer ─── */
function Shimmer({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-white/[0.03] via-white/[0.08] to-white/[0.03] bg-[length:200%_100%] ${className}`}
      style={{ animation: 'shimmer 1.5s infinite' }} />
  )
}

/* ─── Chart tooltip (shared look) ─── */
const chartTooltipStyle = {
  contentStyle: { background: '#0B0E1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: 'rgba(255,255,255,0.5)' },
}

/* ─── Circular Stat ─── */
function CircleStat({ label, value, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-4 sm:p-5 text-center hover:border-white/[0.15] transition-all duration-500"
    >
      <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4">
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
      <div className="text-xs sm:text-sm font-bold text-white mb-1">{label}</div>
      <div className="hidden sm:block text-xs text-gray-500">{value >= 80 ? 'Excellent!' : value >= 50 ? 'Good progress' : 'Keep going'}</div>
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
      className="relative overflow-hidden rounded-xl p-3.5 sm:p-4 border transition-all duration-300 hover:scale-[1.02] group"
      style={{ backgroundColor: `${color}08`, borderColor: `${color}20` }}
    >
      <Icon size={16} style={{ color }} className="mb-2.5 sm:mb-3" />
      <div className="text-xl sm:text-2xl font-black text-white mb-1">{value.toLocaleString()}</div>
      <div className="text-[10px] sm:text-xs font-medium uppercase tracking-wider" style={{ color: `${color}aa` }}>{label}</div>
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
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{label}</span>
      </div>
      <span className="text-sm font-bold text-white text-right">{value}</span>
    </motion.div>
  )
}

/* ─── Empty State ─── */
function EmptyState({ icon: Icon, title, subtitle, cta, to }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
        <Icon size={22} className="text-gray-500" />
      </div>
      <p className="text-sm font-bold text-white mb-1">{title}</p>
      <p className="text-xs text-gray-500 mb-4">{subtitle}</p>
      {cta && (
        <Link to={to} className="inline-block text-xs font-bold text-primary-400 hover:text-primary-300 px-4 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20 transition-colors">
          {cta}
        </Link>
      )}
    </div>
  )
}

/* ─── Section wrapper ─── */
function Section({ title, icon: Icon, iconColor, delay, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-4 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-4 sm:mb-5">
        <Icon size={18} className={iconColor} />
        <h2 className="text-base sm:text-lg font-bold text-white">{title}</h2>
      </div>
      {children}
    </motion.div>
  )
}

export default function Progress() {
  const user = useAuthStore(s => s.user)

  const { data: pointsData, isLoading: pointsLoading } = useQuery({
    queryKey: ['my-points'],
    queryFn: () => api.get('/my-points').then(r => r.data),
  })

  const { data: purchasesData } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/store/my-purchases').then(r => r.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  // Content-completion progress (overall + per-course) comes entirely from
  // local cache/local completion state — see hooks/useCoursesProgress.js
  // and utils/progress.js.
  const purchases = purchasesData?.purchases || []
  const courseIds = purchases.map(p => p.courseId).filter(Boolean)
  const { courseProgress, overall } = useCoursesProgress(courseIds)

  // Quiz attempt history — read from the same cache Home/QuizResult already
  // populate on every submit (utils/quizCache.js), instead of a separate
  // key nothing was writing to.
  const recentAttempts = getAllRecentAttempts(20)
  const weeklyActivity = getWeeklyActivity()

  const points = pointsData?.points || {}

  const completedContent = overall.completed
  const totalContent = overall.total
  const completionPct = totalContent > 0 ? Math.round((completedContent / totalContent) * 100) : 0

  const avgScore = recentAttempts.length > 0
    ? Math.round(recentAttempts.reduce((s, a) => s + a.score, 0) / recentAttempts.length)
    : 0
  const bestScore = recentAttempts.length > 0 ? Math.max(...recentAttempts.map(a => a.score)) : 0
  const totalQuizPoints = recentAttempts.reduce((s, a) => s + (a.points || 0), 0)

  // Oldest → newest for the trend line.
  const scoreTrendData = recentAttempts.slice().reverse().map((a, i) => ({
    label: `#${i + 1}`,
    score: a.score,
  }))

  const pointsBreakdownData = [
    { label: 'Today', value: points.daily || 0, color: COLORS.primary },
    { label: 'Weekly', value: points.weekly || 0, color: COLORS.mint },
    { label: 'Monthly', value: points.monthly || 0, color: COLORS.amber },
    { label: 'All Time', value: points.allTime || 0, color: COLORS.danger },
  ]

  const courseProgressData = purchases.map((purchase) => {
    const course = purchase.courseDetails || {}
    const courseId = course.id || course._id || purchase.courseId
    const cp = courseProgress[courseId] || { completed: 0, total: 0 }
    const pct = cp.total > 0 ? Math.round((cp.completed / cp.total) * 100) : 0
    return { name: purchase.courseName, pct, completed: cp.completed, total: cp.total }
  })

  const isLoading = pointsLoading

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 px-1 sm:px-0">

      {/* ═══ HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary-600/20 via-primary-500/10 to-transparent border border-primary-500/20 p-5 sm:p-8"
      >
        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-violet-500/15 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary-500/25 to-primary-600/10 border border-primary-500/30 flex items-center justify-center shadow-lg shadow-primary-500/10 flex-shrink-0">
            <BarChart3 size={24} className="text-primary-400 sm:hidden" />
            <BarChart3 size={32} className="text-primary-400 hidden sm:block" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-black text-white mb-1">Your Progress</h1>
            <p className="text-gray-400 text-xs sm:text-sm">Track every milestone on your learning journey</p>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="relative z-10 flex flex-wrap gap-2 sm:gap-3 mt-5 sm:mt-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Flame size={14} className="text-orange-400" />
            <span className="text-xs sm:text-sm text-gray-300 font-medium">{user?.streak || 0} day streak</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Trophy size={14} className="text-amber-400" />
            <span className="text-xs sm:text-sm text-gray-300 font-medium">{points.allTime || 0} total points</span>
          </div>
        </div>
      </motion.div>

      {/* ═══ LOADING STATE ═══ */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
                <Shimmer className="w-16 h-16 rounded-full mx-auto mb-4" />
                <Shimmer className="h-3 w-16 rounded mx-auto" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 space-y-3">
            <Shimmer className="h-5 w-40 rounded" />
            <Shimmer className="h-40 rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          {/* ═══ PERFORMANCE OVERVIEW ═══ */}
          <div>
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <Target size={16} className="text-primary-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">Performance Overview</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <CircleStat label="Content Done" value={completionPct} color={COLORS.primary} delay={0} />
              <CircleStat label="Quiz Average" value={avgScore} color={COLORS.mint} delay={0.1} />
              <CircleStat label="Best Score" value={bestScore} color={COLORS.amber} delay={0.2} />
              <CircleStat label="Weekly Goal" value={Math.min(Math.round((points.weekly || 0) / 10), 100)} color={COLORS.danger} delay={0.3} />
            </div>
          </div>

          {/* ═══ WEEKLY ACTIVITY GRAPH ═══ */}
          <Section title="Weekly Activity" icon={Calendar} iconColor="text-primary-400" delay={0.15}>
            <p className="text-xs text-gray-500 mb-3 -mt-1">Content completed per day, last 7 days</p>
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer>
                <BarChart data={weeklyActivity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip {...chartTooltipStyle} formatter={(v) => [v, 'Completed']} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={COLORS.primary} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* ═══ POINTS BREAKDOWN ═══ */}
          <Section title="Points Breakdown" icon={Award} iconColor="text-amber-400" delay={0.2}>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <PointsCard label="All Time" value={points.allTime || 0} color={COLORS.danger} icon={Trophy} delay={0.1} />
              <PointsCard label="Monthly" value={points.monthly || 0} color={COLORS.amber} icon={Calendar} delay={0.15} />
              <PointsCard label="Weekly" value={points.weekly || 0} color={COLORS.mint} icon={TrendingUp} delay={0.2} />
              <PointsCard label="Today" value={points.daily || 0} color={COLORS.primary} icon={Star} delay={0.25} />
            </div>
            <div style={{ width: '100%', height: 160 }}>
              <ResponsiveContainer>
                <BarChart data={pointsBreakdownData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip {...chartTooltipStyle} formatter={(v) => [v, 'Points']} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {pointsBreakdownData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* ═══ STUDY STATS ═══ */}
          <Section title="Study Stats" icon={BarChart3} iconColor="text-primary-400" delay={0.25}>
            <div className="space-y-1">
              <StudyRow label="Study Streak" value={`${user?.streak || 0} days 🔥`} icon={Flame} color="#f97316" delay={0.1} />
              <StudyRow label="Content Completed" value={`${completedContent} / ${totalContent}`} icon={CheckCircle} color="#6366f1" delay={0.15} />
              <StudyRow label="Quizzes Taken" value={recentAttempts.length} icon={Target} color="#10b981" delay={0.2} />
              <StudyRow label="Points from Quizzes" value={totalQuizPoints} icon={Zap} color="#f59e0b" delay={0.25} />
            </div>
          </Section>

          {/* ═══ COURSE PROGRESS ═══ */}
          <Section title="Course Progress" icon={BookOpen} iconColor="text-primary-400" delay={0.3}>
            {courseProgressData.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No courses yet"
                subtitle="Purchase a course to start tracking your progress here."
                cta="Browse courses"
                to="/store"
              />
            ) : (
              <div style={{ width: '100%', height: Math.max(courseProgressData.length * 46, 120) }}>
                <ResponsiveContainer>
                  <BarChart
                    data={courseProgressData}
                    layout="vertical"
                    margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                    barCategoryGap={14}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (v && v.length > 16 ? v.slice(0, 15) + '…' : v)}
                    />
                    <Tooltip
                      {...chartTooltipStyle}
                      formatter={(v, n, p) => [`${v}% (${p.payload.completed}/${p.payload.total})`, 'Completed']}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Bar dataKey="pct" radius={[0, 6, 6, 0]} fill={COLORS.primary} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          {/* ═══ QUIZ SCORE TREND ═══ */}
          <Section title="Quiz Score Trend" icon={TrendingUp} iconColor="text-mint-400" delay={0.35}>
            {scoreTrendData.length < 2 ? (
              <EmptyState
                icon={ClipboardList}
                title="Not enough quiz data yet"
                subtitle="Take at least 2 quizzes to see your score trend here."
                cta="Find a quiz"
                to="/my-courses"
              />
            ) : (
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={scoreTrendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip {...chartTooltipStyle} formatter={(v) => [`${v}%`, 'Score']} />
                    <Line type="monotone" dataKey="score" stroke={COLORS.mint} strokeWidth={2.5} dot={{ r: 3.5, fill: COLORS.mint }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          {/* ═══ RECENT QUIZZES ═══ */}
          {recentAttempts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-mint-400" />
                <h2 className="text-base sm:text-lg font-bold text-white">Recent Quiz Attempts</h2>
              </div>
              <div className="space-y-2.5">
                {recentAttempts.slice(0, 8).map((attempt, i) => {
                  const color = attempt.score >= 75 ? COLORS.mint : attempt.score >= 50 ? COLORS.amber : COLORS.danger
                  return (
                    <motion.div
                      key={attempt.attemptId || i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className="flex items-center gap-3 sm:gap-4 rounded-xl border p-3 sm:p-4"
                      style={{ backgroundColor: `${color}0D`, borderColor: `${color}30` }}
                    >
                      <div className="relative w-11 h-11 sm:w-14 sm:h-14 flex-shrink-0">
                        <svg className="w-11 h-11 sm:w-14 sm:h-14 transform -rotate-90">
                          <circle cx="50%" cy="50%" r="42%" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
                          <circle
                            cx="50%" cy="50%" r="42%"
                            stroke={color}
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 0.42 * 56}`}
                            strokeDashoffset={`${2 * Math.PI * 0.42 * 56 * (1 - attempt.score / 100)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs sm:text-sm font-black" style={{ color }}>{attempt.score}%</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate mb-1">{attempt.quizName}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1 truncate">
                            <Target size={10} className="flex-shrink-0" /> <span className="truncate">{attempt.subject}</span>
                          </span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <CheckCircle size={10} /> {attempt.correct}/{attempt.total}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="flex items-center gap-1 text-primary-400">
                          <Zap size={12} />
                          <span className="text-sm font-bold">+{attempt.points || 0}</span>
                        </div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">points</div>
                      </div>
                    </motion.div>
                  )
                })}
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
