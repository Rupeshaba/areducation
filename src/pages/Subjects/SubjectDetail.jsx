import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, memo, useRef, useEffect, useMemo, forwardRef } from 'react'
import {
  AlertCircle, BookOpen, Play, FileText, Video,
  Clock, Trophy, Zap, CheckCircle
} from 'lucide-react'
import api from '../../api/axios'
import {
  getCompletedIdsSet, markContentCompleted, unmarkContentCompleted, isContentCompleted, mergeCompletedIds,
  setLastPlayed, getLastPlayed,
} from '../../utils/progress'
import CardThumbnail from '../../components/CardThumbnail'

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

/* Thumbnails now come from the shared CardThumbnail component (utils/thumbnail.js),
   which prefers hqdefault.jpg — reliable for virtually every YouTube video, unlike
   maxresdefault/sddefault which silently 200-OK with a grey placeholder for videos
   that don't have that resolution (why thumbnails looked "missing" before). */

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
const ContentCard = forwardRef(function ContentCard(
  { content, courseId, subjectId, chapterId, index, completedContentIds, onMarkCompleted, isHighlighted },
  ref
) {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 })
  const [forceUpdate, setForceUpdate] = useState(0)

  // Listen for completion changes to force re-render
  useEffect(() => {
    const handleCompletionChange = () => setForceUpdate(prev => prev + 1)
    window.addEventListener('ar-completion-changed', handleCompletionChange)
    return () => window.removeEventListener('ar-completion-changed', handleCompletionChange)
  }, [])

  const type = ctype(content)
  const cfg  = TYPE_CFG[type]
  const { Icon } = cfg
  const isVideo = type !== 'pdf'

  const linkTo = chapterId
    ? `/courses/${courseId}/subjects/${subjectId}/chapters/${chapterId}/content/${content.id}?chapterId=${chapterId}`
    : `/courses/${courseId}/subjects/${subjectId}/content/${content.id}`

  // Check if content is completed — single source of truth, local only
  const isCompleted = isContentCompleted(content.id)

  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setContextPos({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }

  const longPressTimer = useRef(null)

  const handleLongPress = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setContextPos({ x: rect.left + 10, y: rect.top + 10 })
    setShowContextMenu(true)
  }

  const handleTouchStart = (e) => {
    longPressTimer.current = setTimeout(() => handleLongPress(e), 600)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleMarkCompleted = () => {
    if (isCompleted) {
      unmarkContentCompleted(content.id, { subjectId, courseId })
    } else {
      markContentCompleted(content.id, { subjectId, courseId })
    }
    onMarkCompleted?.(content.id)
    setShowContextMenu(false)
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-2xl transition-shadow duration-500 ${isHighlighted ? 'ring-2 ring-offset-2 ring-offset-transparent' : ''}`}
      style={isHighlighted ? { boxShadow: '0 0 0 2px rgba(99,102,241,0.9), 0 0 22px rgba(99,102,241,0.45)' } : undefined}
    >
      <div
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all z-10"
        style={{
          background: isCompleted ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
        onClick={(e) => {
          e.stopPropagation()
          handleMarkCompleted()
        }}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        <CheckCircle size={12} className={isCompleted ? 'text-white' : 'text-white/40'} />
      </div>

      <Link
        to={linkTo}
        className="group block focus:outline-none"
        onClick={() => setLastPlayed(content.id, { subjectId, courseId })}
      >
        <div className="relative rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.97] aspect-[3/4]"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Thumbnail fills the entire card */}
          <CardThumbnail
            item={content}
            alt={content.title}
            className="group-hover:scale-105 transition-transform duration-500"
            fallback={
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
                style={{ background: `radial-gradient(ellipse at center, ${cfg.grad}, rgba(10,10,26,0.97))` }}>
                <Icon size={24} style={{ color: cfg.iconColor }} strokeWidth={1.5} />
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-50"
                  style={{ color: cfg.iconColor }}>{cfg.label}</span>
              </div>
            }
          />

          {/* Gradient so the text stays readable over the image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Play overlay */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.85)', backdropFilter: 'blur(4px)' }}>
                <Play size={12} fill="white" color="white" />
              </div>
            </div>
          )}

          {/* Type badge */}
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md z-10"
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

          {/* Title + duration — pinned to the bottom, over the image */}
          <div className="absolute inset-x-0 bottom-0 px-2.5 py-2 z-10">
            <p className="text-[11.5px] font-semibold line-clamp-2 leading-snug text-white drop-shadow-md">
              {content.title}
            </p>
            {content.duration > 0 && (
              <p className="flex items-center gap-1 mt-1 text-white/50" style={{ fontSize: '10px' }}>
                <Clock size={9} />{fmtDuration(content.duration)}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed z-50 bg-dark-800 border border-white/20 rounded-lg py-1 px-1 shadow-lg"
          style={{ left: contextPos.x, top: contextPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleMarkCompleted}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-white hover:bg-white/10 rounded"
          >
            <CheckCircle size={12} />
            {isCompleted ? 'Unmark Completed' : 'Mark as Completed'}
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {showContextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowContextMenu(false)}
        />
      )}
    </motion.div>
  )
})

/* ═══ CONTENT GRID ═══ */
function ContentGrid({ contents, tab, courseId, subjectId, completedContentIds, cardRefs, highlightId }) {
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
          ref={(el) => {
            if (!cardRefs) return
            if (el) cardRefs.current.set(c.id, el)
            else cardRefs.current.delete(c.id)
          }}
          content={c}
          courseId={courseId}
          subjectId={subjectId}
          chapterId={c._chapterId ?? null}
          index={i}
          completedContentIds={completedContentIds}
          isHighlighted={c.id === highlightId}
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
  const [refreshKey, setRefreshKey] = useState(0)

  // Auto-scroll-to-last-played: a ref per rendered content card (id -> DOM
  // node), plus a one-shot guard so we only scroll once per subject visit
  // (not on every tab switch / re-render), plus a temporary highlight id.
  const cardRefs = useRef(new Map())
  const hasScrolledRef = useRef(false)
  const [highlightId, setHighlightId] = useState(null)

  // Refresh on completion change
  useEffect(() => {
    const handleCompletionChange = () => {
      setRefreshKey(prev => prev + 1)
    }
    window.addEventListener('ar-completion-changed', handleCompletionChange)
    return () => window.removeEventListener('ar-completion-changed', handleCompletionChange)
  }, [])

  // Close context menu on click outside
  useEffect(() => {
    const closeAllMenus = () => {
      document.querySelectorAll('.content-context-menu').forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el)
      })
    }
    document.addEventListener('click', closeAllMenus)
    return () => document.removeEventListener('click', closeAllMenus)
  }, [])

  useEffect(() => {
    hasScrolledRef.current = false
    setHighlightId(null)
    cardRefs.current.clear()
  }, [subjectId])

  const swipe = useSwipeTabs(tab, setTab, ['video', 'pdf'])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['subject-detail', subjectId],
    queryFn: () => api.get(`/subjects/${subjectId}`).then(r => r.data),
    enabled: !!subjectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
  })

  // Pull this subject's completion state from the account (synced from any
  // device) and merge it into the local completed-ids cache, so switching
  // devices doesn't make already-finished content look incomplete here.
  const { data: backendProgressData } = useQuery({
    queryKey: ['subject-progress-backend', subjectId],
    queryFn: () => api.get('/user/progress', { params: { subjectId } }).then(r => r.data),
    enabled: !!subjectId,
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    const ids = backendProgressData?.progress?.completedContentIds
    if (ids?.length) mergeCompletedIds(ids)
  }, [backendProgressData])

  const subject     = data?.subject ?? null
  const chapters    = subject?.chapters ?? []
  const flat        = subject?.contents ?? []
  const hasChapters = chapters.length > 0

  const allContents = hasChapters
    ? chapters.flatMap(ch => (ch.contents ?? []).map(c => ({ ...c, _chapterId: ch.id })))
    : flat

  // Scoped strictly to THIS subject's content ids — a global completed-ids
  // count previously leaked into the header %, showing progress here even
  // when nothing in this particular subject was actually completed.
  const completedContentIds = useMemo(() => {
    const globalCompleted = getCompletedIdsSet()
    return new Set(allContents.filter(c => globalCompleted.has(c.id)).map(c => c.id))
  }, [allContents, refreshKey])

  // Figure out what was last played in this subject, and which tab it
  // lives in — a PDF opened last should flip the "PDF" tab open, not
  // strand the user on "Videos" with nothing to scroll to.
  const lastPlayedId = useMemo(() => getLastPlayed(subjectId), [subjectId, allContents])
  const lastPlayedContent = useMemo(
    () => allContents.find(c => c.id === lastPlayedId) ?? null,
    [allContents, lastPlayedId]
  )

  useEffect(() => {
    if (!lastPlayedContent || hasScrolledRef.current) return
    const targetTab = isPdfType(lastPlayedContent) ? 'pdf' : 'video'
    if (tab !== targetTab) setTab(targetTab)
  }, [lastPlayedContent, tab])

  // Once the matching tab's cards are actually mounted, scroll the
  // last-played card into view and give it a brief highlight ring. The
  // target grid can mount a beat late (AnimatePresence waits for the
  // previous tab's exit animation to finish first), so this retries for
  // ~1s instead of giving up after a single missed frame.
  useEffect(() => {
    if (!lastPlayedContent || hasScrolledRef.current) return
    const targetTab = isPdfType(lastPlayedContent) ? 'pdf' : 'video'
    if (tab !== targetTab) return

    let attempts = 0
    let timeoutId = null
    let cancelled = false

    const tryScroll = () => {
      if (cancelled || hasScrolledRef.current) return
      const el = cardRefs.current.get(lastPlayedContent.id)
      if (el) {
        hasScrolledRef.current = true
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightId(lastPlayedContent.id)
        setTimeout(() => setHighlightId(null), 2200)
        return
      }
      attempts += 1
      if (attempts < 20) timeoutId = setTimeout(tryScroll, 100)
    }

    timeoutId = setTimeout(tryScroll, 50)
    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [lastPlayedContent, tab, allContents])

  const videosCount = allContents.filter(isVideoType).length
  const pdfsCount   = allContents.filter(isPdfType).length
  const completedVideos = allContents.filter(c => isVideoType(c) && completedContentIds.has(c.id)).length
  const completedPdfs   = allContents.filter(c => isPdfType(c) && completedContentIds.has(c.id)).length

  const TABS = [
    { key: 'video', label: 'Videos', Icon: Play,     count: videosCount, completed: completedVideos, accent: '#818cf8', accentBg: 'rgba(99,102,241,0.15)',  accentBorder: 'rgba(99,102,241,0.28)' },
    { key: 'pdf',   label: 'PDFs',   Icon: FileText,  count: pdfsCount,   completed: completedPdfs,   accent: '#fbbf24', accentBg: 'rgba(234,179,8,0.15)',   accentBorder: 'rgba(234,179,8,0.28)'  },
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

        {/* Progress Circle */}
        {allContents.length > 0 && (
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
              <circle
                cx="18" cy="18" r="16"
                stroke="#10b981"
                strokeWidth="2"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - (completedContentIds.size / allContents.length))}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
              {Math.round((completedContentIds.size / allContents.length) * 100)}%
            </div>
          </div>
        )}

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
              completedContentIds={completedContentIds}
              cardRefs={cardRefs}
              highlightId={highlightId}
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
