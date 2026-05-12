import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Trophy, Play, Clock, Users, Target, ChevronRight,
  Star, Zap, BookOpen, BarChart2, Brain
} from 'lucide-react'
import api from '../../api/axios'

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

export default function QuizList() {
  const { subject } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['quiz-list', subject],
    queryFn: () => api.get(`/quiz/list/${subject}`).then(r => r.data),
  })

  const quizzes = data?.quizzes || []
  const subjectName = data?.subjectName || decodeURIComponent(subject || '')

  if (isLoading) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-9 h-9 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-4xl">

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
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-0.5">Quiz Zone</p>
            <h1 className="text-xl font-bold text-white capitalize">{subjectName}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'} available</p>
          </div>
        </div>
      </motion.div>

      {/* Quiz Cards Grid */}
      {quizzes.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No quizzes available for this subject yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz, i) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="group relative bg-[#13131f] rounded-2xl border border-white/[0.07] hover:border-violet-500/40 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
              onClick={() => navigate(`/quiz/${encodeURIComponent(subject)}/${encodeURIComponent(quiz.name)}/play`)}
            >
              {/* Thumbnail */}
              <div className="relative w-full h-36 bg-gradient-to-br from-violet-900/40 via-purple-900/30 to-[#0d0d1a] overflow-hidden flex-shrink-0">
                {quiz.thumbnailUrl ? (
                  <img
                    src={quiz.thumbnailUrl}
                    alt={quiz.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Brain size={40} className="text-violet-500/30" />
                  </div>
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#13131f] via-transparent to-transparent" />

                {/* Attempted badge */}
                {quiz.myBestScore > 0 && (
                  <div className="absolute top-2.5 right-2.5">
                    <ScoreRing score={Math.round(quiz.myBestScore)} />
                  </div>
                )}

                {/* AI badge */}
                {quiz.youtubeUrl && (
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-violet-300 text-[10px] font-bold px-2 py-1 rounded-full border border-violet-500/30">
                    <Zap size={9} /> AI
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="flex flex-col flex-1 p-3.5 gap-2">
                <div>
                  <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
                    {quiz.name}
                  </h3>
                  {quiz.difficulty && (
                    <div className="mt-1.5">
                      <DifficultyBadge d={quiz.difficulty} />
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap mt-auto">
                  <span className="flex items-center gap-1">
                    <Target size={10} /> {quiz.questionCount || 0} Qs
                  </span>
                  {quiz.duration > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {quiz.duration}m
                    </span>
                  )}
                  {quiz.attempts > 0 && (
                    <span className="flex items-center gap-1">
                      <Users size={10} /> {quiz.attempts}
                    </span>
                  )}
                  {quiz.avgScore > 0 && (
                    <span className="flex items-center gap-1">
                      <BarChart2 size={10} /> {Math.round(quiz.avgScore)}% avg
                    </span>
                  )}
                </div>

                {quiz.myBestScore > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <Zap size={10} />
                    Best: {Math.round(quiz.myBestScore)}% · {quiz.myAttempts || 1} attempt{quiz.myAttempts > 1 ? 's' : ''}
                  </div>
                )}

                {/* Play Button */}
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/quiz/${encodeURIComponent(subject)}/${encodeURIComponent(quiz.name)}/play`) }}
                  className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-bold transition-all shadow-lg shadow-violet-500/20"
                >
                  <Play size={14} className="fill-current" />
                  {quiz.myBestScore > 0 ? 'Retry Quiz' : 'Start Quiz'}
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Bottom score bar if attempted */}
              {quiz.myBestScore > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(quiz.myBestScore, 100)}%` }}
                  transition={{ delay: i * 0.06 + 0.4, duration: 0.7, ease: 'easeOut' }}
                  className={`absolute bottom-0 left-0 h-0.5 ${quiz.myBestScore >= 60 ? 'bg-emerald-500' : quiz.myBestScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}