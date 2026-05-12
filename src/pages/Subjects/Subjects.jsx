import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen, AlertCircle, ChevronRight, GraduationCap,
  Layers, Sparkles, ArrowUpRight, FolderOpen
} from 'lucide-react'
import api from '../../api/axios'

/* ═══ SHIMMER ═══ */
function Shimmer({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-white/[0.03] via-white/[0.08] to-white/[0.03] bg-[length:200%_100%] ${className}`}
      style={{ animation: 'shimmer 1.5s infinite' }} />
  )
}

function ShimmerCard() {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] overflow-hidden">
      <Shimmer className="w-full aspect-[4/3]" />
      <div className="p-4 space-y-3">
        <Shimmer className="h-5 w-4/5 rounded-lg" />
        <Shimmer className="h-3 w-3/5 rounded" />
        <div className="flex items-center justify-between pt-2">
          <Shimmer className="h-3 w-16 rounded" />
          <Shimmer className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/* ═══ SUBJECT CARD — PREMIUM ═══ */
function SubjectCard({ subject, courseId, index }) {
  const accentColor = subject.color || '#6366f1'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/courses/${courseId}/subjects/${subject.id}`}
        className="group relative flex flex-col overflow-hidden rounded-2xl bg-[#0a0a1a] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-500 block h-full"
      >
        {/* Thumbnail Container — 4:3 Aspect Ratio */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#0f0f1e]">
          {subject.thumbnailUrl ? (
            <img
              src={subject.thumbnailUrl}
              alt={subject.name}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              loading="lazy"
            />
          ) : subject.icon && subject.icon.length <= 2 ? (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)` }}
            >
              <span className="text-6xl drop-shadow-lg">{subject.icon}</span>
            </div>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)` }}
            >
              <GraduationCap size={56} style={{ color: accentColor, opacity: 0.4 }} />
            </div>
          )}

          {/* Bottom gradient fade */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0a0a1a] to-transparent" />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Top-right arrow */}
          <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <ArrowUpRight size={16} className="text-white" />
          </div>

          {/* Subject count badge */}
          <div className="absolute bottom-3 left-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/10">
              <FolderOpen size={11} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Subject</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4">
          <h3 className="text-sm font-bold text-white group-hover:text-primary-300 transition-colors duration-300 line-clamp-2 leading-snug mb-1.5">
            {subject.name}
          </h3>
          
          {subject.description ? (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4 flex-1">
              {subject.description}
            </p>
          ) : (
            <div className="flex-1" />
          )}

          {/* Bottom action row */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
            <span className="text-[10px] font-bold text-primary-400 uppercase tracking-[0.15em] opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0">
              Start Learning
            </span>
            <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center group-hover:bg-primary-500 group-hover:border-primary-500 transition-all duration-300">
              <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        {/* Left accent bar on hover */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-l-2xl" />
      </Link>
    </motion.div>
  )
}

/* ═══ EMPTY STATE ═══ */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-24 text-center"
    >
      <div className="relative w-24 h-24 rounded-3xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-6">
        <div className="absolute inset-0 rounded-3xl bg-primary-500/5 animate-pulse" />
        <BookOpen size={40} className="text-gray-600 relative z-10" />
      </div>
      <h3 className="text-xl font-black text-white mb-2">No Subjects Available</h3>
      <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
        This course is currently being prepared. Check back soon for new subjects and content.
      </p>
    </motion.div>
  )
}

/* ═══ ERROR STATE ═══ */
function ErrorState({ onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-24 text-center"
    >
      <div className="w-24 h-24 rounded-3xl bg-red-500/5 border border-red-500/15 flex items-center justify-center mb-6">
        <AlertCircle size={40} className="text-red-400/60" />
      </div>
      <h3 className="text-xl font-black text-white mb-2">Failed to Load Subjects</h3>
      <p className="text-gray-500 text-sm mb-8 max-w-sm leading-relaxed">
        Something went wrong while loading the subjects. Please try again.
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-sm font-bold transition-all active:scale-95 shadow-lg shadow-primary-500/20"
      >
        <Sparkles size={16} /> Try Again
      </button>
    </motion.div>
  )
}

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

  const subjects = data?.subjects || []

  return (
    <div className="max-w-5xl mx-auto pb-12">
      
      {/* ═══ HERO HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-900/30 via-[#0f0f1e] to-[#0a1628] border border-primary-500/15 p-6 sm:p-8 mb-8"
      >
        <div className="absolute top-[-30%] right-[-5%] w-64 h-64 bg-primary-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-30%] left-[-5%] w-48 h-48 bg-violet-600/15 rounded-full blur-[80px]" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/25 flex items-center justify-center shadow-lg shadow-primary-500/10">
              <Layers size={28} className="text-primary-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-1">Subjects</h1>
              <p className="text-gray-400 text-sm">Choose a subject and start learning</p>
            </div>
          </div>
          
          {!isLoading && subjects.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] self-start sm:self-auto">
              <BookOpen size={14} className="text-primary-400" />
              <span className="text-sm font-bold text-gray-300">{subjects.length} Subjects</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══ LOADING — SHIMMER GRID ═══ */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <ShimmerCard key={i} />
          ))}
        </div>
      )}

      {/* ═══ ERROR ═══ */}
      {isError && <ErrorState onRetry={refetch} />}

      {/* ═══ EMPTY ═══ */}
      {!isLoading && !isError && subjects.length === 0 && <EmptyState />}

      {/* ═══ SUBJECTS GRID ═══ */}
      {!isLoading && !isError && subjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((subject, i) => (
            <SubjectCard key={subject.id} subject={subject} courseId={courseId} index={i} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}