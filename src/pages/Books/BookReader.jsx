import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, Book, AlertTriangle, ExternalLink
} from 'lucide-react'
import api from '../../api/axios'
import { useEffect, useRef, useState, useCallback } from 'react'

// Minimal icon-only back control — no label text, fades with the rest of the UI.
function BackIcon({ onClick, visible = true }) {
  return (
    <button
      onClick={onClick}
      className={`absolute top-3 left-3 z-[60] w-10 h-10 flex items-center justify-center rounded-full
        bg-black/45 backdrop-blur-md text-white transition-opacity duration-300
        ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <ChevronLeft size={22} />
    </button>
  )
}

// Extract a Google Drive file id from any share/preview/open link shape.
function extractDriveId(url) {
  if (!url) return null
  const patterns = [
    /drive\.google\.com\/file\/d\/([^/]+)/,
    /drive\.google\.com\/open\?id=([^&]+)/,
    /[?&]id=([^&]+)/,
    /drive\.google\.com\/uc\?.*id=([^&]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}

// PDF stage — full page, portrait, nothing on screen but the PDF
function PDFStage({ content, onBack }) {
  const url = content.pdfUrl // Use pdfUrl from book object
  const driveId = extractDriveId(url)

  const [mode, setMode] = useState(driveId ? 'drive' : 'google')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [showBack, setShowBack] = useState(true)
  const hideTimer  = useRef(null)
  const loadTimer  = useRef(null)
  const loadedRef  = useRef(false)
  const attemptedFallback = useRef(false)

  // While viewing the PDF, stop the outer app page from pinch-zooming so the
  // gesture reaches the PDF viewer inside the iframe instead (which handles
  // its own zoom). Restored on unmount.
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    const prev = meta?.getAttribute('content')
    if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    return () => { if (meta && prev) meta.setAttribute('content', prev) }
  }, [])

  const driveUrl  = driveId ? `https://drive.google.com/file/d/${driveId}/preview` : ''
  const googleUrl = url ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true` : ''
  const directUrl = url ? `${url}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&view=FitH` : ''
  const src = mode === 'drive' ? driveUrl : mode === 'google' ? googleUrl : directUrl

  const fallback = useCallback(() => {
    if (loadedRef.current) return // already loaded fine, ignore a late/false error
    if (attemptedFallback.current) { setLoading(false); setFailed(true); return }
    attemptedFallback.current = true
    setMode(m => (m === 'google' ? 'direct' : m === 'direct' ? 'google' : 'direct'))
    setLoading(true)
  }, [])

  const handleLoad = () => {
    loadedRef.current = true
    clearTimeout(loadTimer.current)
    setLoading(false)
  }
  const handleError = () => fallback()

  // Some blocked/broken embeds never fire onLoad or onError (iframe just stays
  // blank) — a load-timeout catches that case and switches viewer mode.
  useEffect(() => {
    loadedRef.current = false
    setLoading(true)
    clearTimeout(loadTimer.current)
    loadTimer.current = setTimeout(fallback, 7000)
    return () => clearTimeout(loadTimer.current)
  }, [mode, fallback])

  useEffect(() => {
    hideTimer.current = setTimeout(() => setShowBack(false), 2500)
    return () => clearTimeout(hideTimer.current)
  }, [])

  const wake = () => {
    setShowBack(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowBack(false), 2500)
  }

  if (!url) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <BackIcon onClick={onBack} visible />
    </div>
  )

  return (
    <div
      className="fixed inset-0 bg-black"
      style={{ touchAction: 'none' }}
      onTouchStart={wake}
      onMouseMove={wake}
    >
      {loading && !failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      )}
      {failed ? (
        <button
          onClick={() => window.open(url, '_blank', 'noopener')}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
            <ExternalLink size={22} className="text-white/70" />
          </span>
        </button>
      ) : (
        <iframe
          key={mode}
          src={src}
          className="w-full h-full border-0"
          title="Notes"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      <BackIcon onClick={onBack} visible={showBack} />
    </div>
  )
}

export default function BookReader() {
  const { bookId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => api.get(`/books/${bookId}`).then(r => r.data),
  })

  const book = data?.book

  const handleBack = useCallback(() => {
    navigate('/books', { replace: true })
  }, [navigate])

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !book) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-3">
        <AlertTriangle size={32} className="text-gray-500" />
        <p className="text-white/40">Book not found or could not be loaded.</p>
        <BackIcon onClick={handleBack} visible />
      </div>
    )
  }

  return <PDFStage content={book} onBack={handleBack} />
}
