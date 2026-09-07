import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Play, Clock, Users, Target,
  Zap, BookOpen, BarChart2, Share2, Search,
  ArrowLeft
} from 'lucide-react'
import api from '../../api/axios'
import CardThumbnail from '../../components/CardThumbnail'
import ShareQuizModal from '../../components/ShareQuizModal'

// Direct play link for a shared quiz (public /play route, no login needed).
function buildShareUrl(subject, quizName) {
  return `${window.location.origin}/play/${encodeURIComponent(subject)}/${encodeURIComponent(quizName)}`
}

function ScoreRing({ score, size = 40 }) {
  const r = 14, c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const color = score >= 60 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className="flex-shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 18 18)" />
      <text x="18" y="22" textAnchor="middle" fontSize="8" fontWeight="700" fill={color}>{score}%</text>
    </svg>
  )
}

// Skeleton row for loading state — matches the content-list row shape
function ShimmerRow() {
  return (
    <div className="animate-pulse flex items-center gap-3 p-2.5 rounded-2xl"
      style={{ background: '#F0F1F6', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex-shrink-0 bg-black/5"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-black/10 rounded w-3/5"></div>
        <div className="h-3 bg-black/5 rounded w-2/5"></div>
      </div>
    </div>
  )
}

export default function QuizList() {
  const { subject } = useParams()
  const navigate = useNavigate()
  const [shareTarget, setShareTarget] = useState(null) // { name } of quiz to share
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['quiz-list', subject],
    queryFn: () => api.get(`/quiz/list/${subject}`).then(r => r.data),
  })

  const quizzes = data?.quizzes || []
  const subjectName = data?.subjectName || decodeURIComponent(subject || '')

  // Search only — no difficulty filter, no sort dropdown
  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const clearFilters = () => {
    setSearchTerm('')
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl pb-12">
        <div className="mb-5">
          <div className="h-8 bg-black/5 rounded-lg w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-black/5 rounded-lg w-1/4 animate-pulse"></div>
        </div>
        <div className="flex flex-col gap-2.5">
          {[...Array(5)].map((_, i) => <ShimmerRow key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl pb-12">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between mb-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Trophy size={17} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 leading-none capitalize">{subjectName}</h1>
            <p className="text-[11px] mt-0.5 text-gray-500">
              {quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'} available
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex-shrink-0 p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
      </motion.div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 text-sm transition-all"
            aria-label="Search quizzes"
          />
        </div>
      </div>

      {/* Quiz List */}
      {filteredQuizzes.length === 0 ? (
        quizzes.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: '#F0F1F6', border: '1px solid rgba(0,0,0,0.06)' }}>
              <BookOpen size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1">No Quizzes Yet</h3>
            <p className="text-xs max-w-xs leading-relaxed text-gray-500">
              No quizzes available for this subject yet.
            </p>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-gray-500 mb-4 text-sm">No matching quizzes found</div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
            >
              Clear search & filters
            </button>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2.5">
          <AnimatePresence>
            {filteredQuizzes.map((quiz, i) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                className="group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer"
                style={{ background: '#F7F8FC', border: '1px solid rgba(0,0,0,0.06)' }}
                onClick={() => navigate(`/quiz/${encodeURIComponent(subject)}/${encodeURIComponent(quiz.name)}/play`)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/quiz/${encodeURIComponent(subject)}/${encodeURIComponent(quiz.name)}/play`)
                  }
                }}
              >
                <div className="flex items-center gap-3 p-2.5">
                  {/* Thumbnail — small square, list-strip style, same as content list */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <CardThumbnail item={quiz} alt={quiz.name} />
                    {quiz.youtubeUrl && (
                      <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm text-white text-[8px] font-bold px-1 py-0.5 rounded-full">
                        <Zap size={7} /> AI
                      </div>
                    )}
                  </div>

                  {/* Text content — takes remaining width */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-1">
                      {quiz.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {quiz.questionCount > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Target size={11} /> {quiz.questionCount} Qs
                        </span>
                      )}
                      {quiz.duration > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Clock size={11} /> {quiz.duration}m
                        </span>
                      )}
                    </div>
                    <div className="mt-1 hidden sm:flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                      {quiz.attempts > 0 && (
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {quiz.attempts} attempts
                        </span>
                      )}
                      {quiz.avgScore > 0 && (
                        <span className="flex items-center gap-1">
                          <BarChart2 size={11} /> {Math.round(quiz.avgScore)}% avg
                        </span>
                      )}
                      {quiz.myBestScore > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-emerald-600">
                          <Zap size={11} />
                          Best: {Math.round(quiz.myBestScore)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score ring — only when there's a score to show */}
                  {quiz.myBestScore > 0 && (
                    <div className="flex-shrink-0">
                      <ScoreRing score={Math.round(quiz.myBestScore)} size={34} />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/quiz/${encodeURIComponent(subject)}/${encodeURIComponent(quiz.name)}/play`)
                      }}
                      className="px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-primary-500/20 flex items-center gap-1"
                    >
                      <Play size={12} className="fill-current" />
                      <span className="hidden xs:inline">{quiz.myBestScore > 0 ? 'Retry' : 'Start'}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShareTarget({ name: quiz.name })
                      }}
                      aria-label="Share quiz"
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:border-primary-400 text-gray-400 hover:text-primary-500 active:scale-95 transition-all"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Bottom score bar */}
                {quiz.myBestScore > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(quiz.myBestScore, 100)}%` }}
                    transition={{ delay: i * 0.03 + 0.2, duration: 0.6, ease: 'easeOut' }}
                    className={`absolute bottom-0 left-0 h-0.5 ${
                      quiz.myBestScore >= 60 ? 'bg-emerald-500' : quiz.myBestScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ShareQuizModal
        open={!!shareTarget}
        onClose={() => setShareTarget(null)}
        quizName={shareTarget?.name}
        subject={subjectName}
        shareUrl={shareTarget ? buildShareUrl(subject, shareTarget.name) : null}
      />
    </div>
  )
}
