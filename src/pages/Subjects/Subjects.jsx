import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen, AlertCircle, GraduationCap,
  Layers, Sparkles, ArrowRight, CheckCircle
} from 'lucide-react'
import api from '../../api/axios'

/* ═══ SHIMMER ═══ */
function Shimmer({ className = '' }) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{ background: 'rgba(255,255,255,0.05)', animation: 'shimmerPulse 1.8s ease-in-out infinite' }}
    />
  )
}

function ShimmerCard() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <Shimmer className="w-full aspect-[16/9]" style={{ borderRadius: 0 }} />
      <div className="p-3 space-y-2">
        <Shimmer className="h-4 w-4/5 rounded" />
        <Shimmer className="h-3 w-3/5 rounded" />
      </div>
    </div>
  )
}

/* ═══ SUBJECT CARD ═══ */
function SubjectCard({ subject, courseId, index, subjectProgress }) {
  const accent = subject.color || '#6366f1'
  const progress = subjectProgress?.[subject.id] || { completed: 0, total: 0 }
  const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/courses/${courseId}/subjects/${subject.id}`}
        className="group flex flex-col overflow-hidden rounded-2xl h-full transition-all duration-300 hover:scale-[1.02]"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Thumbnail — 16:9 */}
        <div className="relative w-full aspect-[16/9] overflow-hidden flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${accent}12, ${accent}06)` }}>
          {subject.thumbnailUrl ? (
            <img
              src={subject.thumbnailUrl}
              alt={subject.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600 ease-out"
              loading="lazy"
            />
          ) : subject.icon && subject.icon.length <= 2 ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">{subject.icon}</span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <GraduationCap size={36} style={{ color: accent, opacity: 0.3 }} />
            </div>
          )}

          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-10"
            style={{ background: 'linear-gradient(to top, #0a0a1a, transparent)' }} />

          {/* Hover arrow */}
          <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <ArrowRight size={12} className="text-white" />
          </div>

          {/* Left accent bar */}
          <div
            className="absolute left-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
            style={{ background: `linear-gradient(to bottom, ${accent}, ${accent}44)` }}
          />

          {/* Progress Circle Overlay */}
          {progress.total > 0 && (
            <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-dark-900/80 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <svg className="w-7 h-7 -rotate-90" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
                <circle
                  cx="10" cy="10" r="8"
                  stroke="#10b981"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 8}`}
                  strokeDashoffset={`${2 * Math.PI * 8 * (1 - progressPct / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute text-[8px] font-bold text-white">{progressPct}%</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white/80 group-hover:text-white line-clamp-1 transition-colors duration-200">
              {subject.name}
            </h3>
            {subject.description && (
              <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {subject.description}
              </p>
            )}
          </div>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
            style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}
          >
            <ArrowRight size={12} style={{ color: accent }} />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ═══ EMPTY STATE ═══ */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <BookOpen size={28} className="text-white/20" />
      </div>
      <h3 className="text-base font-black text-white mb-1">No Subjects Yet</h3>
      <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
        This course is being prepared. Check back soon.
      </p>
    </motion.div>
  )
}

/* ═══ ERROR STATE ═══ */
function ErrorState({ onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
        <AlertCircle size={28} style={{ color: 'rgba(248,113,113,0.7)' }} />
      </div>
      <h3 className="text-base font-black text-white mb-1">Failed to Load</h3>
      <p className="text-xs mb-6 max-w-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
        Something went wrong. Please try again.
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition-all active:scale-95"
        style={{ background: 'rgba(99,102,241,0.85)' }}
      >
        <Sparkles size={13} /> Try Again
      </button>
    </motion.div>
  )
}

/* ═══ MAIN ═══ */
export default function Subjects() {
  const { courseId } = useParams()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['course-subjects', courseId],
    queryFn: () => api.get(`/courses/${courseId}/subjects`).then(r => r.data),
    enabled: !!courseId,
    staleTime: 0,
    gcTime: 60000,
    retry: 2,
  })

  const { data: progressData } = useQuery({
    queryKey: ['course-progress', courseId],
    queryFn: () => api.get(`/user/progress?courseId=${courseId}`).then(r => r.data),
    enabled: !!courseId,
    staleTime: 0,
    gcTime: 60000,
  })

  const subjects = data?.subjects || []
  const subjectProgress = progressData?.subjectProgress || {}

  return (
    <div className="max-w-2xl pb-12">

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between mb-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Layers size={17} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-none">Subjects</h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Choose a subject to start
            </p>
          </div>
        </div>

        {!isLoading && subjects.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <BookOpen size={11} style={{ color: 'rgba(129,140,248,0.8)' }} />
            <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {subjects.length} subjects
            </span>
          </div>
        )}
      </motion.div>

      {/* ── LOADING ── */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => <ShimmerCard key={i} />)}
        </div>
      )}

      {/* ── ERROR ── */}
      {isError && <ErrorState onRetry={refetch} />}

      {/* ── EMPTY ── */}
      {!isLoading && !isError && subjects.length === 0 && <EmptyState />}

      {/* ── GRID ── */}
      {!isLoading && !isError && subjects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {subjects.map((subject, i) => (
            <SubjectCard key={subject.id} subject={subject} courseId={courseId} index={i} subjectProgress={subjectProgress} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes shimmerPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
