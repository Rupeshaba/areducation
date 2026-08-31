import { useState, useRef, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, X, Send,
  Grid3X3, RotateCcw, Trophy, Target, BookOpen
} from 'lucide-react'
import formatText from '../../utils/formatText'

/* ═══ SWIPE HOOK ═══ */
function useSwipeQuestion(onNext, onPrev, disabled) {
  const startX = useRef(null)
  const startY = useRef(null)
  function onTouchStart(e) {
    if (disabled) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }
  function onTouchEnd(e) {
    if (disabled || startX.current === null) return
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

export default function QuizPractice() {
  const navigate = useNavigate()
  const location = useLocation()

  const { questions = [], subject, quizName, routeBase = '/quiz' } = location.state || {}

  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [showPalette, setShowPalette] = useState(false)

  const total = questions.length
  const q = questions[current]

  const goNext = () => { if (current < total - 1) setCurrent(c => c + 1) }
  const goPrev = () => { if (current > 0) setCurrent(c => c - 1) }
  const swipeNav = useSwipeQuestion(goNext, goPrev, submitted)

  const handleOptionSelect = (i) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [current]: i }))
  }

  const handleSubmit = () => setSubmitted(true)

  const scored = useMemo(() => {
    if (!submitted) return null
    let correct = 0, wrong = 0, skipped = 0
    const results = questions.map((qq, i) => {
      const given = answers[i]
      const isSkipped = given === undefined
      const isCorrect = !isSkipped && given === qq.correctAnswer
      if (isSkipped) skipped++
      else if (isCorrect) correct++
      else wrong++
      return { ...qq, givenAnswer: given, isSkipped, isCorrect }
    })
    const score = total > 0 ? Math.round((correct / total) * 100) : 0
    return { results, correct, wrong, skipped, score }
  }, [submitted, answers, questions, total])

  if (total === 0) {
    return (
      <div className="fixed inset-0 bg-[#001123] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
          <BookOpen size={32} className="text-primary-400" />
        </div>
        <p className="text-white/60 text-sm font-medium">Practice set not found. Go back and try again from the result page.</p>
        <Link to={routeBase} className="text-primary-400 text-xs font-medium">Go Back</Link>
      </div>
    )
  }

  /* ═══ RESULT VIEW (after submit) ═══ */
  if (submitted && scored) {
    return (
      <div className="min-h-screen bg-[#121428] text-white pb-10 max-w-lg mx-auto flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 sticky top-0 z-20 bg-[#121428]">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
            <ChevronLeft size={22} className="text-gray-200" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[15px]">Practice Complete</span>
            <Trophy size={18} className="text-amber-400" />
          </div>
          <div className="w-8" />
        </header>

        <div className="px-4 space-y-4">
          <div className="relative overflow-hidden rounded-[24px] bg-[#181B2D] border border-white/[0.06] p-6 text-center">
            <div className="text-[40px] font-black text-white">{scored.score}%</div>
            <p className="text-gray-400 text-[13px] mb-4">Practice score (not saved to your quiz history)</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'CORRECT', value: scored.correct, icon: CheckCircle, color: 'text-emerald-400' },
                { label: 'WRONG', value: scored.wrong, icon: XCircle, color: 'text-red-400' },
                { label: 'SKIPPED', value: scored.skipped, icon: Target, color: 'text-gray-500' },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.05] rounded-2xl px-2 py-3 flex flex-col items-center justify-center border border-white/[0.05]">
                  <s.icon size={18} className={`${s.color} mb-1.5`} />
                  <div className="text-xl font-bold text-white">{s.value}</div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setSubmitted(false); setAnswers({}); setCurrent(0) }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B4A] to-[#E8532F] text-white text-[15px] font-bold transition-all active:scale-[0.97]"
          >
            <RotateCcw size={17} /> Practice Again
          </button>

          <div className="space-y-3">
            {scored.results.map((r, i) => (
              <div key={i} className="rounded-xl bg-[#181B2D] border border-white/[0.06] p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-white leading-relaxed">{i + 1}. {formatText(r.question)}</p>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    r.isCorrect ? 'bg-emerald-500/15 text-emerald-400' : r.isSkipped ? 'bg-white/10 text-gray-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {r.isCorrect ? 'Correct' : r.isSkipped ? 'Skipped' : 'Wrong'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {r.options?.map((opt, j) => {
                    const isCorrectOpt = j === r.correctAnswer
                    const isGiven = j === r.givenAnswer
                    return (
                      <div key={j} className={`text-xs rounded-lg px-3 py-2 border ${
                        isCorrectOpt ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' :
                        isGiven && !r.isCorrect ? 'border-red-500/40 bg-red-500/10 text-red-200' :
                        'border-white/5 text-gray-400'
                      }`}>
                        {formatText(opt)}
                      </div>
                    )
                  })}
                </div>
                {r.explanation && (
                  <p className="mt-2 text-[12px] text-amber-300/80 leading-relaxed">{formatText(r.explanation)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ═══ PLAY VIEW ═══ */
  const answeredCount = Object.keys(answers).length

  return (
    <div className="fixed inset-0 flex flex-col bg-[#eff3f8] select-none">
      <div className="flex-shrink-0 bg-[#001123] flex items-center justify-between px-3 sm:px-4 h-[48px] z-50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white font-extrabold text-sm tracking-wide flex-shrink-0">PRACTICE</span>
          <span className="text-white/40 text-xs flex-shrink-0">|</span>
          <span className="text-white/50 text-[11px] font-medium truncate max-w-[110px] sm:max-w-[180px]">
            {quizName ? decodeURIComponent(quizName) : 'Weak Questions'}
          </span>
        </div>
        <button
          onClick={() => setShowPalette(true)}
          className="sm:hidden bg-white/10 border border-white/15 text-white rounded-md p-1.5"
        >
          <Grid3X3 size={16} />
        </button>
      </div>

      <div className="hidden sm:flex flex-shrink-0 bg-[#f8fafc] border-b border-[#dfe7ef] items-center justify-center px-2 sm:px-3 h-[48px] gap-1.5">
        <button onClick={goPrev} disabled={current === 0} className="act-btn">
          <ChevronLeft size={14} /> Prev
        </button>
        <button onClick={goNext} disabled={current === total - 1} className="act-btn">
          Next <ChevronRight size={14} />
        </button>
        <button onClick={handleSubmit} className="act-btn !bg-gradient-to-r !from-pink-400 !to-danger-400 !text-white !border-none">
          <Send size={14} /> Submit
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 mr-0 sm:mr-64">
        <div className="flex-1 flex flex-col px-3 sm:px-4 lg:px-6 py-3 sm:py-4 min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                Question {current + 1}<span className="text-gray-400 font-medium">/{total}</span>
              </span>
              {answers[current] !== undefined && (
                <button
                  onClick={() => setAnswers(prev => { const n = { ...prev }; delete n[current]; return n })}
                  className="flex items-center gap-1 text-danger-500 text-[11px] font-semibold bg-red-50 border border-red-200 rounded-full px-3 py-1 hover:bg-red-100 transition-colors"
                >
                  <X size={11} /> Clear
                </button>
              )}
            </div>

            <div className="sm:hidden h-1 w-full bg-[#e2e8f0] rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full bg-[#1299FD]"
                initial={false}
                animate={{ width: `${((current + 1) / Math.max(total, 1)) * 100}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="bg-white border border-[#dfe7ef] rounded-xl p-3 sm:p-4 lg:p-5 mb-3 shadow-sm flex-shrink-0">
                  <p className="text-gray-900 text-sm sm:text-base lg:text-lg font-semibold leading-relaxed whitespace-pre-wrap">
                    {formatText(q?.question)}
                  </p>
                </div>

                <div className="flex-1 min-h-0">
                  <div className="h-full overflow-y-auto pr-1" style={{ touchAction: 'pan-y' }} {...swipeNav}>
                    <div className="space-y-2 sm:space-y-2.5">
                      {q?.options?.map((opt, i) => {
                        const isSelected = answers[current] === i
                        return (
                          <button
                            key={i}
                            onClick={() => handleOptionSelect(i)}
                            className={`w-full text-left flex items-center gap-3 p-3 sm:p-3.5 rounded-lg border-2 transition-all active:scale-[0.99] ${
                              isSelected
                                ? 'border-[#1299FD] bg-[#1299FD]/5 shadow-[0_0_0_2px_rgba(18,153,253,0.15)]'
                                : 'border-[#dfe7ef] bg-[#fafbfc] hover:border-[#1299FD] hover:bg-[#1299FD]/[0.04]'
                            }`}
                          >
                            <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-extrabold flex-shrink-0 transition-all ${
                              isSelected ? 'bg-[#1299FD] text-white' : 'bg-[#dfe7ef] text-gray-500'
                            }`}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className={`text-sm sm:text-[15px] flex-1 ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                              {formatText(opt)}
                            </span>
                            {isSelected && <CheckCircle size={16} className="text-[#1299FD] flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="sm:hidden flex-shrink-0 bg-white border-t border-[#dfe7ef] flex items-center gap-2 px-3 py-2.5 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <button onClick={goPrev} disabled={current === 0} className="nav-btn-mob !flex-[0.8] disabled:opacity-30">
          <ChevronLeft size={16} /> Prev
        </button>
        {current < total - 1 ? (
          <button onClick={goNext} className="nav-btn-mob !flex-[1.2] !bg-[#001123] !text-white !border-[#001123]">
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleSubmit} className="nav-btn-mob !flex-[1.2] !bg-gradient-to-r !from-pink-400 !to-danger-400 !text-white !border-none">
            Submit <Send size={14} />
          </button>
        )}
      </div>

      {/* ═══ DESKTOP SIDE PANEL ═══ */}
      <div className="hidden sm:flex fixed top-0 right-0 bottom-0 w-64 bg-white border-l border-[#dfe7ef] z-40 flex-col">
        <div className="bg-[#001123] text-white px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold">Question Palette</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-[#dfe7ef] border-b border-[#dfe7ef]">
          <div className="p-3 text-center">
            <div className="text-lg font-black text-[#14B8A6]">{answeredCount}</div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase">Answered</div>
          </div>
          <div className="p-3 text-center">
            <div className="text-lg font-black text-[#E23F3F]">{total - answeredCount}</div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase">Not Answered</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`aspect-square rounded-md text-xs font-bold flex items-center justify-center ${
                  i === current ? 'bg-[#001123] text-white shadow-[0_0_0_2px_rgba(0,17,35,0.3)]' :
                  answers[i] !== undefined ? 'bg-[#2DD4BF] text-white' :
                  'bg-[#f3f4f6] border border-[#e5e7eb] text-[#374151]'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3 border-t border-[#dfe7ef]">
          <button onClick={handleSubmit} className="w-full act-btn !bg-gradient-to-r !from-pink-400 !to-danger-400 !text-white !border-none justify-center">
            <Send size={14} /> Submit Practice
          </button>
        </div>
      </div>

      {/* ═══ MOBILE PALETTE ═══ */}
      <AnimatePresence>
        {showPalette && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="sm:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowPalette(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
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
                  <div className="text-lg font-black text-[#14B8A6]">{answeredCount}</div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase">Answered</div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-lg font-black text-[#E23F3F]">{total - answeredCount}</div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase">Not Answered</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setCurrent(i); setShowPalette(false) }}
                      className={`aspect-square rounded-md text-xs font-bold flex items-center justify-center ${
                        i === current ? 'bg-[#001123] text-white shadow-[0_0_0_2px_rgba(0,17,35,0.3)]' :
                        answers[i] !== undefined ? 'bg-[#2DD4BF] text-white' :
                        'bg-[#f3f4f6] border border-[#e5e7eb] text-[#374151]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 border-t border-[#dfe7ef]">
                <button onClick={handleSubmit} className="w-full nav-btn-mob !bg-gradient-to-r !from-pink-400 !to-danger-400 !text-white !border-none justify-center">
                  <Send size={14} /> Submit Practice
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .act-btn {
          background: #2563eb; color: white; border: none; border-radius: 6px;
          padding: 6px 10px; font-size: 0.7rem; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; gap: 4px; white-space: nowrap;
          transition: all 0.15s; flex-shrink: 0;
        }
        .act-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .act-btn:active { transform: scale(0.96); }
        .act-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .nav-btn-mob {
          flex: 1; padding: 10px 8px; border-radius: 8px; border: 1px solid #ddd;
          background: #f0f0f0; color: #444; font-weight: 700; font-size: 0.78rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 4px; transition: all 0.15s;
        }
        .nav-btn-mob:active { transform: scale(0.97); }
        .nav-btn-mob:disabled { opacity: 0.4; }
        @media (max-width: 640px) { .act-btn { font-size: 0.65rem; padding: 5px 8px; } }
      `}</style>
    </div>
  )
}
