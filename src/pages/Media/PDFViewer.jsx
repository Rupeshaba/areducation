import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft, Download, CheckCircle, AlertCircle,
  Loader, X, ExternalLink, RefreshCw
} from 'lucide-react'
import api from '../../api/axios'

// Detect URL type to pick best viewer strategy
function getViewerUrl(url) {
  if (!url) return { type: 'none', src: '' }

  const isGoogleDrive =
    url.includes('drive.google.com') || url.includes('docs.google.com')

  if (isGoogleDrive) {
    // Convert drive share link → direct download id if needed
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
    if (idMatch) {
      return {
        type: 'google',
        src: `https://drive.google.com/file/d/${idMatch[1]}/preview`,
      }
    }
    // Already an embed/preview link
    return {
      type: 'google',
      src: url.includes('preview') ? url : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`,
    }
  }

  // All other URLs — direct iframe (works for CDN, Cloudinary, S3, custom buckets)
  return { type: 'direct', src: url }
}

export default function PDFViewer() {
  const { contentId } = useParams()
  const navigate = useNavigate()

  const fsLocked = useRef(false)
  const containerRef = useRef(null)

  const [iframeLoading, setIframeLoading] = useState(true)
  const [iframeError, setIframeError] = useState(false)
  const [completed, setCompleted] = useState(false)

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['content', contentId],
    queryFn: () => api.get(`/content/${contentId}`).then(r => r.data),
  })

  const saveProg = useMutation({
    mutationFn: (d) => api.post(`/user/content/${contentId}/progress`, d),
    onSuccess: () => setCompleted(true),
  })

  const content = data?.content
  const pdfUrl = content?.url || ''
  const { type: viewerType, src: iframeSrc } = getViewerUrl(pdfUrl)

  // ── Fullscreen helpers ──────────────────────────────────────────────────────
  const enterFS = useCallback(() => {
    const el = document.documentElement
    if (!document.fullscreenElement) {
      ;(el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el).catch(() => {})
    }
  }, [])

  const exitFS = useCallback(() => {
    fsLocked.current = false
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  // Auto-enter fullscreen on mount, exit on unmount
  useEffect(() => {
    fsLocked.current = true

    const timer = setTimeout(() => enterFS(), 300)

    // Re-enter if user accidentally exits (e.g. notification)
    const handleFSChange = () => {
      if (!document.fullscreenElement && fsLocked.current) {
        setTimeout(() => enterFS(), 200)
      }
    }

    document.addEventListener('fullscreenchange', handleFSChange)
    document.addEventListener('webkitfullscreenchange', handleFSChange)

    return () => {
      clearTimeout(timer)
      fsLocked.current = false
      document.removeEventListener('fullscreenchange', handleFSChange)
      document.removeEventListener('webkitfullscreenchange', handleFSChange)
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [enterFS])

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleBack = () => {
    exitFS()
    navigate(-1)
  }

  const handleComplete = () => {
    if (completed || saveProg.isPending) return
    saveProg.mutate(
      { completed: true, subjectId: content?.subjectId },
      {
        onSuccess: () => {
          // Brief delay so user sees the tick, then go back
          setTimeout(() => {
            exitFS()
            navigate(-1)
          }, 800)
        },
      }
    )
  }

  const handleRetry = () => {
    setIframeError(false)
    setIframeLoading(true)
  }

  // ── Loading / error states ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0a0f1e] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
        <p className="text-gray-400 text-sm">Loading PDF…</p>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0a0f1e] flex flex-col items-center justify-center gap-3">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-gray-400 text-sm">Content not found.</p>
        <button onClick={handleBack} className="text-sm text-primary-400 hover:underline">
          Go back
        </button>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-[#0a0f1e] flex flex-col"
      style={{ touchAction: 'none' }}
    >
      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 h-12 flex items-center justify-between px-3 sm:px-4 bg-[#0d1424] border-b border-white/[0.06] z-10">
        
        {/* Left: Back */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm active:scale-95"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Center: Title */}
        <h1 className="flex-1 text-center text-sm font-medium text-white/90 truncate px-3">
          {content.title}
        </h1>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Download */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
            title="Download PDF"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Download</span>
          </a>

          {/* Mark Complete */}
          <button
            onClick={handleComplete}
            disabled={saveProg.isPending || completed}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all active:scale-95 disabled:cursor-not-allowed ${
              completed
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : 'text-emerald-400 hover:text-emerald-300 border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10'
            }`}
            title="Mark as Complete"
          >
            {saveProg.isPending ? (
              <Loader size={13} className="animate-spin" />
            ) : (
              <CheckCircle size={13} />
            )}
            <span className="hidden sm:inline">
              {completed ? 'Completed' : saveProg.isPending ? 'Saving…' : 'Complete'}
            </span>
          </button>

          {/* Exit fullscreen / close */}
          <button
            onClick={handleBack}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-90 ml-0.5"
            title="Exit"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── PDF Area ── */}
      <div className="flex-1 relative overflow-hidden">
        
        {/* Iframe loading spinner */}
        {iframeLoading && !iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f1e] z-10 gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
            <p className="text-gray-400 text-sm">Loading PDF…</p>
          </div>
        )}

        {/* Error state */}
        {iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f1e] z-10 gap-4 px-6">
            <AlertCircle size={36} className="text-red-400" />
            <div className="text-center">
              <p className="text-gray-200 text-sm font-medium mb-1">Unable to load PDF</p>
              <p className="text-gray-500 text-xs">
                The file may be restricted or your browser is blocking the preview.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-xl transition-all active:scale-95"
              >
                <RefreshCw size={14} /> Retry
              </button>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 px-4 py-2 rounded-xl transition-all active:scale-95"
              >
                <ExternalLink size={14} /> Open in Tab
              </a>
            </div>
          </div>
        )}

        {/* PDF iframe */}
        {!iframeError && (
          <iframe
            key={iframeSrc}
            src={iframeSrc}
            className="w-full h-full border-0"
            title={content.title}
            onLoad={() => setIframeLoading(false)}
            onError={() => {
              setIframeLoading(false)
              setIframeError(true)
            }}
            allow="fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
          />
        )}
      </div>

      {/* Viewer type badge — dev hint, remove in prod if needed */}
      {!iframeLoading && !iframeError && (
        <div className="absolute bottom-3 right-3 text-[10px] text-white/20 pointer-events-none select-none">
          {viewerType === 'google' ? 'Google Drive Preview' : 'Direct Embed'}
        </div>
      )}
    </div>
  )
}
