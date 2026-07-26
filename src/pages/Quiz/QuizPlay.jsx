import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, 
  Loader, X, Bookmark, Send, AlertTriangle, Grid3X3
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import formatText from '../../utils/formatText'
import { saveAttempt } from '../../utils/quizCache'

/* ═══ SWIPE HOOK (mobile: swipe left = next, swipe right = prev) ═══ */
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
    if (Math.abs(dx) < 56 || dy > 70) return // ignore short/diagonal swipes
    if (dx > 0) onNext()
    else onPrev()
  }
  return { onTouchStart, onTouchEnd }
}

export default function QuizPlay() {
  const { subject, name } = useParams()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [markedReview, setMarkedReview] = useState(new Set())
  const [visited, setVisited] = useState(new Set([0]))
  const [timerStopped, setTimerStopped] = useState(false)
  const [finalTime, setFinalTime] = useState(0)
  const timerRef = useRef(null)
  const fullscreenLocked = useRef(false)

  // ── Per-question time tracking ──
  // questionTimeRef accumulates seconds spent on each question index (a
  // question can be revisited multiple times, so time keeps adding up).
  // enterElapsedRef remembers the global `elapsed` value at the moment the
  // currently-open question was entered, so we can compute the delta
  // whenever the user navigates away from it (or submits).
  const questionTimeRef = useRef({})
  const enterElapsedRef = useRef(0)

  const commitQuestionTime = (atElapsed) => {
    const delta = atElapsed - enterElapsedRef.current
    if (delta > 0) {
      questionTimeRef.current[current] = (questionTimeRef.current[current] || 0) + delta
    }
    enterElapsedRef.current = atElapsed
  }

  const { data, isLoading } = useQuery({
    queryKey: ['quiz-questions', subject, name],
    queryFn: () => api.get(`/quiz/${subject}/${encodeURIComponent(name)}/questions`).then(r => r.data),
  })

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/quiz/${subject}/${encodeURIComponent(name)}/submit`, {
      answers,
      timeTaken: finalTime || elapsed,
      questionTimes: questionTimeRef.current,
    }).then(r => r.data),
    onSuccess: (data) => {
      fullscreenLocked.current = false
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      toast.success(`Score: ${data.score}%`)

      const decodedName = decodeURIComponent(name)
      const questionTimes = questionTimeRef.current

      // The backend may or may not echo per-question timing back — make
      // sure the per-question breakdown always carries the time we
      // measured client-side, so analysis screens have it either way.
      const results = Array.isArray(data.results)
        ? data.results.map((r, i) => ({ ...r, timeTaken: r.timeTaken ?? questionTimes[i] ?? 0 }))
        : data.results

      const enriched = {
        ...data,
        results,
        subject,
        quizName: decodedName,
        questionTimes,
        completedAt: Date.now(),
      }

      // Cache the full attempt so Home's recent activity, the result page's
      // attempt dropdown/progress graph, and analysis all have it later —
      // without needing a "list attempts" endpoint from the backend.
      try {
        saveAttempt(subject, decodedName, {
          attemptId: data.attemptId,
          score: data.score,
          correct: data.correct,
          wrong: data.wrong,
          skipped: data.skipped,
          total: data.total,
          points: data.points,
          timeTaken: finalTime || elapsed,
          questionTimes,
          results,
          completedAt: enriched.completedAt,
        })
      } catch {}

      // replace: true — so the finished quiz-play screen isn't left sitting
      // in the browser history. Without it, pressing the phone's back button
      // from the result page would land back on QuizPlay instead of going
      // to wherever the user came from (the quiz list).
      navigate(`/quiz/result/${data.attemptId}`, {
        state: { result: enriched },
        replace: true,
      })
    },
    onError: () => {
      toast.error('Submit failed')
      setSubmitting(false)
      setTimerStopped(false)
    },
  })

  // Timer - stops when timerStopped is true
  useEffect(() => {
    if (!timerStopped) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [timerStopped])

  // Auto Fullscreen + Lock
  useEffect(() => {
    fullscreenLocked.current = true
    
    const enterFS = () => {
      const el = document.documentElement
      if (!document.fullscreenElement && fullscreenLocked.current && !submitting) {
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {
            // Fullscreen failed - continue without it
            fullscreenLocked.current = false
          })
        }
      }
    }

    // Enter fullscreen on mount with slight delay
    const initTimer = setTimeout(() => enterFS(), 300)

    // Prevent exiting fullscreen
    const handleFSChange = () => {
      if (!document.fullscreenElement && fullscreenLocked.current && !submitting) {
        setTimeout(() => enterFS(), 200)
      }
    }

    // Block ESC key completely when quiz is active
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && fullscreenLocked.current && !submitting) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }
    }

    document.addEventListener('fullscreenchange', handleFSChange)
    document.addEventListener('keydown', handleKeyDown, true)
    
    return () => {
      clearTimeout(initTimer)
      fullscreenLocked.current = false
      document.removeEventListener('fullscreenchange', handleFSChange)
      document.removeEventListener('keydown', handleKeyDown, true)
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [submitting])

  const questions = data?.questions || []
  const q = questions[current]
  const answeredCount = Object.keys(answers).length
  const notAnsweredCount = visited.size - answeredCount
  const notVisitedCount = questions.length - visited.size
  const totalQuestions = questions.length

  const formatTime = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const getQuestionStatus = (i) => {
    if (i === current) return 'current'
    if (markedReview.has(i)) return 'review'
    if (answers[i] !== undefined) return 'answered'
    if (visited.has(i)) return 'not-answered'
    return 'not-visited'
  }

  const handleOptionSelect = (optIndex) => {
    if (timerStopped) return
    setAnswers(a => ({ ...a, [current]: optIndex }))
  }

  const handleClear = () => {
    if (timerStopped) return
    const newAnswers = { ...answers }
    delete newAnswers[current]
    setAnswers(newAnswers)
  }

  const handleMarkReview = () => {
    if (timerStopped) return
    setMarkedReview(prev => {
      const next = new Set(prev)
      if (next.has(current)) next.delete(current)
      else next.add(current)
      return next
    })
  }

  const goToQuestion = (i) => {
    if (i >= 0 && i < questions.length && i !== current) {
      commitQuestionTime(elapsed)
      setVisited(v => new Set([...v, i]))
      setCurrent(i)
      setShowPalette(false)
    }
  }

  const handleSaveNext = () => {
    if (current < questions.length - 1) {
      goToQuestion(current + 1)
    } else {
      handleSubmitClick()
    }
  }

  // Mobile swipe: swipe left -> next question, swipe right -> prev question
  const swipeNav = useSwipeQuestion(
    () => { if (current < questions.length - 1) goToQuestion(current + 1) },
    () => { if (current > 0) goToQuestion(current - 1) },
    timerStopped
  )

  // STOP TIMER when submit is clicked
  const handleSubmitClick = () => {
    commitQuestionTime(elapsed)
    setTimerStopped(true)
    clearInterval(timerRef.current)
    setFinalTime(elapsed) // Save final time
    setShowSubmitModal(true)
  }

  const confirmSubmit = () => {
    setShowSubmitModal(false)
    setSubmitting(true)
    submitMutation.mutate()
  }

  const cancelSubmit = () => {
    setShowSubmitModal(false)
    setTimerStopped(false) // Resume timer if user cancels
  }

  if (isLoading) return (
    <div className="fixed inset-0 bg-[#001123] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center animate-bounce">
        <Loader size={32} className="text-[#1299FD] animate-spin" />
      </div>
      <p className="text-white/60 text-sm font-medium">Loading questions...</p>
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
            {decodeURIComponent(name)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 border transition-all ${
            timerStopped 
              ? 'bg-danger-500/20 border-danger-500/30' 
              : 'bg-white/10 border-white/15'
          }`}>
            <Clock size={13} className={timerStopped ? 'text-danger-400' : 'text-white/50'} />
            <span className={`text-xs font-bold tabular-nums ${timerStopped ? 'text-danger-400' : 'text-white'}`}>
              {formatTime(timerStopped ? finalTime : elapsed)}
            </span>
            {timerStopped && (
              <span className="text-[10px] text-danger-400 font-medium ml-1">PAUSED</span>
            )}
          </div>
          <button
            onClick={() => setShowPalette(true)}
            className="sm:hidden bg-white/10 border border-white/15 text-white rounded-md p-1.5"
          >
            <Grid3X3 size={16} />
          </button>
        </div>
      </div>

      {/* ===== ACTION BAR (desktop/tablet) ===== */}
      <div className="hidden sm:flex flex-shrink-0 bg-[#f8fafc] border-b border-[#dfe7ef] items-center justify-center px-2 sm:px-3 h-[48px] gap-1.5">
        <button onClick={() => goToQuestion(current - 1)} disabled={current === 0 || timerStopped} className="act-btn">
          <ChevronLeft size={14} /> Prev
        </button>
        <button 
          onClick={handleMarkReview}
          disabled={timerStopped}
          className={`act-btn ${markedReview.has(current) ? '!bg-amber-500 !text-white !border-amber-500' : '!bg-white !text-gray-700 !border !border-gray-300 hover:!bg-gray-100'}`}
        >
          <Bookmark size={14} className={markedReview.has(current) ? 'fill-current' : ''} /> 
          {markedReview.has(current) ? 'Marked' : 'Review'}
        </button>
        <button onClick={handleSaveNext} disabled={timerStopped} className="act-btn">
          Save & Next <ChevronRight size={14} />
        </button>
        <button onClick={handleClear} disabled={timerStopped} className="act-btn !bg-white !text-gray-700 !border !border-gray-300 hover:!bg-gray-100">
          <X size={14} /> Clear
        </button>
        <button onClick={handleSubmitClick} className="act-btn !bg-gradient-to-r !from-pink-400 !to-danger-400 !text-white !border-none">
          <Send size={14} /> Submit
        </button>
      </div>

      {/* ===== MAIN CONTENT - Full screen, no scroll ===== */}
      <div className="flex-1 flex flex-col min-h-0 mr-0 sm:mr-64">
        <div className="flex-1 flex flex-col px-3 sm:px-4 lg:px-6 py-3 sm:py-4 min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                  Question {current + 1}<span className="text-gray-400 font-medium">/{totalQuestions}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {answers[current] !== undefined && (
                  <button
                    onClick={handleClear}
                    disabled={timerStopped}
                    className="flex items-center gap-1 text-danger-500 text-[11px] font-semibold bg-red-50 border border-red-200 rounded-full px-3 py-1 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <X size={11} /> <span className="hidden xs:inline">Clear Selection</span><span className="xs:hidden">Clear</span>
                  </button>
                )}
                <button
                  onClick={handleMarkReview}
                  disabled={timerStopped}
                  className={`flex items-center gap-1 text-[11px] font-semibold rounded-full px-3 py-1 transition-colors disabled:opacity-50 ${
                    markedReview.has(current) 
                      ? 'text-amber-600 bg-amber-50 border border-amber-200' 
                      : 'text-gray-500 bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Bookmark size={11} className={markedReview.has(current) ? 'fill-current' : ''} />
                  {markedReview.has(current) ? 'Marked' : 'Mark Review'}
                </button>
              </div>
            </div>

            {/* Mobile progress bar */}
            <div className="sm:hidden h-1 w-full bg-[#e2e8f0] rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full bg-[#1299FD]"
                initial={false}
                animate={{ width: `${((current + 1) / Math.max(totalQuestions, 1)) * 100}%` }}
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
                  <div 
                    className="h-full overflow-y-auto pr-1"
                    style={{ touchAction: 'pan-y' }}
                    {...swipeNav}
                  >
                    <div className="space-y-2 sm:space-y-2.5">
                      {q?.options?.map((opt, i) => {
                        const isSelected = answers[current] === i
                        return (
                          <button
                            key={i}
                            onClick={() => handleOptionSelect(i)}
                            disabled={timerStopped}
                            className={`w-full text-left flex items-center gap-3 p-3 sm:p-3.5 rounded-lg border-2 transition-all active:scale-[0.99] disabled:cursor-not-allowed ${
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

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <div className="sm:hidden flex-shrink-0 bg-white border-t border-[#dfe7ef] flex items-center gap-2 px-3 py-2.5 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <button onClick={() => goToQuestion(current - 1)} disabled={current === 0 || timerStopped} className="nav-btn-mob !flex-[0.8] disabled:opacity-30">
          <ChevronLeft size={16} /> Prev
        </button>
        <button 
          onClick={handleMarkReview}
          disabled={timerStopped}
          className={`nav-btn-mob !flex-[1] ${markedReview.has(current) ? '!bg-amber-500 !text-white !border-amber-500' : ''}`}
        >
          <Bookmark size={14} className={markedReview.has(current) ? 'fill-current' : ''} /> Review
        </button>
        {current < questions.length - 1 ? (
          <button onClick={handleSaveNext} disabled={timerStopped} className="nav-btn-mob !flex-[1.2] !bg-[#001123] !text-white !border-[#001123]">
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleSubmitClick} className="nav-btn-mob !flex-[1.2] !bg-gradient-to-r !from-pink-400 !to-danger-400 !text-white !border-none">
            Submit <Send size={14} />
          </button>
        )}
      </div>

      {/* ===== DESKTOP SIDE PANEL ===== */}
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
            <div className="text-lg font-black text-[#E23F3F]">{notAnsweredCount + notVisitedCount}</div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase">Not Answered</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, i) => {
              const status = getQuestionStatus(i)
              return (
                <button
                  key={i}
                  onClick={() => goToQuestion(i)}
                  className={`aspect-square rounded-md text-xs font-bold flex items-center justify-center ${
                    status === 'current' ? 'bg-[#001123] text-white shadow-[0_0_0_2px_rgba(0,17,35,0.3)]' :
                    status === 'answered' ? 'bg-[#2DD4BF] text-white' :
                    status === 'not-visited' ? 'bg-[#f3f4f6] border border-[#e5e7eb] text-[#374151]' :
                    status === 'review' ? 'bg-[#FFB020] text-white' :
                    'bg-[#FF5C5C] text-white'
                  }`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-3 border-t border-[#dfe7ef]">
          <button
            onClick={handleSubmitClick}
            className="w-full bg-gradient-to-r from-pink-400 to-danger-400 text-white rounded-lg py-2.5 font-extrabold text-sm flex items-center justify-center gap-2"
          >
            <Send size={16} /> Submit Quiz
          </button>
        </div>
      </div>

      {/* ===== MOBILE PALETTE ===== */}
      {showPalette && (
        <>
          <div className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowPalette(false)} />
          <div className="sm:hidden fixed top-0 right-0 w-[290px] max-w-[88vw] h-full bg-white z-50 border-l border-[#dfe7ef] flex flex-col animate-slide-in">
            <div className="bg-[#001123] text-white px-3 py-3 flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-2">
                <Grid3X3 size={14} /> Question Palette
              </span>
              <button onClick={() => setShowPalette(false)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[#dfe7ef] border-b border-[#dfe7ef]">
              <div className="p-2.5 text-center">
                <div className="text-base font-black text-[#14B8A6]">{answeredCount}</div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase">Answered</div>
              </div>
              <div className="p-2.5 text-center">
                <div className="text-base font-black text-[#E23F3F]">{notAnsweredCount + notVisitedCount}</div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase">Not Answered</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5">
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((_, i) => {
                  const status = getQuestionStatus(i)
                  return (
                    <button
                      key={i}
                      onClick={() => goToQuestion(i)}
                      className={`aspect-square rounded-md text-xs font-bold flex items-center justify-center ${
                        status === 'current' ? 'bg-[#001123] text-white shadow-[0_0_0_2px_rgba(0,17,35,0.3)]' :
                        status === 'answered' ? 'bg-[#2DD4BF] text-white' :
                        status === 'not-visited' ? 'bg-[#f3f4f6] border border-[#e5e7eb] text-[#374151]' :
                        status === 'review' ? 'bg-[#FFB020] text-white' :
                        'bg-[#FF5C5C] text-white'
                      }`}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-2.5 border-t border-[#dfe7ef]">
              <button
                onClick={handleSubmitClick}
                className="w-full bg-gradient-to-r from-pink-400 to-danger-400 text-white rounded-lg py-3 font-extrabold text-sm flex items-center justify-center gap-2"
              >
                <Send size={16} /> Submit Quiz
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== SUBMIT REVIEW MODAL ===== */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#dfe7ef]"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-amber-500" />
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 text-center mb-1">
              Submit Quiz?
            </h2>
            <p className="text-sm text-gray-500 text-center mb-4">
              Timer stopped at <strong className="text-gray-700">{formatTime(finalTime)}</strong>
            </p>

            <div className="bg-[#f8fafc] rounded-xl p-4 mb-4 border border-[#dfe7ef]">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-2xl font-black text-[#14B8A6]">{answeredCount}</div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">Answered</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#E23F3F]">{totalQuestions - answeredCount}</div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">Unanswered</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#dfe7ef] grid grid-cols-3 gap-2 text-center text-[10px]">
                <div>
                  <div className="font-bold text-amber-600">{markedReview.size}</div>
                  <div className="text-gray-500">Marked Review</div>
                </div>
                <div>
                  <div className="font-bold text-blue-600">{notAnsweredCount}</div>
                  <div className="text-gray-500">Not Answered</div>
                </div>
                <div>
                  <div className="font-bold text-gray-600">{notVisitedCount}</div>
                  <div className="text-gray-500">Not Visited</div>
                </div>
              </div>
            </div>

            {totalQuestions - answeredCount > 0 && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <AlertCircle size={16} className="text-danger-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-danger-600 font-medium">
                  {totalQuestions - answeredCount} question{totalQuestions - answeredCount > 1 ? 's' : ''} unanswered. 
                  Once submitted, you won't be able to resume.
                </p>
              </div>
            )}

            {totalQuestions - answeredCount === 0 && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <CheckCircle size={16} className="text-mint-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-700 font-medium">
                  All questions answered! Ready to submit.
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-5">
              <Clock size={14} />
              <span>Time: <strong className="text-gray-700">{formatTime(finalTime)}</strong></span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelSubmit}
                className="flex-1 py-3 rounded-xl border-2 border-[#dfe7ef] text-gray-700 font-bold text-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                Resume Quiz
              </button>
              <button
                onClick={confirmSubmit}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-400 to-danger-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-red-200"
              >
                <Send size={16} />
                Submit Now
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===== SUBMITTING LOADER ===== */}
      {submitting && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <p className="text-white font-bold text-lg">Submitting Quiz...</p>
          <p className="text-white/60 text-sm">Calculating your score</p>
        </div>
      )}

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

        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.25s ease-out; }

        @media (max-width: 640px) {
          .act-btn { font-size: 0.65rem; padding: 5px 8px; }
        }
      `}</style>
    </div>
  )
}
