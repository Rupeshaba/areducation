import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, memo, useRef } from 'react'
import {
  AlertCircle, BookOpen, Play, FileText, Video,
  Clock, Trophy, Zap
} from 'lucide-react'
import api from '../../api/axios'

/* ═══ HELPERS ═══ */
function ytId(url) {
  return url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null
}
function isYT(url) { return !!ytId(url) }
function fmtDuration(sec) {
  if (!sec) return ''
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
function ctype(c) {
  const t = (c.type || '').toLowerCase().trim()
  if (t === 'pdf') return 'pdf'
  if (t === 'hls' || c.url?.includes('.m3u8')) return 'hls'
  if (isYT(c.url)) return 'youtube'
  return 'video'
}
function isVideoType(c) { const t = ctype(c); return t === 'video' || t === 'youtube' || t === 'hls' }
function isPdfType(c) { return ctype(c) === 'pdf' }

/* ═══ YT THUMBNAIL — quality fallback chain ═══ */
const YT_SIZES = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault']
function YTThumb({ vid, alt, className }) {
  const [idx, setIdx] = useState(0)
  const [allFailed, setAllFailed] = useState(false)
  if (allFailed) return null
  return (
    <img
      src={`https://img.youtube.com/vi/${vid}/${YT_SIZES[idx]}.jpg`}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        if (idx < YT_SIZES.length - 1) setIdx(i => i + 1)
        else setAllFailed(true)
      }}
    />
  )
}

/* ═══ TYPE CONFIG ═══ */
const TYPE_CFG = {
  youtube: { label: 'Video', Icon: Play,     grad: 'rgba(185,28,28,0.35)',  iconColor: '#f87171' },
  video:   { label: 'Video', Icon: Play,     grad: 'rgba(67,56,202,0.35)',  iconColor: '#818cf8' },
  hls:     { label: 'Video', Icon: Video,    grad: 'rgba(14,116,144,0.35)', iconColor: '#22d3ee' },
  pdf:     { label: 'PDF',   Icon: FileText, grad: 'rgba(146,64,14,0.35)',  iconColor: '#fbbf24' },
}

/* ═══ SHIMMER ═══ */
function Shimmer({ className = '' }) {
  return (
    <div className={`rounded-xl ${className}`}
      style={{ background: 'rgba(255,255,255,0.05)', animation: 'shimmerPulse 1.8s ease-in-out infinite' }} />
  )
}
function ShimmerCard() {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <Shimmer className="w-full aspect-[16/9]" style={{ borderRadius: 0 }} />
      <div className="p-2.5 space-y-1.5">
        <Shimmer className="h-3.5 w-4/5 rounded" />
        <Shimmer className="h-3 w-2/5 rounded" />
      </div>
    </div>
  )
}

/* ═══ CONTENT CARD ═══ */
const ContentCard = memo(function ContentCard({ content, courseId, subjectId, chapterId, index }) {
  const [imgFailed, setImgFailed] = useState(false)

  const type = ctype(content)
  const cfg  = TYPE_CFG[type]
  const { Icon } = cfg
  const isVideo = type !== 'pdf'

  const linkTo = chapterId
    ? `/courses/${courseId}/subjects/${subjectId}/chapters/${chapterId}/content/${content.id}?chapterId=${chapterId}`
    : `/courses/${courseId}/subjects/${subjectId}/content/${content.id}`

  const vid = type === 'youtube' ? ytId(content.url) : null
  const showUploadedThumb = content.thumbnailUrl && !imgFailed
  const showYTThumb       = !showUploadedThumb && !!vid
  const showFallback      = !showUploadedThumb && !showYTThumb

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={linkTo} className="group block focus:outline-none">
        <div className="rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.97]"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* ── Thumbnail ── */}
          <div className="relative aspect-[16/9] overflow-hidden">
            {showUploadedThumb && (
              <img
                src={content.thumbnailUrl}
                alt={content.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={() => setImgFailed(true)}
              />
            )}
            {showYTThumb && (
              <YTThumb
                vid={vid}
                alt={content.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            )}
            {showFallback && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5"
                style={{ background: `radial-gradient(ellipse at center, ${cfg.grad}, rgba(10,10,26,0.97))` }}>
                <Icon size={24} style={{ color: cfg.iconColor }} strokeWidth={1.5} />
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-50"
                  style={{ color: cfg.iconColor }}>{cfg.label}</span>
              </div>
            )}

            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
              style={{ background: 'linear-gradient(to top, #0a0a1a, transparent)' }} />

            {/* Play overlay */}
            {isVideo && !showFallback && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.85)', backdropFilter: 'blur(4px)' }}>
                  <Play size={12} fill="white" color="white" />
                </div>
              </div>
            )}

            {/* Type badge */}
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md"
              style={{
                background: type === 'pdf' ? 'rgba(120,53,15,0.8)' : 'rgba(49,46,129,0.8)',
                backdropFilter: 'blur(6px)',
                border: `1px solid ${cfg.iconColor}25`,
              }}>
              <Icon size={8} style={{ color: cfg.iconColor }} />
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: cfg.iconColor }}>
                {cfg.label}
              </span>
            </div>
          </div>

          {/* ── Info ── */}
          <div className="px-2.5 py-2">
            <p className="text-[11.5px] font-semibold line-clamp-2 leading-snug"
              style={{ color: 'rgba(255,255,255,0.75)' }}>
              {content.title}
            </p>
            {content.duration > 0 && (
              <p className="flex items-center gap-1 mt-1" style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px' }}>
                <Clock size={9} />{fmtDuration(content.duration)}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
})

/* ═══ CONTENT GRID ═══ */
function ContentGrid({ contents, tab, courseId, subjectId }) {
  const filtered = tab === 'video' ? contents.filter(isVideoType) : contents.filter(isPdfType)

  if (!filtered.length) return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {tab === 'video'
          ? <Play size={20} className="text-white/20" />
          : <FileText size={20} className="text-white/20" />}
      </div>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
        No {tab === 'video' ? 'videos' : 'PDFs'} here yet.
      </p>
    </div>
  )

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {filtered.map((c, i) => (
        <ContentCard
          key={c.id}
          content={c}
          courseId={courseId}
          subjectId={subjectId}
          chapterId={c._chapterId ?? null}
          index={i}
        />
      ))}
    </div>
  )
}

/* ═══ SWIPE HOOK ═══ */
function useSwipeTabs(tab, setTab, order) {
  const startX = useRef(null)
  function onTouchStart(e) { startX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (startX.current === null) return
    const dx = startX.current - e.changedTouches[0].clientX
    if (Math.abs(dx) < 48) return
    const cur = order.indexOf(tab)
    if (dx > 0 && cur < order.length - 1) setTab(order[cur + 1])
    if (dx < 0 && cur > 0) setTab(order[cur - 1])
    startX.current = null
  }
  return { onTouchStart, onTouchEnd }
}

/* ═══ MAIN ═══ */
export default function SubjectDetail() {
  const { courseId, subjectId } = useParams()
  const [tab, setTab] = useState('video')

  const swipe = useSwipeTabs(tab, setTab, ['video', 'pdf'])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['subject-detail', subjectId],
    queryFn: () => api.get(`/subjects/${subjectId}`).then(r => r.data),
    enabled: !!subjectId,
    staleTime: 0,
    gcTime: 60000,
    retry: 2,
  })

  const subject     = data?.subject ?? null
  const chapters    = subject?.chapters ?? []
  const flat        = subject?.contents ?? []
  const hasChapters = chapters.length > 0

  const allContents = hasChapters
    ? chapters.flatMap(ch => (ch.contents ?? []).map(c => ({ ...c, _chapterId: ch.id })))
    : flat

  const videosCount = allContents.filter(isVideoType).length
  const pdfsCount   = allContents.filter(isPdfType).length

  const TABS = [
    { key: 'video', label: 'Videos', Icon: Play,     count: videosCount, accent: '#818cf8', accentBg: 'rgba(99,102,241,0.15)',  accentBorder: 'rgba(99,102,241,0.28)' },
    { key: 'pdf',   label: 'PDFs',   Icon: FileText,  count: pdfsCount,   accent: '#fbbf24', accentBg: 'rgba(234,179,8,0.15)',   accentBorder: 'rgba(234,179,8,0.28)'  },
  ]

  /* ── Loading ── */
  if (isLoading) return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 flex-1">
          <Shimmer className="w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Shimmer className="h-5 w-36 rounded" />
            <Shimmer className="h-3 w-24 rounded" />
          </div>
        </div>
        <Shimmer className="h-8 w-20 rounded-xl flex-shrink-0" />
      </div>
      <div className="flex gap-2 mb-4">
        <Shimmer className="h-9 w-28 rounded-xl" />
        <Shimmer className="h-9 w-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => <ShimmerCard key={i} />)}
      </div>
      <style>{`@keyframes shimmerPulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
    </div>
  )

  /* ── Error ── */
  if (isError) return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
        <AlertCircle size={24} style={{ color: 'rgba(248,113,113,0.7)' }} />
      </div>
      <h3 className="text-sm font-black text-white mb-1">Failed to Load</h3>
      <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.38)' }}>Something went wrong. Please try again.</p>
      <button onClick={() => refetch()}
        className="px-4 py-2 rounded-xl text-white text-xs font-bold active:scale-95"
        style={{ background: 'rgba(99,102,241,0.85)' }}>
        Retry
      </button>
    </div>
  )

  /* ── Not found ── */
  if (!subject) return (
    <div className="flex flex-col items-center py-20 text-center">
      <BookOpen size={28} className="text-white/20 mb-3" />
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Subject not found.</p>
    </div>
  )

  return (
    <div className="max-w-2xl">

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between gap-3 mb-5"
      >
        {/* Subject info */}
        <div className="flex items-center gap-3 min-w-0">
          {subject.thumbnailUrl ? (
            <img src={subject.thumbnailUrl} alt={subject.name}
              className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
              {subject.icon || '📚'}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-black text-white leading-tight line-clamp-1">{subject.name}</h1>
            {subject.description && (
              <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {subject.description}
              </p>
            )}
          </div>
        </div>

        {/* Quiz button */}
        <Link
          to={`/quiz/${encodeURIComponent(subjectId)}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all duration-200 active:scale-95 flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.85), rgba(109,40,217,0.85))',
            border: '1px solid rgba(167,139,250,0.25)',
            boxShadow: '0 4px 16px rgba(124,58,237,0.2)',
          }}
        >
          <Trophy size={12} />
          Quiz
          <Zap size={10} style={{ opacity: 0.7 }} />
        </Link>
      </motion.div>

      {/* ── TABS ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4 }}
        className="flex items-center gap-1.5 p-1 rounded-xl mb-4 w-fit"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95"
              style={{
                background: active ? t.accentBg : 'transparent',
                border: active ? `1px solid ${t.accentBorder}` : '1px solid transparent',
                color: active ? t.accent : 'rgba(255,255,255,0.35)',
              }}
            >
              <t.Icon size={11} />
              {t.label}
              <span
                className="text-[10px] font-bold px-1.5 py-px rounded-full min-w-[18px] text-center"
                style={{
                  background: active ? t.accentBorder : 'rgba(255,255,255,0.06)',
                  color: active ? t.accent : 'rgba(255,255,255,0.3)',
                }}
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </motion.div>

      {/* ── CONTENT (swipeable) ── */}
      <div {...swipe} style={{ touchAction: 'pan-y' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: tab === 'pdf' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === 'pdf' ? -20 : 20 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <ContentGrid
              contents={allContents}
              tab={tab}
              courseId={courseId}
              subjectId={subjectId}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes shimmerPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
