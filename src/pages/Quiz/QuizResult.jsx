import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, XCircle, MinusCircle, Trophy, RotateCcw,
  BarChart3, ChevronLeft, ChevronRight, X, BookOpen, Target,
  ChevronDown, Clock, TrendingUp, Check, Share2, Medal, Crown
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import api from '../../api/axios'
import formatText from '../../utils/formatText'
import { findAttemptById, getQuizEntry } from '../../utils/quizCache'
import ShareQuizModal from '../../components/ShareQuizModal'

/* ═══ SWIPE HOOK (mobile: swipe left = next question, swipe right = prev) ═══ */
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
  if (!s) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const formatAttemptDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

/* ═══ ATTEMPT DROPDOWN ═══ */
function AttemptDropdown({ attempts, selectedIndex, onSelect }) {
  const [open, setOpen] = useState(false)
  const total = attempts.length
  const selected = attempts[selectedIndex]
  if (!selected) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-all"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400 flex-shrink-0">
            <Trophy size={15} />
          </div>
          <div className="text-left min-w-0">
            <div className="text-xs font-bold text-white">
              {selectedIndex === 0 ? 'Latest Attempt' : `Attempt ${total - selectedIndex}`}
            </div>
            <div className="text-[11px] text-gray-400 truncate">{formatAttemptDate(selected.completedAt)}</div>
          </div>
        </span>
        <span className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-black text-primary-400">{Math.round(selected.score)}%</span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
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
              className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl bg-[#0B0E1A] border border-white/[0.1] shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
            >
              {attempts.map((a, i) => {
                const attemptNo = total - i
                const isSelected = i === selectedIndex
                return (
                  <button
                    key={a.attemptId || i}
                    onClick={() => { onSelect(i); setOpen(false) }}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors ${
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
                      <span className={`text-xs font-bold ${a.score >= 75 ? 'text-mint-400' : a.score >= 50 ? 'text-amber-400' : 'text-danger-400'}`}>
                        {Math.round(a.score)}%
                      </span>
                      {isSelected && <Check size={13} className="text-primary-400" />}
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
      label: i === attempts.length - 1 ? 'Latest' : `Attempt ${i + 1}`,
      score: Math.round(a.score),
      attemptId: a.attemptId,
      date: formatAttemptDate(a.completedAt),
    }))
  ), [attempts])

  if (attempts.length < 2) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-5 text-center">
        <TrendingUp size={22} className="text-primary-400/50 mx-auto mb-2" />
        <p className="text-xs text-gray-500">Take this quiz again to start tracking your progress over time.</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary-400" />
          <h4 className="text-sm font-bold text-white">Progress Over Attempts</h4>
        </div>
        <span className="text-[11px] text-gray-400 font-medium">{attempts.length} attempts</span>
      </div>
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: '#0B0E1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
              itemStyle={{ color: '#FF9270' }}
              formatter={(v) => [`${v}%`, 'Score']}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#FF6B4A"
              strokeWidth={2.5}
              dot={(props) => {
                const isSel = props.payload.attemptId === selectedAttemptId
                return (
                  <circle
                    key={props.payload.label}
                    cx={props.cx}
                    cy={props.cy}
                    r={isSel ? 5 : 3.5}
                    fill={isSel ? '#FF9270' : '#FF6B4A'}
                    stroke={isSel ? '#fff' : 'none'}
                    strokeWidth={isSel ? 2 : 0}
                  />
                )
              }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ═══ PER-QUIZ LEADERBOARD ═══ */
function nameColor(name) {
  const colors = [
    'from-violet-500 to-purple-600', 'from-sky-500 to-blue-600',
    'from-emerald-500 to-teal-600', 'from-pink-500 to-rose-600',
    'from-amber-500 to-orange-600', 'from-indigo-500 to-violet-600',
  ]
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return colors[h % colors.length]
}

function Avatar({ name, avatarUrl, size = "w-11 h-11" }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${size} rounded-full object-cover border-2 border-white/20 shadow-md`} />
  }
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <div className={`${size} rounded-full bg-gradient-to-br ${nameColor(name)} flex items-center justify-center text-white text-base font-black flex-shrink-0 shadow-md border-2 border-white/20`}>
      {letter}
    </div>
  )
}

function QuizLeaderboard({ quizId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['quiz-leaderboard', quizId],
    queryFn: () => api.get(`/leaderboard/${quizId}`).then(r => r.data),
    enabled: !!quizId,
    staleTime: 30_000,
  })

  if (!quizId) return null

  const rows = data?.leaderboard || []

  // Top 3 for Podium layout, rest for list
  const topThree = [rows[1], rows[0], rows[2]].filter(Boolean) // 2nd, 1st, 3rd layout order
  const remainingRows = rows.slice(3)

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Trophy size={17} className="text-amber-400" />
          <h4 className="text-sm font-bold text-white">Quiz Leaderboard</h4>
        </div>
        <span className="text-[11px] text-gray-400 font-medium">First attempt · by score & time</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <p className="text-center text-xs text-gray-500 py-6">Leaderboard load nahi ho paaya.</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-xs text-gray-500 py-6">Abhi tak koi entry nahi. Sabse pehle tum ho! 🎉</p>
      ) : (
        <div className="space-y-5">
          {/* PODIUM TOP 3 */}
          {rows.length >= 1 && (
            <div className="grid grid-cols-3 gap-2 items-end pt-4 pb-2">
              {[rows[1], rows[0], rows[2]].map((r, podiumIdx) => {
                if (!r) return <div key={podiumIdx} />
                const isFirst = r.rank === 1
                const isSecond = r.rank === 2
                
                return (
                  <div
                    key={r.participantId}
                    className={`relative flex flex-col items-center rounded-2xl p-3 text-center transition-all ${
                      isFirst
                        ? 'bg-gradient-to-b from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 shadow-lg shadow-amber-500/10 -translate-y-3 pb-4'
                        : isSecond
                        ? 'bg-gradient-to-b from-slate-400/15 via-white/[0.03] to-transparent border border-slate-400/30'
                        : 'bg-gradient-to-b from-orange-500/15 via-white/[0.03] to-transparent border border-orange-500/30'
                    }`}
                  >
                    {/* Crown or Rank Badge */}
                    <div className={`absolute -top-3.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-md border ${
                      isFirst
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black border-amber-200'
                        : isSecond
                        ? 'bg-gradient-to-r from-slate-300 to-slate-400 text-black border-slate-200'
                        : 'bg-gradient-to-r from-orange-400 to-orange-500 text-black border-orange-200'
                    }`}>
                      {isFirst ? <Crown size={14} className="fill-black" /> : r.rank}
                    </div>

                    <div className="mt-1 mb-2">
                      <Avatar name={r.name} avatarUrl={r.avatarUrl} size={isFirst ? "w-12 h-12" : "w-10 h-10"} />
                    </div>

                    <div className="text-xs font-bold text-white truncate w-full mb-0.5">{r.name}</div>
                    <div className={`text-base font-black ${isFirst ? 'text-amber-300' : isSecond ? 'text-slate-200' : 'text-orange-300'}`}>
                      {r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0}%
                    </div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 mt-1">
                      <Clock size={9} /> {formatMMSS(r.timeTaken)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* REMAINING ROWS LIST */}
          {remainingRows.length > 0 && (
            <div className="space-y-2">
              {remainingRows.map((r) => {
                const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0
                return (
                  <div
                    key={r.participantId}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                      r.isMe
                        ? 'border-primary-500/50 bg-primary-500/15 ring-1 ring-primary-500/30'
                        : 'border-white/[0.06] bg-white/[0.02]'
                    }`}
                  >
                    <div className="w-6 flex-shrink-0 text-center text-xs font-black text-gray-400">
                      {r.rank}
                    </div>

                    <Avatar name={r.name} avatarUrl={r.avatarUrl} size="w-9 h-9" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{r.name}</span>
                        {r.isMe && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 flex-shrink-0">You</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span className="flex items-center gap-0.5"><Clock size={9} /> {formatMMSS(r.timeTaken)}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-black ${pct >= 75 ? 'text-mint-400' : pct >= 50 ? 'text-amber-400' : 'text-danger-400'}`}>
                        {pct}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
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
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const scoreColor = result.score >= 75 ? 'text-mint-400' : result.score >= 50 ? 'text-amber-400' : 'text-danger-400'
  const scoreLabel = result.score >= 75 ? 'Excellent! 🎉' : result.score >= 50 ? 'Good Job! 👍' : 'Keep Practicing! 💪'
  const ringColor = result.score >= 75 ? '#2DD4BF' : result.score >= 50 ? '#FFB020' : '#FF5C5C'

  const questions = result.results || []
  const currentQ = questions[currentQIndex]

  const goNext = () => {
    if (currentQIndex < questions.length - 1) setCurrentQIndex(p => p + 1)
  }
  const goPrev = () => {
    if (currentQIndex > 0) setCurrentQIndex(p => p - 1)
  }
  const swipeNav = useSwipeQuestion(goNext, goPrev)

  return (
    <div className="max-w-md mx-auto px-4 space-y-5 pb-16 relative">

      {/* TOP HEADER */}
      <div className="flex items-center justify-between pt-3 pb-1">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white hover:bg-white/[0.08] transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-black text-white flex items-center gap-1.5">
          Quiz Completed <Trophy size={16} className="text-amber-400 fill-amber-400" />
        </h1>
        <button
          onClick={() => setShareOpen(true)}
          className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white hover:bg-white/[0.08] transition-all"
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* ═══ HERO SCORE CARD (Side-by-side design matching reference image) ═══ */}
      <motion.div
        key={result.attemptId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1445] via-[#11152a] to-[#0a0d18] border border-white/[0.08] p-5 shadow-2xl"
      >
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-25 pointer-events-none ${
          result.score >= 75 ? 'bg-mint-500' : result.score >= 50 ? 'bg-amber-500' : 'bg-danger-500'
        }`} />

        <div className="flex items-center gap-4">
          {/* Score Ring */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="58" stroke="rgba(255,255,255,0.06)" strokeWidth="11" fill="none" />
              <motion.circle
                cx="70" cy="70" r="58"
                stroke={ringColor}
                strokeWidth="11"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 58}
                initial={{ strokeDashoffset: 2 * Math.PI * 58 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 58 * (1 - result.score / 100) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={`text-2xl font-black ${scoreColor}`}>
                {Math.round(result.score)}%
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mt-0.5">Score</span>
            </div>
          </div>

          {/* Right side stats & text */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-white truncate mb-0.5">{scoreLabel}</h2>
            <p className="text-xs text-gray-400 mb-3 truncate">
              {result.score >= 75 ? 'Outstanding performance!' : result.score >= 50 ? 'You are improving!' : 'Practice makes perfect!'}
            </p>

            {/* Correct/Wrong/Skipped tiny pills */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1 text-xs font-bold text-mint-400 bg-mint-500/10 border border-mint-500/20 px-2 py-1 rounded-xl">
                <CheckCircle size={13} /> {result.correct}
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-danger-400 bg-danger-500/10 border border-danger-500/20 px-2 py-1 rounded-xl">
                <XCircle size={13} /> {result.wrong}
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-gray-300 bg-white/[0.05] border border-white/[0.1] px-2 py-1 rounded-xl">
                <MinusCircle size={13} /> {result.skipped}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom metrics row inside card */}
        <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3.5 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-3 py-2.5">
            <div className="w-7 h-7 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400 flex-shrink-0">
              <Target size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white">{result.correct}/{result.total}</div>
              <div className="text-[10px] text-gray-400 font-medium">Correct</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-3 py-2.5">
            <div className="w-7 h-7 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-gray-300 flex-shrink-0">
              <Clock size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white">{formatMMSS(result.timeTaken)}</div>
              <div className="text-[10px] text-gray-400 font-medium">Time Taken</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Attempt dropdown */}
      {attempts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AttemptDropdown attempts={attempts} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
        </motion.div>
      )}

      {/* ═══ ACTION BUTTONS ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-3"
      >
        <Link
          to={subject && quizName ? `${routeBase}/${encodeURIComponent(subject)}/${encodeURIComponent(quizName)}${routeBase === '/quiz' ? '/play' : ''}` : subject ? `/quiz/${subject}` : '/quiz'}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white text-xs font-bold transition-all active:scale-[0.98] shadow-lg shadow-primary-500/25"
        >
          <RotateCcw size={15} /> Try Again
        </Link>
        <button
          onClick={() => navigate(`${routeBase}/analysis/${result.attemptId}`, { state: { result } })}
          disabled={questions.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-primary-500/30 text-gray-200 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <BarChart3 size={15} className="text-primary-400" /> Analysis
        </button>
      </motion.div>

      {/* ═══ PROGRESS GRAPH ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <ProgressGraph attempts={attempts} selectedAttemptId={result.attemptId} />
      </motion.div>

      {/* ═══ PER-QUIZ LEADERBOARD ═══ */}
      {result.quizId && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <QuizLeaderboard quizId={result.quizId} />
        </motion.div>
      )}

      {/* ═══ SHARE BANNER CARD ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        onClick={() => setShareOpen(true)}
        className="flex items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-violet-500/15 via-primary-500/10 to-transparent border border-violet-500/30 cursor-pointer hover:border-violet-500/50 transition-all shadow-lg shadow-violet-500/5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
            <Share2 size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Share Quiz</div>
            <div className="text-[11px] text-gray-400">Challenge your friends</div>
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-400" />
      </motion.div>

      {/* Footer Motivation Quote */}
      <div className="text-center py-2">
        <p className="text-xs font-semibold text-amber-300/90 flex items-center justify-center gap-1.5">
          <span>🎉</span> {scoreLabel} <span>💪</span>
        </p>
      </div>

      {/* ═══ SHARE MODAL ═══ */}
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

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
