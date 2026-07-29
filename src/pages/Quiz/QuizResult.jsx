import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, XCircle, MinusCircle, Trophy, RotateCcw,
  BarChart3, ChevronLeft, ChevronRight, X, BookOpen, Target,
  ChevronDown, Clock, TrendingUp, Check, Share2, Medal, Crown,
  Zap, Timer, Target as TargetIcon
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import api from '../../api/axios'
import { findAttemptById, getQuizEntry } from '../../utils/quizCache'
import ShareQuizModal from '../../components/ShareQuizModal'

/* ═══ SWIPE HOOK ═══ */
function useSwipeQuestion(onNext, onPrev) {
  const startX = useRef(null)
  const startY = useRef(null)
  function onTouchStart(e) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }
  function onTouchEnd(e) {
    if (startX.current === null) return
    const dx = startX.current - e.changedTouches[0].clientX
    const dy = Math.abs(startY.current - e.changedTouches[0].clientY)
    startX.current = null
    startY.current = null
    if (Math.abs(dx) < 56 || dy > 70) return
    if (dx > 0) onNext()
    else onPrev()
  }
  return { onTouchStart, onTouchEnd }
}

const formatMMSS = (s) => {
  if (!s) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const formatAttemptDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

/* ═══ ATTEMPT DROPDOWN ═══ */
function AttemptDropdown({ attempts, selectedIndex, onSelect }) {
  const [open, setOpen] = useState(false)
  const total = attempts.length
  const selected = attempts[selectedIndex]
  if (!selected) return null

  return (
    <div className="relative w-full">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3.5 rounded-2xl bg-[#181B2D] border border-white/[0.05] hover:bg-[#1F2340] transition-all"
      >
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[14px] font-bold text-white">Latest Attempt</span>
          <span className="text-[12px] text-gray-500 truncate">{formatAttemptDate(selected.completedAt)}</span>
        </div>
        <span className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-sm font-bold ${selected.score >= 75 ? 'text-emerald-400' : selected.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {Math.round(selected.score)}%
          </span>
          <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl bg-[#0B0E1A] border border-white/[0.08] shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
            >
              {attempts.map((a, i) => {
                const attemptNo = total - i
                const isSelected = i === selectedIndex
                return (
                  <button
                    key={a.attemptId || i}
                    onClick={() => { onSelect(i); setOpen(false) }}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-3.5 text-left transition-colors ${
                      isSelected ? 'bg-primary-500/10' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-white flex-shrink-0">
                        {i === 0 ? 'Latest' : `Attempt ${attemptNo}`}
                      </span>
                      <span className="text-[11px] text-gray-500 truncate">{formatAttemptDate(a.completedAt)}</span>
                    </span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-bold ${a.score >= 75 ? 'text-emerald-400' : a.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {Math.round(a.score)}%
                      </span>
                      {isSelected && <Check size={14} className="text-primary-400" />}
                    </span>
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ PROGRESS GRAPH ═══ */
function ProgressGraph({ attempts, selectedAttemptId }) {
  const chartData = useMemo(() => (
    attempts.slice().reverse().map((a, i) => ({
      label: `Attempt ${i + 1}`,
      score: Math.round(a.score),
      attemptId: a.attemptId,
    }))
  ), [attempts])

  if (attempts.length < 2) {
    return (
      <div className="rounded-2xl border border-white/[0.05] bg-[#13162A] p-6 text-center">
        <TrendingUp size={22} className="text-primary-400/40 mx-auto mb-2" />
        <p className="text-xs text-gray-500">Take this quiz again to track your progress over time.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#181B2D] p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary-400" />
          <h4 className="text-sm font-bold text-white">Progress Over Attempts</h4>
        </div>
        <button className="text-[11px] text-primary-400 bg-primary-500/10 px-3 py-1 rounded-full">View All</button>
      </div>
      <div style={{ width: '100%', height: 150 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="1" y2="0">
                <stop offset="5%" stopColor="#A855F7" stopOpacity="0.1"/>
                <stop offset="95%" stopColor="#F43F5E" stopOpacity="1"/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} strokeDasharray="4 4" />
            <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }}
              contentStyle={{ background: '#1A1C31', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12, padding: '8px 12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2px', fontSize: 11 }}
              itemStyle={{ color: '#A855F7', fontWeight: 'bold' }}
              formatter={(v) => [`${v}%`, 'Score']}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#colorScore)"
              strokeWidth={2}
              dot={(props) => {
                const isSel = props.payload.attemptId === selectedAttemptId
                return (
                  <circle
                    key={props.payload.label}
                    cx={props.cx}
                    cy={props.cy}
                    r={isSel ? 5 : 3}
                    fill={isSel ? '#fff' : '#A855F7'}
                    stroke={isSel ? '#F43F5E' : 'none'}
                    strokeWidth={isSel ? 2.5 : 0}
                  />
                )
              }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#181B2D] to-transparent pointer-events-none" />
    </div>
  )
}

/* ═══ LEADERBOARD HELPER ═══ */
function nameColor(name) {
  const colors = ['#F43F5E', '#8B5CF6', '#3B82F6', '#EC4899', '#F59E0B', '#10B981']
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return colors[h % colors.length]
}

function Avatar({ name, avatarUrl, size = "w-10 h-10", textSize = "text-sm", borderColor = "border-white/10" }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${size} rounded-full object-cover border-2 ${borderColor}`} />
  }
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <div className={`${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${textSize} border-2 ${borderColor}`} style={{ background: nameColor(name) }}>
      {letter}
    </div>
  )
}

/* ═══ PER-QUIZ LEADERBOARD ═══ */
function QuizLeaderboard({ quizId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['quiz-leaderboard', quizId],
    queryFn: () => api.get(`/leaderboard/${quizId}`).then(r => r.data),
    enabled: !!quizId,
    staleTime: 30_000,
  })

  if (!quizId) return null

  const rows = data?.leaderboard || []
  const top3 = rows.filter(r => r.rank <= 3)
  const others = rows.filter(r => r.rank > 3)
  
  const podiumDisplay = top3.reduce((acc, cur) => {
    if (cur.rank === 1) acc[1] = cur
    else if (cur.rank === 2) acc[0] = cur
    else if (cur.rank === 3) acc[2] = cur
    return acc
  }, [null, null, null])

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#181B2D] p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-400" />
          <h4 className="text-sm font-bold text-white">Quiz Leaderboard</h4>
        </div>
        <button className="text-[11px] text-primary-400 bg-primary-500/10 px-3 py-1 rounded-full">View Full</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <p className="text-center text-xs text-gray-500 py-6">Unable to load leaderboard</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-xs text-gray-500 py-6">Be the first to take this quiz! 🎉</p>
      ) : (
        <>
          {/* PODIUM */}
          <div className="flex items-end justify-center gap-3 mb-6 pb-2 h-[170px]">
            {/* 2nd Place */}
            <div className="flex-1 flex flex-col items-center relative max-w-[100px] h-full justify-end">
              <div className="w-full bg-[#1A1C31] rounded-t-[20px] border border-gray-500/30 pb-4 pt-6 flex flex-col items-center h-[135px] justify-end relative">
                <span className="absolute top-2 text-2xl font-bold text-gray-500/40">2</span>
                <div className="flex flex-col items-center gap-1.5 w-full px-1">
                   <Avatar name={podiumDisplay[0]?.name} avatarUrl={podiumDisplay[0]?.avatarUrl} size="w-10 h-10" textSize="text-sm" borderColor="border-white/10" />
                   <span className="text-[11px] font-medium text-gray-200 truncate w-full text-center">{podiumDisplay[0]?.name || '-'}</span>
                   <span className="text-base font-bold text-white">{podiumDisplay[0] ? Math.round((podiumDisplay[0].correct / podiumDisplay[0].total) * 100) : 0}%</span>
                   <div className="flex items-center gap-1 text-[9px] text-gray-500">
                     <Clock size={10} /> {formatMMSS(podiumDisplay[0]?.timeTaken)}
                   </div>
                </div>
              </div>
            </div>

            {/* 1st Place - Exact Screenshot Style */}
            <div className="flex-1 flex flex-col items-center relative max-w-[110px] h-full justify-end z-10">
               <div className="absolute -top-2 text-amber-400 drop-shadow-lg"><Crown size={22} fill="#FBBF24" /></div>
               <div className="w-full bg-[#1A1C31] rounded-t-[20px] border border-amber-400/40 pb-5 pt-8 flex flex-col items-center h-[160px] justify-end relative">
                 <span className="absolute top-3 text-2xl font-bold text-amber-400/30">1</span>
                 
                 {/* Avatar with thick gold circle border and connecting line */}
                 <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-[3px] border-amber-400 flex items-center justify-center bg-[#1A1C31] overflow-hidden z-20 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                    <Avatar name={podiumDisplay[1]?.name} avatarUrl={podiumDisplay[1]?.avatarUrl} size="w-full h-full" textSize="text-base" borderColor="border-transparent" />
                 </div>
                 {/* Connecting Line */}
                 <div className="absolute top-[42px] left-1/2 -translate-x-1/2 w-[2px] h-3 bg-amber-400/40 z-10"></div>

                 <div className="flex flex-col items-center gap-1 mt-3 w-full px-1">
                    <span className="text-[11px] font-medium text-gray-200 truncate w-full text-center">{podiumDisplay[1]?.name || '-'}</span>
                    <span className="text-xl font-extrabold text-amber-400">{podiumDisplay[1] ? Math.round((podiumDisplay[1].correct / podiumDisplay[1].total) * 100) : 0}%</span>
                    <div className="flex items-center gap-1 text-[9px] text-gray-400">
                      <Clock size={10} /> {formatMMSS(podiumDisplay[1]?.timeTaken)}
                    </div>
                 </div>
               </div>
            </div>

            {/* 3rd Place */}
            <div className="flex-1 flex flex-col items-center relative max-w-[100px] h-full justify-end">
              <div className="w-full bg-[#1A1C31] rounded-t-[20px] border border-orange-500/30 pb-4 pt-6 flex flex-col items-center h-[115px] justify-end relative">
                <span className="absolute top-2 text-xl font-bold text-orange-500/40">3</span>
                <div className="flex flex-col items-center gap-1.5 w-full px-1">
                   <Avatar name={podiumDisplay[2]?.name} avatarUrl={podiumDisplay[2]?.avatarUrl} size="w-10 h-10" textSize="text-sm" borderColor="border-white/10" />
                   <span className="text-[11px] font-medium text-gray-200 truncate w-full text-center">{podiumDisplay[2]?.name || '-'}</span>
                   <span className="text-base font-bold text-orange-300">{podiumDisplay[2] ? Math.round((podiumDisplay[2].correct / podiumDisplay[2].total) * 100) : 0}%</span>
                   <div className="flex items-center gap-1 text-[9px] text-gray-500">
                     <Clock size={10} /> {formatMMSS(podiumDisplay[2]?.timeTaken)}
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* LIST (Rank 4+) */}
          <div className="space-y-2.5">
            {others.map((r) => {
              const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0
              const isMe = r.isMe
              return (
                <div
                  key={r.participantId}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors ${
                    isMe ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-500 w-5 text-center">{r.rank}</span>
                    <Avatar name={r.name} avatarUrl={r.avatarUrl} size="w-8 h-8" textSize="text-xs" borderColor="border-white/10" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-gray-200 truncate flex items-center gap-2">
                        {r.name}
                        {isMe && <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">You</span>}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Clock size={10} /> {formatMMSS(r.timeTaken)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-sm font-bold ${pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function QuizResult() {
  const { attemptId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const stateResult = location.state?.result

  const isPlayFlow = location.pathname.startsWith('/play/')
  const routeBase = isPlayFlow ? '/play' : '/quiz'

  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)

  const cached = findAttemptById(attemptId)

  const { data } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => api.get(`/quiz/attempt/${attemptId}`).then(r => r.data),
    enabled: !stateResult && !cached,
  })

  const apiResult = data?.attempt || data
  const fallbackSingle = stateResult || apiResult

  const subject = cached?.subject || fallbackSingle?.subject
  const quizName = cached?.quizName || fallbackSingle?.quizName

  const historyEntry = subject && quizName ? getQuizEntry(subject, quizName) : null
  const attempts = useMemo(() => {
    if (historyEntry?.attempts?.length) return historyEntry.attempts
    if (fallbackSingle) return [{ ...fallbackSingle, attemptId, completedAt: fallbackSingle.completedAt || Date.now() }]
    return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyEntry, fallbackSingle, attemptId])

  useEffect(() => {
    const idx = attempts.findIndex(a => String(a.attemptId) === String(attemptId))
    setSelectedIndex(idx !== -1 ? idx : 0)
    setCurrentQIndex(0)
  }, [attemptId, attempts.length])

  const selectedAttempt = attempts[selectedIndex]
  const result = selectedAttempt ? { ...selectedAttempt, subject, quizName } : null

  if (!result) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const scoreLabel = result.score >= 75 ? 'Excellent! 🎉' : result.score >= 50 ? 'Good Job! 👍' : 'Keep Practicing! 💪'
  const scoreMessage = result.score >= 75 ? 'Outstanding performance!' : result.score >= 50 ? 'You are improving!' : 'Practice makes perfect!'

  const circumference = 2 * Math.PI * 50 // r=50
  const strokeDashoffset = circumference - (result.score / 100) * circumference

  const questions = result.results || []
  
  const goNext = () => {
    if (currentQIndex < questions.length - 1) setCurrentQIndex(p => p + 1)
  }
  const goPrev = () => {
    if (currentQIndex > 0) setCurrentQIndex(p => p - 1)
  }
  const swipeNav = useSwipeQuestion(goNext, goPrev)

  return (
    <div className="min-h-screen bg-[#121428] text-white pb-6 max-w-lg mx-auto relative flex flex-col" {...swipeNav}>
      
      {/* TOP NAVIGATION */}
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 z-20 bg-[#121428]">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
          <ChevronLeft size={22} className="text-gray-200" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-[15px]">Quiz Completed</span>
          <Trophy size={18} className="text-amber-400" />
        </div>
        <button onClick={() => setShareOpen(true)} className="p-2 -mr-2 rounded-full hover:bg-white/5 transition-colors">
          <Share2 size={20} className="text-gray-200" />
        </button>
      </header>

      <div className="px-4 space-y-4 pb-24">
        
        {/* HERO SCORE CARD */}
        <motion.div
          key={result.attemptId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[24px] bg-[#181B2D] border border-white/[0.06] p-6 text-center"
        >
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[80px] opacity-15 ${
            result.score >= 75 ? 'bg-emerald-500' : result.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
          }`} />

          {/* Score Ring */}
          <div className="relative z-10 w-36 h-36 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor={result.score >= 75 ? '#10B981' : result.score >= 50 ? '#F59E0B' : '#EF4444'} />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="none" />
              <motion.circle
                cx="60" cy="60" r="50"
                stroke="url(#ringGradient)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="text-[40px] font-black text-white"
              >
                {Math.round(result.score)}%
              </motion.span>
              <span className="text-[12px] text-gray-400 -mt-1">Score</span>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-[20px] font-extrabold text-white mb-1">{scoreLabel}</h2>
            <p className="text-gray-400 text-[14px]">{scoreMessage}</p>
          </motion.div>

          {/* Stats Boxes - Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative z-10 grid grid-cols-3 gap-3 mt-5"
          >
            {[
              { label: 'CORRECT', value: result.correct, icon: CheckCircle, color: 'text-emerald-400' },
              { label: 'WRONG', value: result.wrong, icon: XCircle, color: 'text-red-400' },
              { label: 'SKIPPED', value: result.skipped, icon: MinusCircle, color: 'text-gray-500' },
            ].map((s) => (
              <div key={s.label} className="bg-white/[0.05] rounded-2xl px-2 py-3 flex flex-col items-center justify-center border border-white/[0.05]">
                <s.icon size={18} className={`${s.color} mb-1.5`} />
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Secondary Stats Badges */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative z-10 flex items-center justify-center gap-3 mt-4"
          >
            <div className="bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-2 flex items-center gap-2">
              <TargetIcon size={14} className="text-purple-400" />
              <span className="font-semibold text-gray-300 text-xs">{result.correct}/{result.total} Correct</span>
            </div>
            {result.timeTaken > 0 && (
              <div className="bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-2 flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                <span className="font-semibold text-gray-300 text-xs">{formatMMSS(result.timeTaken)}</span>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* ATTEMPT DROPDOWN */}
        {attempts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <AttemptDropdown attempts={attempts} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
          </motion.div>
        )}

        {/* ACTION BUTTONS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3"
        >
          <Link to={subject && quizName ? `${routeBase}/${encodeURIComponent(subject)}/${encodeURIComponent(quizName)}${routeBase === '/quiz' ? '/play' : ''}` : subject ? `/quiz/${subject}` : '/quiz'}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B4A] to-[#E8532F] text-white text-[15px] font-bold transition-all active:scale-[0.97] shadow-lg shadow-orange-500/30">
            <RotateCcw size={17} /> Try Again
          </Link>
          <button
            onClick={() => navigate(`${routeBase}/analysis/${result.attemptId}`, { state: { result } })}
            disabled={questions.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#20233B] border border-white/[0.06] text-gray-200 text-[15px] font-bold transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 size={17} className="text-purple-400" /> Analysis
          </button>
        </motion.div>

        {/* PROGRESS GRAPH */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <ProgressGraph attempts={attempts} selectedAttemptId={result.attemptId} />
        </motion.div>

        {/* LEADERBOARD */}
        {result.quizId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <QuizLeaderboard quizId={result.quizId} />
          </motion.div>
        )}

        {/* SHARE BOTTOM CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-10"
        >
          <button 
            onClick={() => setShareOpen(true)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-purple-500/5 border border-purple-500/20 backdrop-blur-lg shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-purple-500/20 text-purple-300">
                <Share2 size={20} />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-[15px] text-white">Share Quiz</span>
                <span className="text-[11px] text-gray-400">Challenge your friends</span>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </motion.div>

      </div>

      {/* SHARE MODAL */}
      <ShareQuizModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        quizName={quizName}
        subject={subject}
        shareUrl={
          subject && quizName
            ? `${window.location.origin}/play/${encodeURIComponent(subject)}/${encodeURIComponent(quizName)}`
            : null
        }
      />

    </div>
  )
}
