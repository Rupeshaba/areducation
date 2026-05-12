import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, AlertCircle, 
  Loader, X, Bookmark, Send, AlertTriangle, Grid3X3
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

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

  const { data, isLoading } = useQuery({
    queryKey: ['quiz-questions', subject, name],
    queryFn: () => api.get(`/quiz/${subject}/${encodeURIComponent(name)}/questions`).then(r => r.data),
  })

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/quiz/${subject}/${encodeURIComponent(name)}/submit`, {
      answers,
      timeTaken: finalTime || elapsed,
    }).then(r => r.data),
    onSuccess: (data) => {
      fullscreenLocked.current = false
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      toast.success(`Score: ${data.score}%`)
      // Save to recent attempts in localStorage
      try {
        const recent = JSON.parse(localStorage.getItem('ar_recent_attempts') || '[]')
        const entry = {
          quizName: decodeURIComponent(name),
          subject,
          score: data.score,
          correct: data.correct,
          total: data.total,
          points: data.points,
          completedAt: Date.now(),
        }
        const updated = [entry, ...recent.filter(a => !(a.quizName === entry.quizName && a.subject === subject))].slice(0, 20)
        localStorage.setItem('ar_recent_attempts', JSON.stringify(updated))
      } catch {}
      navigate(`/quiz/result/${data.attemptId}`, { state: { result: data } })
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
          el.requestFullscreen().catch(() => {})
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen()
        }
      }
    }

    // Enter fullscreen on mount with slight delay
    const initTimer = setTimeout(() => enterFS(), 300)

    // Prevent exiting fullscreen
    const handleFSChange = () => {
      if (!document.fullscreenElement && fullscreenLocked.current && !submitting) {
        // Small delay then re-enter
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

    // Block fullscreen exit via various methods
    const blockFSExit = (e) => {
      if (fullscreenLocked.current && !submitting) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    document.addEventListener('fullscreenchange', handleFSChange)
    document.addEventListener('webkitfullscreenchange', handleFSChange)
    document.addEventListener('keydown', handleKeyDown, true)
    
    // Also block on window
    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      clearTimeout(initTimer)
      fullscreenLocked.current = false
      document.removeEventListener('fullscreenchange', handleFSChange)
      document.removeEventListener('webkitfullscreenchange', handleFSChange)
      document.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keydown', handleKeyDown, true)
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
    if (i >= 0 && i < questions.length) {
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

  // STOP TIMER when submit is clicked
  const handleSubmitClick = () => {
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
    <div className="h-screen bg-[#001123] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center animate-bounce">
        <Loader size={32} className="text-[#1299FD] animate-spin" />
      </div>
      <p className="text-white/60 text-sm font-medium">Loading questions...</p>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-[#eff3f8] overflow-hidden select-none">
      {/* ===== TOP BAR ===== */}
      <div className="flex-shrink-0 bg-[#001123] flex items-center justify-between px-3 sm:px-4 h-[52px] z-50">
        <div className="flex items-center gap-3">
          <span className="text-white font-extrabold text-sm tracking-wide">AR QUIZ</span>
          <span className="hidden sm:block text-white/40 text-xs">|</span>
          <span className="hidden sm:block text-white/50 text-[11px] font-medium truncate max-w-[180px]">
            {decodeURIComponent(name)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 border transition-all ${
            timerStopped 
              ? 'bg-red-500/20 border-red-500/30' 
              : 'bg-white/10 border-white/15'
          }`}>
            <Clock size={13} className={timerStopped ? 'text-red-400' : 'text-white/50'} />
            <span className={`text-xs font-bold tabular-nums ${timerStopped ? 'text-red-300' : 'text-white'}`}>
              {formatTime(timerStopped ? finalTime : elapsed)}
            </span>
            {timerStopped && (
              <span className="text-[10px] text-red-400 font-medium ml-1">PAUSED</span>
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

      {/* ===== ACTION BAR ===== */}
      <div className="flex-shrink-0 bg-[#f8fafc] border-b border-[#dfe7ef] flex items-center justify-center px-2 sm:px-3 h-[52px] gap-1.5 overflow-x-auto">
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
        <button onClick={handleSubmitClick} className="act-btn !bg-gradient-to-r !from-pink-400 !to-red-400 !text-white !border-none">
          <Send size={14} /> Submit
        </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Panel */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-800">
              Question {current + 1}
            </span>
            <div className="flex items-center gap-2">
              {answers[current] !== undefined && (
                <button
                  onClick={handleClear}
                  disabled={timerStopped}
                  className="flex items-center gap-1 text-red-500 text-[11px] font-semibold bg-red-50 border border-red-200 rounded-full px-3 py-1 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <X size={11} /> Clear Selection
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

          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <div className="bg-white border border-[#dfe7ef] rounded-xl p-3 sm:p-4 mb-3 shadow-sm">
                <p className="text-gray-900 text-sm sm:text-base font-semibold leading-relaxed whitespace-pre-wrap">
                  {q?.question}
                </p>
              </div>

              <div className="bg-white border border-[#dfe7ef] rounded-xl p-3 sm:p-4 shadow-sm">
                <div className="space-y-2">
                  {q?.options?.map((opt, i) => {
                    const isSelected = answers[current] === i
                    return (
                      <button
                        key={i}
                        onClick={() => handleOptionSelect(i)}
                        disabled={timerStopped}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border-2 transition-all active:scale-[0.99] disabled:cursor-not-allowed ${
                          isSelected
                            ? 'border-[#1299FD] bg-[#1299FD]/5 shadow-[0_0_0_2px_rgba(18,153,253,0.15)]'
                            : 'border-[#dfe7ef] bg-[#fafbfc] hover:border-[#1299FD] hover:bg-[#1299FD]/[0.04]'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 transition-all ${
                          isSelected ? 'bg-[#1299FD] text-white' : 'bg-[#dfe7ef] text-gray-500'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className={`text-sm flex-1 ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                          {opt}
                        </span>
                        {isSelected && <CheckCircle size={16} className="text-[#1299FD] flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar (Desktop) */}
        <div className="hidden sm:flex flex-col w-[260px] lg:w-[280px] border-l border-[#dfe7ef] bg-white flex-shrink-0">
          <div className="bg-[#001123] text-white px-3 py-2.5 text-xs font-bold flex items-center gap-2">
            <Grid3X3 size={14} className="text-[#1299FD]" />
            Question Palette
          </div>

          <div className="flex-1 overflow-y-auto p-2.5">
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((_, i) => {
                const status = getQuestionStatus(i)
                return (
                  <button
                    key={i}
                    onClick={() => goToQuestion(i)}
                    disabled={timerStopped}
                    className={`aspect-square rounded-md text-xs font-bold flex items-center justify-center transition-all active:scale-95 hover:scale-105 disabled:cursor-not-allowed ${
                      status === 'current' ? 'bg-[#001123] text-white shadow-[0_0_0_3px_rgba(0,17,35,0.3)] scale-110' :
                      status === 'answered' ? 'bg-[#22c55e] text-white' :
                      status === 'not-visited' ? 'bg-[#f3f4f6] border border-[#e5e7eb] text-[#374151]' :
                      status === 'review' ? 'bg-[#f59e0b] text-white' :
                      'bg-[#ef4444] text-white'
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="px-2.5 py-2 border-t border-[#dfe7ef] grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#22c55e]"></span> Answered</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#ef4444]"></span> Not Answered</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#f59e0b]"></span> Review</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#f3f4f6] border border-[#e5e7eb]"></span> Not Visited</div>
          </div>

          <div className="border-t border-[#dfe7ef]">
            <div className="grid grid-cols-2 divide-x divide-[#dfe7ef]">
              <div className="p-3 text-center">
                <div className="text-xl font-black text-[#16a34a]">{answeredCount}</div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Answered</div>
              </div>
              <div className="p-3 text-center">
                <div className="text-xl font-black text-[#dc2626]">{notAnsweredCount + notVisitedCount}</div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Not Answered</div>
              </div>
            </div>
          </div>

          <div className="p-2.5 border-t border-[#dfe7ef]">
            <button
              onClick={handleSubmitClick}
              className="w-full bg-gradient-to-r from-pink-400 to-red-400 text-white rounded-lg py-3 font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-red-200"
            >
              <Send size={16} /> Submit Quiz
            </button>
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
          <button onClick={handleSubmitClick} className="nav-btn-mob !flex-[1.2] !bg-gradient-to-r !from-pink-400 !to-red-400 !text-white !border-none">
            Submit <Send size={14} />
          </button>
        )}
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
                <div className="text-base font-black text-[#16a34a]">{answeredCount}</div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase">Answered</div>
              </div>
              <div className="p-2.5 text-center">
                <div className="text-base font-black text-[#dc2626]">{notAnsweredCount + notVisitedCount}</div>
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
                        status === 'answered' ? 'bg-[#22c55e] text-white' :
                        status === 'not-visited' ? 'bg-[#f3f4f6] border border-[#e5e7eb] text-[#374151]' :
                        status === 'review' ? 'bg-[#f59e0b] text-white' :
                        'bg-[#ef4444] text-white'
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
                className="w-full bg-gradient-to-r from-pink-400 to-red-400 text-white rounded-lg py-3 font-extrabold text-sm flex items-center justify-center gap-2"
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
                  <div className="text-2xl font-black text-[#16a34a]">{answeredCount}</div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">Answered</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#dc2626]">{totalQuestions - answeredCount}</div>
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
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">
                  {totalQuestions - answeredCount} question{totalQuestions - answeredCount > 1 ? 's' : ''} unanswered. 
                  Once submitted, you won't be able to resume.
                </p>
              </div>
            )}

            {totalQuestions - answeredCount === 0 && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
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
                className="flex-1 py-3 rounded-xl border-2 border-[#dfe7ef] text-gray-700 font-bold text-sm hover:bg-gray-50 active:scale-95 transition-all"
              >
                Resume Quiz
              </button>
              <button
                onClick={confirmSubmit}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-400 to-red-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-red-200"
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