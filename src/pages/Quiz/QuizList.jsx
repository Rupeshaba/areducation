import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Play, Clock, Users, Target, ChevronRight,
  Star, Zap, BookOpen, BarChart2, Brain, Share2, Search,
  ArrowLeft
} from 'lucide-react'
import api from '../../api/axios'
import CardThumbnail from '../../components/CardThumbnail'
import ShareQuizModal from '../../components/ShareQuizModal'

// Direct play link for a shared quiz (public /play route, no login needed).
function buildShareUrl(subject, quizName) {
  return `${window.location.origin}/play/${encodeURIComponent(subject)}/${encodeURIComponent(quizName)}`
}

function DifficultyBadge({ d }) {
  const cfg = {
    easy:   { label: 'Easy',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    medium: { label: 'Medium', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    hard:   { label: 'Hard',   cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  }[d?.toLowerCase()] || { label: d || 'Standard', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/20' }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function ScoreRing({ score, size = 40 }) {
  const r = 14, c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const color = score >= 60 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171'
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className="flex-shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 18 18)" />
      <text x="18" y="22" textAnchor="middle" fontSize="8" fontWeight="700" fill={color}>{score}%</text>
    </svg>
  )
}

// Skeleton row for loading state
function SkeletonRow() {
  return (
    <div className="animate-pulse flex flex-col md:flex-row gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <div className="w-full md:w-28 h-20 md:h-20 bg-white/5 rounded-xl"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/10 rounded w-2/3"></div>
        <div className="h-3 bg-white/5 rounded w-1/2"></div>
        <div className="h-3 bg-white/5 rounded w-1/3"></div>
      </div>
      <div className="flex md:flex-col items-center gap-2">
        <div className="w-10 h-10 bg-white/10 rounded-full"></div>
        <div className="w-20 h-8 bg-white/5 rounded-lg"></div>
      </div>
    </div>
  )
}

export default function QuizList() {
  const { subject } = useParams()
  const navigate = useNavigate()
  const [shareTarget, setShareTarget] = useState(null) // { name } of quiz to share
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [sortOption, setSortOption] = useState('default')

  const { data, isLoading } = useQuery({
    queryKey: ['quiz-list', subject],
    queryFn: () => api.get(`/quiz/list/${subject}`).then(r => r.data),
  })

  const quizzes = data?.quizzes || []
  const subjectName = data?.subjectName || decodeURIComponent(subject || '')

  // Filter and sort logic
  const filteredQuizzes = quizzes
    .filter(quiz => {
      const matchesSearch = quiz.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesDifficulty = difficultyFilter === 'all' || quiz.difficulty?.toLowerCase() === difficultyFilter.toLowerCase()
      return matchesSearch && matchesDifficulty
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'best-score':
          return (b.myBestScore || 0) - (a.myBestScore || 0)
        case 'most-attempts':
          return (b.attempts || 0) - (a.attempts || 0)
        case 'highest-avg':
          return (b.avgScore || 0) - (a.avgScore || 0)
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

  const difficultyFilters = ['all', 'easy', 'medium', 'hard']

  const clearFilters = () => {
    setSearchTerm('')
    setDifficultyFilter('all')
    setSortOption('default')
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl xl:max-w-6xl mx-auto px-3 sm:px-0">
        <div className="mb-6">
          <div className="h-8 bg-white/5 rounded-lg w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-white/5 rounded-lg w-1/4 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl xl:max-w-6xl mx-auto px-3 sm:px-0">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/25 via-purple-500/10 to-transparent p-5 mb-6"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <Trophy size={26} className="text-violet-300" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-0.5">Quiz Zone</p>
            <h1 className="text-xl font-bold text-white capitalize">{subjectName}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'} available</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
      </motion.div>

      {/* Controls: Search, Filters, Sort */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-sm transition-all"
              aria-label="Search quizzes"
            />
          </div>

          {/* Sort dropdown */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 cursor-pointer"
            aria-label="Sort quizzes"
          >
            <option value="default" className="bg-gray-900">Default</option>
            <option value="best-score" className="bg-gray-900">Best Score</option>
            <option value="most-attempts" className="bg-gray-900">Most Attempts</option>
            <option value="highest-avg" className="bg-gray-900">Highest Avg Score</option>
            <option value="name" className="bg-gray-900">Quiz Name</option>
          </select>
        </div>

        {/* Difficulty filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {difficultyFilters.map(filter => (
            <button
              key={filter}
              onClick={() => setDifficultyFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
                difficultyFilter === filter
                  ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/20'
                  : 'bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.06] hover:text-gray-200'
              }`}
              aria-pressed={difficultyFilter === filter}
            >
              {filter === 'all' ? 'All' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Quiz List */}
      {filteredQuizzes.length === 0 ? (
        quizzes.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No quizzes available for this subject yet.</p>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-gray-500 mb-4">No matching quizzes found</div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              Clear search & filters
            </button>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredQuizzes.map((quiz, i) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="group relative rounded-2xl border border-white/[0.07] hover:border-violet-500/40 transition-all duration-300 overflow-hidden cursor-pointer bg-white/[0.02] hover:bg-white/[0.04]"
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
                <div className="flex flex-col md:flex-row p-4 md:p-5 gap-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-full md:w-28 h-20 md:h-20 rounded-xl overflow-hidden relative">
                    <CardThumbnail
                      item={quiz}
                      alt={quiz.name}
                      className="group-hover:scale-105 transition-transform duration-500 w-full h-full object-cover"
                      fallback={
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-900/40 via-purple-900/30 to-[#0d0d1a]">
                          <Brain size={24} className="text-violet-500/30" />
                        </div>
                      }
                    />
                    {quiz.youtubeUrl && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-violet-300 text-[10px] font-bold px-2 py-1 rounded-full border border-violet-500/30">
                        <Zap size={9} /> AI
                      </div>
                    )}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-base leading-snug group-hover:text-violet-300 transition-colors truncate">
                        {quiz.name}
                      </h3>
                      {quiz.myBestScore > 0 && (
                        <div className="md:hidden flex-shrink-0">
                          <ScoreRing score={Math.round(quiz.myBestScore)} size={32} />
                        </div>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {quiz.difficulty && <DifficultyBadge d={quiz.difficulty} />}
                      {quiz.questionCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Target size={12} /> {quiz.questionCount} Qs
                        </span>
                      )}
                      {quiz.duration > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={12} /> {quiz.duration}m
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                      {quiz.attempts > 0 && (
                        <span className="flex items-center gap-1">
                          <Users size={12} /> {quiz.attempts} attempts
                        </span>
                      )}
                      {quiz.avgScore > 0 && (
                        <span className="flex items-center gap-1">
                          <BarChart2 size={12} /> {Math.round(quiz.avgScore)}% avg
                        </span>
                      )}
                      {quiz.myBestScore > 0 && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Zap size={12} />
                          Best: {Math.round(quiz.myBestScore)}% · {quiz.myAttempts || 1} attempt{quiz.myAttempts > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: Score + Actions (desktop) */}
                  <div className="flex md:flex-col items-center justify-between gap-3 md:gap-4 md:pl-2 md:border-l md:border-white/5">
                    {quiz.myBestScore > 0 && (
                      <div className="hidden md:block">
                        <ScoreRing score={Math.round(quiz.myBestScore)} size={40} />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/quiz/${encodeURIComponent(subject)}/${encodeURIComponent(quiz.name)}/play`)
                        }}
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-bold transition-all shadow-lg shadow-violet-500/20 flex items-center gap-1.5"
                      >
                        <Play size={14} className="fill-current" />
                        {quiz.myBestScore > 0 ? 'Retry' : 'Start'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShareTarget({ name: quiz.name })
                        }}
                        aria-label="Share quiz"
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-violet-500/20 border border-white/10 hover:border-violet-500/40 text-gray-300 hover:text-violet-300 active:scale-95 transition-all"
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom score bar (desktop only) */}
                {quiz.myBestScore > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(quiz.myBestScore, 100)}%` }}
                    transition={{ delay: i * 0.04 + 0.3, duration: 0.7, ease: 'easeOut' }}
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
