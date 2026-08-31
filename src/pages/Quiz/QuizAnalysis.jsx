import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, XCircle, ChevronLeft, ChevronRight, X, BookOpen, Target, Clock, ChevronDown
} from 'lucide-react'
import api from '../../api/axios'
import formatText from '../../utils/formatText'
import { findAttemptById } from '../../utils/quizCache'

const FILTERS = ['All', 'Wrong', 'Skipped', 'Correct']

function statusOf(q) {
  if (q?.isSkipped) return 'Skipped'
  if (q?.isCorrect) return 'Correct'
  return 'Wrong'
}

/* ═══ FILTER DROPDOWN ═══ */
function FilterDropdown({ value, onChange, counts }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 border transition-all bg-white/10 border-white/15 text-white text-xs font-bold"
      >
        {value} {counts[value] !== undefined && <span className="text-white/50 font-medium">({counts[value]})</span>}
        <ChevronDown size={13} className={`text-white/60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1.5 z-40 rounded-xl bg-[#0B0E1A] border border-white/[0.1] shadow-2xl overflow-hidden min-w-[130px]"
            >
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => { onChange(f); setOpen(false) }}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs font-semibold transition-colors ${
                    value === f ? 'bg-primary-500/15 text-white' : 'text-white/70 hover:bg-white/[0.06]'
                  }`}
                >
                  {f}
                  <span className="text-white/40 font-medium">{counts[f] ?? 0}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function QuizAnalysis() {
  const { attemptId } = useParams()
  const location = useLocation()
  const stateResult = location.state?.result

  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [showPalette, setShowPalette] = useState(false)
  const [filter, setFilter] = useState('All')
  const startX = useRef(null)
  const startY = useRef(null)
  const scrollRef = useRef(null)

  // Cached attempts always carry a per-question time breakdown (measured
  // client-side during the quiz), so prefer the cache over the API/nav
  // state, which may not include it.
  const cached = findAttemptById(attemptId)

  const { data } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => api.get(`/quiz/attempt/${attemptId}`).then(r => r.data),
    enabled: !stateResult && !cached,
  })

  // Prefer cache > nav state > API fetch
  const result = cached
    ? { ...(data?.attempt || data), ...stateResult, ...cached.attempt, subject: cached.subject, quizName: cached.quizName }
    : stateResult || data?.attempt || data
  
  // Get questions - the API response has 'results' array at the top level
  const questions = result?.results || result?.questions || []

  const counts = useMemo(() => {
    const c = { All: questions.length, Wrong: 0, Skipped: 0, Correct: 0 }
    questions.forEach(q => { c[statusOf(q)] += 1 })
    return c
  }, [questions])

  // Indices into `questions` that match the active filter.
  const filteredIndices = useMemo(() => {
    if (filter === 'All') return questions.map((_, i) => i)
    return questions.reduce((acc, q, i) => {
      if (statusOf(q) === filter) acc.push(i)
      return acc
    }, [])
  }, [questions, filter])

  // Reset to the first matching question whenever the filter changes.
  useEffect(() => {
    setCurrentQIndex(filteredIndices[0] ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const posInFiltered = filteredIndices.indexOf(currentQIndex)
  const currentQ = questions[currentQIndex]

  // Scroll the question content back to the top on every navigation.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [currentQIndex])

  // Format time in seconds to MM:SS
  const formatTime = (s) => {
    if (!s) return '0:00'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const goNext = () => {
    if (posInFiltered !== -1 && posInFiltered < filteredIndices.length - 1) {
      setCurrentQIndex(filteredIndices[posInFiltered + 1])
    }
  }
  const goPrev = () => {
    if (posInFiltered > 0) {
      setCurrentQIndex(filteredIndices[posInFiltered - 1])
    }
  }

  // Handle loading state
  if (!stateResult && !data) return (
    <div className="fixed inset-0 bg-[#001123] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center animate-bounce">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-white/60 text-sm font-medium">Loading analysis...</p>
    </div>
  )

  if (!result) return (
    <div className="fixed inset-0 bg-[#001123] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center animate-bounce">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-white/60 text-sm font-medium">Loading...</p>
    </div>
  )

  // If no questions, show a message
  if (questions.length === 0) return (
    <div className="fixed inset-0 bg-[#001123] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
        <BookOpen size={32} className="text-primary-400" />
      </div>
      <p className="text-gray-400 text-sm">No questions found in this attempt</p>
      <Link to="/" className="text-primary-400 text-xs font-medium">Go Home</Link>
    </div>
  )

  return (
    <div className="fixed inset-0 flex flex-col bg-[#eff3f8] select-none">
      {/* ===== TOP BAR ===== */}
      <div className="flex-shrink-0 bg-[#001123] flex items-center justify-between px-3 sm:px-4 h-[48px] z-50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white font-extrabold text-sm tracking-wide flex-shrink-0">AR QUIZ</span>
          <span className="text-white/40 text-xs flex-shrink-0">|</span>
          <span className="text-white/50 text-[11px] font-medium truncate max-w-[110px] sm:max-w-[180px]">
            Analysis
          </span>
        </div>

        <div className="flex items-center gap-2">
          <FilterDropdown value={filter} onChange={setFilter} counts={counts} />
          <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 border transition-all bg-white/10 border-white/15">
            <Clock size={13} className="text-white/50" />
            <span className="text-xs font-bold tabular-nums text-white">
              {formatTime(result.timeTaken || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* ===== ACTION BAR (desktop/tablet) ===== */}
      <div className="hidden sm:flex flex-shrink-0 bg-[#f8fafc] border-b border-[#dfe7ef] items-center justify-center px-2 sm:px-3 h-[48px] gap-1.5">
        <button onClick={goPrev} disabled={posInFiltered <= 0} className="act-btn">
          <ChevronLeft size={14} /> Prev
        </button>
        <button onClick={goNext} disabled={posInFiltered === -1 || posInFiltered === filteredIndices.length - 1} className="act-btn">
          Next <ChevronRight size={14} />
        </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col min-h-0 mr-0 sm:mr-64">
        <div className="flex-1 flex flex-col px-3 sm:px-4 lg:px-6 py-3 sm:py-4 min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                  {filteredIndices.length === 0
                    ? `${filter} — 0`
                    : <>Question {posInFiltered + 1}<span className="text-gray-400 font-medium">/{filteredIndices.length}</span></>}
                </span>
                {currentQ?.timeTaken && (
                  <span className="text-xs text-gray-500 flex-shrink-0 flex items-center gap-1">
                    <Clock size={11} /> {formatTime(currentQ.timeTaken)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {currentQ && (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    currentQ?.isCorrect
                      ? 'bg-mint-500/10 text-mint-400 border-mint-500/20'
                      : currentQ?.isSkipped
                      ? 'bg-white/[0.05] text-gray-400 border-white/[0.1]'
                      : 'bg-danger-500/10 text-danger-400 border-danger-500/20'
                  }`}>
                    {currentQ?.isCorrect ? '✓ Correct' : currentQ?.isSkipped ? '− Skipped' : '✗ Incorrect'}
                  </span>
                )}
              </div>
            </div>

            {/* Mobile progress bar */}
            <div className="sm:hidden h-1 w-full bg-[#e2e8f0] rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full bg-[#1299FD]"
                initial={false}
                animate={{ width: `${filteredIndices.length ? ((posInFiltered + 1) / filteredIndices.length) * 100 : 0}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>

            {filteredIndices.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <BookOpen size={26} className="text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm font-medium">No {filter.toLowerCase()} questions {filter === 'Correct' ? 'yet' : '🎉'}</p>
                <button onClick={() => setFilter('All')} className="text-primary-500 text-xs font-bold">Show All</button>
              </div>
            ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div
                  ref={scrollRef}
                  className="flex-1 min-h-0 overflow-y-auto pr-1"
                  style={{ touchAction: 'pan-y' }}
                  onTouchStart={(e) => {
                    startX.current = e.touches[0].clientX
                    startY.current = e.touches[0].clientY
                  }}
                  onTouchEnd={(e) => {
                    if (startX.current === null) return
                    const dx = startX.current - e.changedTouches[0].clientX
                    const dy = Math.abs(startY.current - e.changedTouches[0].clientY)
                    startX.current = null
                    startY.current = null
                    if (Math.abs(dx) < 56 || dy > 70) return
                    if (dx > 0) goNext()
                    else goPrev()
                  }}
                >
                  <div className="bg-white border border-[#dfe7ef] rounded-xl p-3 sm:p-4 lg:p-5 mb-3 shadow-sm">
                    <p className="text-gray-900 text-sm sm:text-base lg:text-lg font-semibold leading-relaxed whitespace-pre-wrap">
                      {formatText(currentQ?.question)}
                    </p>
                  </div>

                  <div className="space-y-2 sm:space-y-2.5">
                      {currentQ?.options?.map((opt, j) => {
                        const isCorrect = j === currentQ.correctAnswer
                        const isSelected = j === currentQ.givenAnswer

                        return (
                          <div
                            key={j}
                            className={`w-full text-left flex items-center gap-3 p-3 sm:p-3.5 rounded-lg border-2 transition-all ${
                              isCorrect
                                ? 'border-mint-500 bg-mint-500/10 shadow-[0_0_0_2px_rgba(20,184,166,0.15)]'
                                : isSelected && !currentQ.isCorrect
                                ? 'border-danger-500 bg-danger-500/10 shadow-[0_0_0_2px_rgba(220,38,38,0.15)]'
                                : 'border-[#dfe7ef] bg-[#fafbfc]'
                            }`}
                          >
                            <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-extrabold flex-shrink-0 transition-all ${
                              isCorrect
                                ? 'bg-mint-500 text-white'
                                : isSelected && !currentQ.isCorrect
                                ? 'bg-danger-500 text-white'
                                : 'bg-[#dfe7ef] text-gray-500'
                            }`}>
                              {isCorrect ? <CheckCircle size={14} /> : isSelected && !currentQ.isCorrect ? <XCircle size={14} /> : ['A', 'B', 'C', 'D'][j]}
                            </span>
                            <span className={`text-sm sm:text-[15px] flex-1 ${isCorrect ? 'text-gray-900 font-medium' : isSelected && !currentQ.isCorrect ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                              {formatText(opt)}
                            </span>
                            {isCorrect && (
                              <span className="text-[10px] font-bold text-mint-400 uppercase flex-shrink-0 bg-mint-500/15 px-2 py-0.5 rounded-full">
                                Correct
                              </span>
                            )}
                            {isSelected && !currentQ.isCorrect && (
                              <span className="text-[10px] font-bold text-danger-400 uppercase flex-shrink-0 bg-danger-500/15 px-2 py-0.5 rounded-full">
                                Your Answer
                              </span>
                            )}
                          </div>
                        )
                      })}
                  </div>

                  {/* Explanation - now rendered below options, inside the
                      same scroll container so the page scrolls as one
                      column instead of clipping the explanation off-screen. */}
                  {currentQ?.explanation && (
                    <div className="mt-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/20 p-3 sm:p-3.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <BookOpen size={14} className="text-amber-500" />
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Explanation</span>
                      </div>
                      <p className="text-[13px] sm:text-sm text-gray-600 leading-relaxed">{formatText(currentQ.explanation)}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <div className="sm:hidden flex-shrink-0 bg-white border-t border-[#dfe7ef] flex items-center gap-2 px-3 py-2.5 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <button onClick={() => setShowPalette(true)} className="nav-btn-mob !flex-[0.8]">
          <Target size={16} /> Palette
        </button>
        <button onClick={goPrev} disabled={posInFiltered <= 0} className="nav-btn-mob !flex-[0.8] disabled:opacity-30">
          <ChevronLeft size={16} /> Prev
        </button>
        <button onClick={goNext} disabled={posInFiltered === -1 || posInFiltered === filteredIndices.length - 1} className="nav-btn-mob !flex-[1.2] !bg-[#001123] !text-white !border-[#001123]">
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* ===== MOBILE QUESTION PALETTE ===== */}
      <AnimatePresence>
        {showPalette && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sm:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowPalette(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="sm:hidden fixed top-0 right-0 bottom-0 w-80 bg-white z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#dfe7ef]">
                <span className="font-bold text-gray-800">Question Palette</span>
                <button onClick={() => setShowPalette(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#dfe7ef] border-b border-[#dfe7ef]">
                <div className="p-3 text-center">
                  <div className="text-lg font-black text-mint-400">{questions.filter(q => q.isCorrect).length}</div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase">Correct</div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-lg font-black text-danger-400">{questions.filter(q => !q.isCorrect && !q.isSkipped).length + questions.filter(q => q.isSkipped).length}</div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase">Incorrect</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((_, i) => {
                    const q = questions[i]
                    const status = q?.isCorrect ? 'correct' : q?.isSkipped ? 'skipped' : 'incorrect'
                    const matchesFilter = filter === 'All' || statusOf(q) === filter
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentQIndex(i)
                          setShowPalette(false)
                        }}
                        className={`aspect-square rounded-md text-xs font-bold flex items-center justify-center transition-opacity ${
                          !matchesFilter ? 'opacity-30' : ''
                        } ${
                          i === currentQIndex ? 'bg-[#001123] text-white shadow-[0_0_0_2px_rgba(0,17,35,0.3)]' :
                          status === 'correct' ? 'bg-mint-500 text-white' :
                          status === 'skipped' ? 'bg-[#f3f4f6] border border-[#e5e7eb] text-[#374151]' :
                          'bg-danger-500 text-white'
                        }`}
                      >
                        {i + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== DESKTOP SIDE PANEL ===== */}
      <div className="hidden sm:flex fixed top-0 right-0 bottom-0 w-64 bg-white border-l border-[#dfe7ef] z-40 flex-col">
        <div className="bg-[#001123] text-white px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold">Question Palette</span>
        </div>

        <div className="grid grid-cols-2 divide-x divide-[#dfe7ef] border-b border-[#dfe7ef]">
          <div className="p-3 text-center">
            <div className="text-lg font-black text-mint-400">{questions.filter(q => q.isCorrect).length}</div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase">Correct</div>
          </div>
          <div className="p-3 text-center">
            <div className="text-lg font-black text-danger-400">{questions.filter(q => !q.isCorrect && !q.isSkipped).length + questions.filter(q => q.isSkipped).length}</div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase">Incorrect</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, i) => {
              const q = questions[i]
              const status = q?.isCorrect ? 'correct' : q?.isSkipped ? 'skipped' : 'incorrect'
              const matchesFilter = filter === 'All' || statusOf(q) === filter
              return (
                <button
                  key={i}
                  onClick={() => setCurrentQIndex(i)}
                  className={`aspect-square rounded-md text-xs font-bold flex items-center justify-center transition-opacity ${
                    !matchesFilter ? 'opacity-30' : ''
                  } ${
                    i === currentQIndex ? 'bg-[#001123] text-white shadow-[0_0_0_2px_rgba(0,17,35,0.3)]' :
                    status === 'correct' ? 'bg-mint-500 text-white' :
                    status === 'skipped' ? 'bg-[#f3f4f6] border border-[#e5e7eb] text-[#374151]' :
                    'bg-danger-500 text-white'
                  }`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        .act-btn {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .act-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .act-btn:active { transform: scale(0.96); }
        .act-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .nav-btn-mob {
          flex: 1;
          padding: 10px 8px;
          border-radius: 8px;
          border: 1px solid #ddd;
          background: #f0f0f0;
          color: #444;
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: all 0.15s;
        }
        .nav-btn-mob:active { transform: scale(0.97); }
        .nav-btn-mob:disabled { opacity: 0.4; }

        @media (max-width: 640px) {
          .act-btn { font-size: 0.65rem; padding: 5px 8px; }
        }
      `}</style>
    </div>
  )
}
