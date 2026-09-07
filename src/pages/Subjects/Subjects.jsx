import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen, AlertCircle, GraduationCap,
  Layers, Sparkles, ArrowRight, CheckCircle
} from 'lucide-react'
import api from '../../api/axios'
import { useCoursesProgress } from '../../hooks/useCoursesProgress'
import CardThumbnail from '../../components/CardThumbnail'

/* ═══ SHIMMER ═══ */
function Shimmer({ className = '' }) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{ background: 'rgba(0,0,0,0.06)', animation: 'shimmerPulse 1.8s ease-in-out infinite' }}
    />
  )
}

function ShimmerRow() {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-2xl" style={{ background: '#F0F1F6', border: '1px solid rgba(0,0,0,0.06)' }}>
      <Shimmer className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-3/5 rounded" />
        <Shimmer className="h-3 w-2/5 rounded" />
      </div>
    </div>
  )
}

/* ═══ SUBJECT ROW (list-strip style, not a poster tile) ═══ */
function SubjectCard({ subject, courseId, index, subjectProgress }) {
  const accent = subject.color || '#6366f1'
  const progress = subjectProgress?.[subject.id] || { completed: 0, total: 0 }
  const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/courses/${courseId}/subjects/${subject.id}`}
        className="group relative flex items-center gap-3 overflow-hidden rounded-2xl p-2.5 transition-all duration-300 active:scale-[0.98]"
        style={{ background: '#F7F8FC', border: '1px solid rgba(0,0,0,0.06)' }}
      >
        {/* Small square thumbnail — not a full-bleed poster */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
          <CardThumbnail
            item={subject}
            alt={subject.name}
            fallback={
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${accent}12, ${accent}06)` }}>
                {subject.icon && subject.icon.length <= 2 ? (
                  <span className="text-2xl">{subject.icon}</span>
                ) : (
                  <GraduationCap size={22} style={{ color: accent, opacity: 0.4 }} />
                )}
              </div>
            }
          />
          {progress.total > 0 && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-black/10">
              <div className="h-full transition-all duration-500" style={{ width: `${progressPct}%`, background: '#10b981' }} />
            </div>
          )}
        </div>

        {/* Text content — takes remaining width */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{subject.name}</h3>
          {subject.description && (
            <p className="text-xs mt-0.5 line-clamp-1 text-gray-500">{subject.description}</p>
          )}
          {progress.total > 0 && (
            <p className="text-[10px] mt-1 font-semibold" style={{ color: accent }}>
              {progress.completed}/{progress.total} completed · {progressPct}%
            </p>
          )}
        </div>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
        >
          <ArrowRight size={14} style={{ color: accent }} />
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
        style={{ background: '#F0F1F6', border: '1px solid rgba(0,0,0,0.06)' }}>
        <BookOpen size={28} className="text-gray-400" />
      </div>
      <h3 className="text-base font-black text-gray-900 mb-1">No Subjects Yet</h3>
      <p className="text-xs max-w-xs leading-relaxed text-gray-500">
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
      <h3 className="text-base font-black text-gray-900 mb-1">Failed to Load</h3>
      <p className="text-xs mb-6 max-w-xs leading-relaxed text-gray-500">
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
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
  })

  const { subjectProgress } = useCoursesProgress(courseId)

  const subjects = data?.subjects || []

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
            <h1 className="text-lg font-black text-gray-900 leading-none">Subjects</h1>
            <p className="text-[11px] mt-0.5 text-gray-500">
              Choose a subject to start
            </p>
          </div>
        </div>

        {!isLoading && subjects.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
            style={{ background: '#F0F1F6', border: '1px solid rgba(0,0,0,0.06)' }}>
            <BookOpen size={11} style={{ color: 'rgba(99,102,241,0.9)' }} />
            <span className="text-[11px] font-bold text-gray-700">
              {subjects.length} subjects
            </span>
          </div>
        )}
      </motion.div>

      {/* ── LOADING ── */}
      {isLoading && (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => <ShimmerRow key={i} />)}
        </div>
      )}

      {/* ── ERROR ── */}
      {isError && <ErrorState onRetry={refetch} />}

      {/* ── EMPTY ── */}
      {!isLoading && !isError && subjects.length === 0 && <EmptyState />}

      {/* ── LIST (strip rows, one per line — not a poster grid) ── */}
      {!isLoading && !isError && subjects.length > 0 && (
        <div className="flex flex-col gap-2.5">
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
