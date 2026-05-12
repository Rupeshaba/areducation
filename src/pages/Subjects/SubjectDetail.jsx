import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, memo } from 'react'
import {
  AlertCircle, BookOpen, Play, FileText, Video,
  Clock, ChevronRight, ClipboardList, GraduationCap, Trophy, Zap
} from 'lucide-react'
import api from '../../api/axios'

// ── helpers ────────────────────────────────────────────────────────────────

function ytId(url) {
  return url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null
}

function isYT(url) { return !!ytId(url) }

function fmtDuration(sec) {
  if (!sec) return ''
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

// Determine type: pdf | hls | youtube | video
function ctype(c) {
  const t = (c.type || '').toLowerCase().trim()
  if (t === 'pdf') return 'pdf'
  if (t === 'hls' || c.url?.includes('.m3u8')) return 'hls'
  if (isYT(c.url)) return 'youtube'
  return 'video'
}

// ── type config ────────────────────────────────────────────────────────────
const TYPE_CFG = {
  youtube: {
    label: 'Video', Icon: Play,
    grad: 'from-red-700/40 to-red-950/60',
    badge: 'bg-red-500/20 text-red-300 border-red-400/20',
    iconColor: '#f87171',
  },
  video: {
    label: 'Video', Icon: Play,
    grad: 'from-indigo-700/40 to-indigo-950/60',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/20',
    iconColor: '#818cf8',
  },
  hls: {
    label: 'Video', Icon: Video,
    grad: 'from-cyan-700/40 to-cyan-950/60',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/20',
    iconColor: '#22d3ee',
  },
  pdf: {
    label: 'PDF', Icon: FileText,
    grad: 'from-amber-600/40 to-amber-950/60',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-400/20',
    iconColor: '#fbbf24',
  },
}

// ── ContentCard (memoised) ─────────────────────────────────────────────────
const ContentCard = memo(function ContentCard({ content, courseId, subjectId, chapterId }) {
  const [imgFailed, setImgFailed] = useState(false)
  const [ytFailed, setYtFailed]   = useState(false)

  const type = ctype(content)
  const cfg  = TYPE_CFG[type]
  const { Icon } = cfg
  const isVideo = type !== 'pdf'

  const linkTo = chapterId
    ? `/courses/${courseId}/subjects/${subjectId}/chapters/${chapterId}/content/${content.id}?chapterId=${chapterId}`
    : `/courses/${courseId}/subjects/${subjectId}/content/${content.id}`

  const vid = type === 'youtube' ? ytId(content.url) : null

  // Decide what to show in thumbnail area
  const showUploadedThumb = content.thumbnailUrl && !imgFailed
  const showYTThumb = !showUploadedThumb && vid && !ytFailed
  const showFallback = !showUploadedThumb && !showYTThumb

  return (
    <Link to={linkTo} className="group block focus:outline-none">
      <div className="rounded-2xl overflow-hidden border border-white/[0.07] hover:border-primary-500/40 hover:shadow-xl hover:shadow-primary-900/20 transition-all duration-200 bg-[#13131f]">

        {/* ── thumbnail ── */}
        <div className="relative h-[108px] overflow-hidden">
          {showUploadedThumb && (
            <img
              src={content.thumbnailUrl}
              alt={content.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
              onError={() => setImgFailed(true)}
            />
          )}

          {showYTThumb && (
            <img
              src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
              alt={content.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
              onError={() => setYtFailed(true)}
            />
          )}

          {showFallback && (
            <div className={`w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br ${cfg.grad}`}>
              <Icon size={30} style={{ color: cfg.iconColor }} strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-60"
                    style={{ color: cfg.iconColor }}>
                {cfg.label}
              </span>
            </div>
          )}

          {/* scrim for videos with thumbnail so play button pops */}
          {isVideo && !showFallback && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-white/0 group-hover:bg-white/20 border border-transparent group-hover:border-white/30 flex items-center justify-center transition-all duration-200 scale-50 group-hover:scale-100 opacity-0 group-hover:opacity-100">
                <Play size={14} className="text-white ml-0.5" />
              </div>
            </div>
          )}

          {/* type badge */}
          <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border backdrop-blur-md ${cfg.badge}`}>
            <Icon size={8} />
            {cfg.label}
          </div>
        </div>

        {/* ── info ── */}
        <div className="px-3 py-2.5">
          <p className="text-[12.5px] font-medium text-gray-100 group-hover:text-primary-300 transition-colors line-clamp-2 leading-snug">
            {content.title}
          </p>
          {content.duration > 0 && (
            <p className="flex items-center gap-1 mt-1 text-[11px] text-gray-600">
              <Clock size={9} />{fmtDuration(content.duration)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
})

// ── tab config ─────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',   label: 'All',    Icon: GraduationCap, active: 'bg-primary-500 shadow-primary-500/30' },
  { key: 'video', label: 'Videos', Icon: Play,           active: 'bg-blue-500 shadow-blue-500/30' },
  { key: 'pdf',   label: 'PDFs',   Icon: FileText,       active: 'bg-amber-500 shadow-amber-500/30' },
]

function isVideoType(c) { const t = ctype(c); return t === 'video' || t === 'youtube' || t === 'hls' }
function isPdfType(c)   { return ctype(c) === 'pdf' }

function filterList(list, tab) {
  if (tab === 'all')   return list
  if (tab === 'video') return list.filter(isVideoType)
  if (tab === 'pdf')   return list.filter(isPdfType)
  return list
}

function typeCounts(list) {
  return {
    all:   list.length,
    video: list.filter(isVideoType).length,
    pdf:   list.filter(isPdfType).length,
  }
}

// ── Grid ───────────────────────────────────────────────────────────────────
function ContentGrid({ contents, tab, courseId, subjectId, chapterId }) {
  const filtered = filterList(contents, tab)
  if (!filtered.length) return (
    <p className="py-8 text-center text-sm text-gray-600">
      No {tab === 'all' ? 'content' : tab + 's'} here yet.
    </p>
  )
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {filtered.map(c => (
        <ContentCard
          key={c.id}
          content={c}
          courseId={courseId}
          subjectId={subjectId}
          chapterId={chapterId}
        />
      ))}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function SubjectDetail() {
  const { courseId, subjectId } = useParams()
  const [tab, setTab] = useState('all')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['subject-detail', subjectId],
    queryFn: () => api.get(`/subjects/${subjectId}`).then(r => r.data),
    enabled: !!subjectId,
    staleTime: 0,
    gcTime: 60000,
    retry: 2,
  })

  const subject  = data?.subject ?? null
  const chapters = subject?.chapters ?? []
  const flat     = subject?.contents ?? []
  const hasChapters = chapters.length > 0

  const allContents = hasChapters ? chapters.flatMap(ch => ch.contents ?? []) : flat
  const counts = typeCounts(allContents)

  // Only show tabs that have content
  const visibleTabs = TABS.filter(t => t.key === 'all' || counts[t.key] > 0)

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError) return (
    <div className="flex flex-col items-center py-20 gap-3 text-center">
      <AlertCircle size={36} className="text-red-400" />
      <p className="text-gray-400">Could not load subject.</p>
      <button onClick={() => refetch()} className="btn-primary text-sm">Retry</button>
    </div>
  )

  if (!subject) return (
    <div className="flex flex-col items-center py-20 gap-3 text-center">
      <BookOpen size={36} className="text-gray-600" />
      <p className="text-gray-400">Subject not found.</p>
    </div>
  )

  return (
    <div className="max-w-6xl">

      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          {subject.thumbnailUrl ? (
            <img src={subject.thumbnailUrl} alt={subject.name}
                 className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-primary-500/15 border border-primary-500/20
                            flex items-center justify-center flex-shrink-0 text-xl">
              {subject.icon || '📚'}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">{subject.name}</h1>
            {subject.description && (
              <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{subject.description}</p>
            )}
          </div>
        </div>
        <Link to={`/courses/${courseId}/subjects`}
              className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1 shrink-0 self-start">
          <ChevronRight size={14} /> Back to Subjects
        </Link>
      </div>

      {/* ── tab bar + quiz button ── */}
      {allContents.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          {/* tabs */}
          <div className="flex items-center gap-0.5 p-1 bg-[#0e0e1a] rounded-xl border border-white/[0.06]">
            {visibleTabs.map(t => {
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium
                              transition-all duration-150 shadow-md
                              ${active ? `${t.active} text-white` : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <t.Icon size={12} />
                  {t.label}
                  <span className={`text-[11px] px-1.5 py-px rounded-full min-w-[20px] text-center font-semibold
                                   ${active ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-600'}`}>
                    {counts[t.key]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* quiz button */}
          <Link
            to={`/quiz/${encodeURIComponent(subjectId)}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white
                       bg-gradient-to-r from-violet-600 to-purple-600
                       hover:from-violet-500 hover:to-purple-500
                       shadow-lg shadow-violet-500/20 active:scale-95 transition-all duration-200"
          >
            <Trophy size={13} />
            Take Quiz
            <Zap size={11} className="opacity-70" />
          </Link>
        </div>
      )}

      {/* ── content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {hasChapters ? (
            <div className="space-y-8">
              {chapters.map((ch, idx) => {
                const chFiltered = filterList(ch.contents ?? [], tab)
                if (!chFiltered.length && tab !== 'all') return null
                return (
                  <motion.div
                    key={ch.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    {/* chapter header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-7 h-7 bg-primary-500/15 border border-primary-500/20 rounded-lg
                                      flex items-center justify-center text-primary-400 text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <h2 className="text-sm font-bold text-white">{ch.name}</h2>
                      <div className="flex-1 h-px bg-white/[0.05]" />
                      <span className="text-[11px] text-gray-600 shrink-0">{chFiltered.length} items</span>
                    </div>

                    {ch.description && (
                      <p className="text-gray-500 text-xs mb-4 ml-10">{ch.description}</p>
                    )}

                    <ContentGrid
                      contents={ch.contents ?? []}
                      tab={tab}
                      courseId={courseId}
                      subjectId={subjectId}
                      chapterId={ch.id}
                    />
                  </motion.div>
                )
              })}
            </div>
          ) : flat.length > 0 ? (
            <ContentGrid
              contents={flat}
              tab={tab}
              courseId={courseId}
              subjectId={subjectId}
              chapterId={null}
            />
          ) : (
            <div className="text-center py-16 text-gray-600">
              <FileText size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No content yet for this subject.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}