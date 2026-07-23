import { useState, useRef } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, XCircle, MinusCircle, Trophy, RotateCcw,
  BarChart3, ChevronLeft, ChevronRight, X, BookOpen, Target
} from 'lucide-react'
import api from '../../api/axios'
import formatText from '../../utils/formatText'

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

export default function QuizResult() {
  const { attemptId } = useParams()
  const location = useLocation()
  const stateResult = location.state?.result

  const [showAnalysis, setShowAnalysis] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)

  const { data } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => api.get(`/quiz/attempt/${attemptId}`).then(r => r.data),
    enabled: !stateResult,
  })

  const result = stateResult || data?.attempt
  if (!result) return (
    <div className="flex justify-center py-20">
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
    <div className="max-w-3xl mx-auto px-3 sm:px-4 space-y-6 sm:space-y-8 pb-12 relative">
      
      {/* ═══ HERO SCORE CARD ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#1a1040] via-[#12162A] to-[#0B0E1A] border border-white/[0.08] p-5 sm:p-10 text-center"
      >
        <div className={`absolute top-[-30%] left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[100px] opacity-30 ${
          result.score >= 75 ? 'bg-mint-500' : result.score >= 50 ? 'bg-amber-500' : 'bg-danger-500'
        }`} />

        {/* Score Ring */}
        <div className="relative z-10 w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-5 sm:mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="60" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="none" />
            <motion.circle
              cx="70" cy="70" r="60"
              stroke={ringColor}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 60}
              initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - result.score / 100) }}
              transition={{ duration: 2, ease: 'easeOut', delay: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className={`text-4xl sm:text-5xl font-black ${scoreColor}`}
            >
              {result.score}%
            </motion.span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <h2 className="text-xl sm:text-2xl font-black text-white mb-2">{scoreLabel}</h2>
          <p className="text-gray-400 text-sm mb-8">
            {result.score >= 75 ? 'Outstanding performance!' : result.score >= 50 ? 'You are improving!' : 'Practice makes perfect!'}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="relative z-10 grid grid-cols-3 gap-3 max-w-sm mx-auto mb-6"
        >
          {[
            { label: 'Correct', value: result.correct, icon: CheckCircle, color: 'text-mint-400', bg: 'bg-mint-500/10', border: 'border-mint-500/20' },
            { label: 'Wrong', value: result.wrong, icon: XCircle, color: 'text-danger-400', bg: 'bg-danger-500/10', border: 'border-danger-500/20' },
            { label: 'Skipped', value: result.skipped, icon: MinusCircle, color: 'text-gray-400', bg: 'bg-white/[0.03]', border: 'border-white/[0.08]' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-3`}>
              <s.icon size={18} className={`${s.color} mx-auto mb-1.5`} />
              <div className="text-xl font-black text-white">{s.value}</div>
              <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1 }}
          className="relative z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/20"
        >
          <Trophy size={16} className="text-amber-400" />
          <span className="font-bold text-amber-400 text-sm">+{result.points} points earned</span>
        </motion.div>
      </motion.div>

      {/* ═══ ACTION BUTTONS ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="flex gap-3"
      >
        <Link to={result.subject && result.quizName ? `/quiz/${result.subject}/${encodeURIComponent(result.quizName)}/play` : result.subject ? `/quiz/${result.subject}` : '/quiz'}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-primary-500/25">
          <RotateCcw size={16} /> Try Again
        </Link>
        <Link
          to={`/quiz/analysis/${attemptId}`}
          state={{ result }}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-primary-500/30 text-gray-200 text-sm font-bold transition-all"
        >
          <BarChart3 size={16} className="text-primary-400" /> Analysis
        </Link>
      </motion.div>

      {/* ═══ ANALYSIS MODAL ═══ */}
      <AnimatePresence>
        {showAnalysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAnalysis(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-[#0B0E1A] border border-white/[0.1] shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06] flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Target size={18} className="text-primary-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white">Quiz Analysis</h3>
                    <p className="text-xs text-gray-500">Question {currentQIndex + 1} of {questions.length}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAnalysis(false)}
                  className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all flex-shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-white/[0.05] flex-shrink-0">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Question Content (swipeable on touch devices) */}
              <div
                className="p-4 sm:p-6 overflow-y-auto flex-1"
                style={{ touchAction: 'pan-y' }}
                {...swipeNav}
              >
                <AnimatePresence mode="wait">
                  {currentQ && (
                    <motion.div
                      key={currentQIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 sm:space-y-5"
                    >
                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          currentQ.isCorrect
                            ? 'bg-mint-500/10 text-mint-400 border-mint-500/20'
                            : currentQ.isSkipped
                            ? 'bg-white/[0.05] text-gray-400 border-white/[0.1]'
                            : 'bg-danger-500/10 text-danger-400 border-danger-500/20'
                        }`}>
                          {currentQ.isCorrect ? '✓ Correct' : currentQ.isSkipped ? '− Skipped' : '✗ Incorrect'}
                        </span>
                        <span className="text-xs text-gray-600">Q{currentQIndex + 1}</span>
                      </div>

                      {/* Question */}
                      <h4 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                        {formatText(currentQ.question)}
                      </h4>

                      {/* Options */}
                      <div className="space-y-2">
                        {currentQ.options.map((opt, j) => {
                          const isCorrect = j === currentQ.correctAnswer
                          const isSelected = j === currentQ.givenAnswer

                          return (
                            <div
                              key={j}
                              className={`flex items-center gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm transition-all ${
                                isCorrect
                                  ? 'bg-mint-500/10 border-mint-500/20 text-mint-400'
                                  : isSelected && !currentQ.isCorrect
                                  ? 'bg-danger-500/10 border-danger-500/20 text-danger-400'
                                  : 'bg-white/[0.02] border-white/[0.06] text-gray-400'
                              }`}
                            >
                              <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                                isCorrect
                                  ? 'bg-mint-500/20 text-mint-400'
                                  : isSelected && !currentQ.isCorrect
                                  ? 'bg-danger-500/20 text-danger-400'
                                  : 'bg-white/[0.05] text-gray-500'
                              }`}>
                                {isCorrect ? <CheckCircle size={14} /> : isSelected && !currentQ.isCorrect ? <XCircle size={14} /> : ['A', 'B', 'C', 'D'][j]}
                              </span>
                              <span className="flex-1 text-[13px] sm:text-sm">{formatText(opt)}</span>
                              {isCorrect && <span className="hidden xs:inline text-[10px] font-bold text-mint-400 uppercase flex-shrink-0">Correct</span>}
                              {isSelected && !currentQ.isCorrect && <span className="hidden xs:inline text-[10px] font-bold text-danger-400 uppercase flex-shrink-0">Your Answer</span>}
                            </div>
                          )
                        })}
                      </div>

                      {/* Explanation */}
                      {currentQ.explanation && (
                        <div className="rounded-xl bg-amber-500/[0.05] border border-amber-500/15 p-3.5 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={14} className="text-amber-400" />
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Explanation</span>
                          </div>
                          <p className="text-[13px] sm:text-sm text-gray-400 leading-relaxed">{formatText(currentQ.explanation)}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between p-3.5 sm:p-5 border-t border-white/[0.06] bg-white/[0.02] flex-shrink-0">
                <button
                  onClick={goPrev}
                  disabled={currentQIndex === 0}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.05] text-gray-300"
                >
                  <ChevronLeft size={16} /> <span className="hidden xs:inline">Previous</span>
                </button>

                {/* Dots */}
                <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-[40%] no-scrollbar">
                  {questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentQIndex(i)}
                      className={`h-2 rounded-full flex-shrink-0 transition-all ${
                        i === currentQIndex ? 'w-6 bg-primary-400' : `w-2 ${questions[i].isCorrect ? 'bg-mint-500/40' : questions[i].isSkipped ? 'bg-gray-600' : 'bg-danger-500/40'}`
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={goNext}
                  disabled={currentQIndex === questions.length - 1}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-xs sm:text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20"
                >
                  <span className="hidden xs:inline">Next</span> <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)

  const { data } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => api.get(`/quiz/attempt/${attemptId}`).then(r => r.data),
    enabled: !stateResult,
  })

  const result = stateResult || data?.attempt
  if (!result) return (
    <div className="flex justify-center py-20">
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
    <div className="max-w-3xl mx-auto px-3 sm:px-4 space-y-6 sm:space-y-8 pb-12 relative">
      
      {/* ═══ HERO SCORE CARD ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#1a1040] via-[#12162A] to-[#0B0E1A] border border-white/[0.08] p-5 sm:p-10 text-center"
      >
        <div className={`absolute top-[-30%] left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[100px] opacity-30 ${
          result.score >= 75 ? 'bg-mint-500' : result.score >= 50 ? 'bg-amber-500' : 'bg-danger-500'
        }`} />

        {/* Score Ring */}
        <div className="relative z-10 w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-5 sm:mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="60" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="none" />
            <motion.circle
              cx="70" cy="70" r="60"
              stroke={ringColor}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 60}
              initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - result.score / 100) }}
              transition={{ duration: 2, ease: 'easeOut', delay: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className={`text-4xl sm:text-5xl font-black ${scoreColor}`}
            >
              {result.score}%
            </motion.span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <h2 className="text-xl sm:text-2xl font-black text-white mb-2">{scoreLabel}</h2>
          <p className="text-gray-400 text-sm mb-8">
            {result.score >= 75 ? 'Outstanding performance!' : result.score >= 50 ? 'You are improving!' : 'Practice makes perfect!'}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="relative z-10 grid grid-cols-3 gap-3 max-w-sm mx-auto mb-6"
        >
          {[
            { label: 'Correct', value: result.correct, icon: CheckCircle, color: 'text-mint-400', bg: 'bg-mint-500/10', border: 'border-mint-500/20' },
            { label: 'Wrong', value: result.wrong, icon: XCircle, color: 'text-danger-400', bg: 'bg-danger-500/10', border: 'border-danger-500/20' },
            { label: 'Skipped', value: result.skipped, icon: MinusCircle, color: 'text-gray-400', bg: 'bg-white/[0.03]', border: 'border-white/[0.08]' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-3`}>
              <s.icon size={18} className={`${s.color} mx-auto mb-1.5`} />
              <div className="text-xl font-black text-white">{s.value}</div>
              <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1 }}
          className="relative z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/20"
        >
          <Trophy size={16} className="text-amber-400" />
          <span className="font-bold text-amber-400 text-sm">+{result.points} points earned</span>
        </motion.div>
      </motion.div>

      {/* ═══ ACTION BUTTONS ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="flex gap-3"
      >
        <Link to={`/quiz/${result.subject}`}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-primary-500/25">
          <RotateCcw size={16} /> Try Again
        </Link>
        <Link
          to={`/quiz/analysis/${attemptId}`}
          state={{ result }}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-primary-500/30 text-gray-200 text-sm font-bold transition-all"
        >
          <BarChart3 size={16} className="text-primary-400" /> Analysis
        </Link>
      </motion.div>

      {/* ═══ ANALYSIS MODAL ═══ */}
      <AnimatePresence>
        {showAnalysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAnalysis(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-[#0B0E1A] border border-white/[0.1] shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06] flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Target size={18} className="text-primary-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white">Quiz Analysis</h3>
                    <p className="text-xs text-gray-500">Question {currentQIndex + 1} of {questions.length}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAnalysis(false)}
                  className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all flex-shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-white/[0.05] flex-shrink-0">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Question Content (swipeable on touch devices) */}
              <div
                className="p-4 sm:p-6 overflow-y-auto flex-1"
                style={{ touchAction: 'pan-y' }}
                {...swipeNav}
              >
                <AnimatePresence mode="wait">
                  {currentQ && (
                    <motion.div
                      key={currentQIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 sm:space-y-5"
                    >
                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          currentQ.isCorrect
                            ? 'bg-mint-500/10 text-mint-400 border-mint-500/20'
                            : currentQ.isSkipped
                            ? 'bg-white/[0.05] text-gray-400 border-white/[0.1]'
                            : 'bg-danger-500/10 text-danger-400 border-danger-500/20'
                        }`}>
                          {currentQ.isCorrect ? '✓ Correct' : currentQ.isSkipped ? '− Skipped' : '✗ Incorrect'}
                        </span>
                        <span className="text-xs text-gray-600">Q{currentQIndex + 1}</span>
                      </div>

                      {/* Question */}
                      <h4 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                        {currentQ.question}
                      </h4>

                      {/* Options */}
                      <div className="space-y-2">
                        {currentQ.options.map((opt, j) => {
                          const isCorrect = j === currentQ.correctAnswer
                          const isSelected = j === currentQ.givenAnswer

                          return (
                            <div
                              key={j}
                              className={`flex items-center gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm transition-all ${
                                isCorrect
                                  ? 'bg-mint-500/10 border-mint-500/20 text-mint-400'
                                  : isSelected && !currentQ.isCorrect
                                  ? 'bg-danger-500/10 border-danger-500/20 text-danger-400'
                                  : 'bg-white/[0.02] border-white/[0.06] text-gray-400'
                              }`}
                            >
                              <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                                isCorrect
                                  ? 'bg-mint-500/20 text-mint-400'
                                  : isSelected && !currentQ.isCorrect
                                  ? 'bg-danger-500/20 text-danger-400'
                                  : 'bg-white/[0.05] text-gray-500'
                              }`}>
                                {isCorrect ? <CheckCircle size={14} /> : isSelected && !currentQ.isCorrect ? <XCircle size={14} /> : ['A', 'B', 'C', 'D'][j]}
                              </span>
                              <span className="flex-1 text-[13px] sm:text-sm">{opt}</span>
                              {isCorrect && <span className="hidden xs:inline text-[10px] font-bold text-mint-400 uppercase flex-shrink-0">Correct</span>}
                              {isSelected && !currentQ.isCorrect && <span className="hidden xs:inline text-[10px] font-bold text-danger-400 uppercase flex-shrink-0">Your Answer</span>}
                            </div>
                          )
                        })}
                      </div>

                      {/* Explanation */}
                      {currentQ.explanation && (
                        <div className="rounded-xl bg-amber-500/[0.05] border border-amber-500/15 p-3.5 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={14} className="text-amber-400" />
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Explanation</span>
                          </div>
                          <p className="text-[13px] sm:text-sm text-gray-400 leading-relaxed">{currentQ.explanation}</p>
                        </div>
                      )}

                      {/* Swipe hint - mobile only */}
                      <div className="sm:hidden flex items-center justify-center gap-1.5 text-[11px] text-gray-600 pt-1 select-none">
                        <ChevronLeft size={12} />
                        <span>Swipe to change question</span>
                        <ChevronRight size={12} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between p-3.5 sm:p-5 border-t border-white/[0.06] bg-white/[0.02] flex-shrink-0">
                <button
                  onClick={goPrev}
                  disabled={currentQIndex === 0}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.05] text-gray-300"
                >
                  <ChevronLeft size={16} /> <span className="hidden xs:inline">Previous</span>
                </button>

                {/* Dots */}
                <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-[40%] no-scrollbar">
                  {questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentQIndex(i)}
                      className={`h-2 rounded-full flex-shrink-0 transition-all ${
                        i === currentQIndex ? 'w-6 bg-primary-400' : `w-2 ${questions[i].isCorrect ? 'bg-mint-500/40' : questions[i].isSkipped ? 'bg-gray-600' : 'bg-danger-500/40'}`
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={goNext}
                  disabled={currentQIndex === questions.length - 1}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-xs sm:text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20"
                >
                  <span className="hidden xs:inline">Next</span> <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
