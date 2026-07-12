import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronLeft, FileText, AlertTriangle, RefreshCw } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { goFullscreenLandscape, exitFullscreenAndUnlock } from '../utils/fullscreen'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// Extract a Google Drive file id from any share/preview/open link shape.
function extractDriveId(url) {
  if (!url) return null
  const patterns = [
    /drive\.google\.com\/file\/d\/([^/]+)/,
    /drive\.google\.com\/open\?id=([^&]+)/,
    /drive\.google\.com\/uc\?.*id=([^&]+)/,
    /[?&]id=([^&]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}

// Every viewing strategy we try, in order, before giving up. Drive links skip
// straight to the drive stage since canvas/direct fetches on them are almost
// always CORS-blocked. Everything else tries the clean, chrome-free routes
// first and only falls back to a third-party viewer if truly nothing else
// can reach the file (e.g. a strict-CORS custom host).
function buildStages(url) {
  const driveId = extractDriveId(url)
  if (driveId) return ['drive']
  return ['canvas', 'direct', 'google']
}

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

// A single page: a placeholder that renders itself into a canvas once it
// scrolls into view (keeps big PDFs light — nothing is rendered up front).
function PdfPage({ pdfDoc, pageNumber, containerHeight, registerRef }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [rendered, setRendered] = useState(false)
  const [size, setSize] = useState(null) // { width, height } in CSS px

  // Work out the page's natural size first so the placeholder reserves the
  // right amount of space before it's actually rendered (avoids layout jump).
  useEffect(() => {
    let cancelled = false
    pdfDoc.getPage(pageNumber).then((page) => {
      if (cancelled) return
      const base = page.getViewport({ scale: 1 })
      // Fit the page to the available height (landscape-locked screen is
      // short and wide — this mirrors how the video stage letterboxes
      // portrait content instead of stretching it).
      const fitScale = Math.min((containerHeight * 0.94) / base.height, 3)
      setSize({ width: base.width * fitScale, height: base.height * fitScale, fitScale })
    })
    return () => { cancelled = true }
  }, [pdfDoc, pageNumber, containerHeight])

  useEffect(() => {
    if (!wrapRef.current || !registerRef) return
    registerRef(pageNumber, wrapRef.current)
  }, [pageNumber, registerRef])

  useEffect(() => {
    if (!size || rendered) return
    const el = wrapRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect()
          const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
          pdfDoc.getPage(pageNumber).then((page) => {
            const viewport = page.getViewport({ scale: size.fitScale * dpr })
            const canvas = canvasRef.current
            if (!canvas) return
            canvas.width = viewport.width
            canvas.height = viewport.height
            canvas.style.width = `${size.width}px`
            canvas.style.height = `${size.height}px`
            const ctx = canvas.getContext('2d')
            page.render({ canvasContext: ctx, viewport }).promise.then(() => setRendered(true))
          })
        }
      },
      { rootMargin: '400px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [size, rendered, pdfDoc, pageNumber])

  return (
    <div
      ref={wrapRef}
      className="flex items-center justify-center mx-auto"
      style={{
        width: size ? `${size.width}px` : '60vw',
        height: size ? `${size.height}px` : `${containerHeight * 0.9}px`,
      }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}

// ─── PDF stage — full app, no third-party toolbar, native pinch/scroll ─────
export default function PdfReader({ url, title, onBack }) {
  const containerRef = useRef(null)
  const scrollRef = useRef(null)
  const pageRefs = useRef({})

  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [containerHeight, setContainerHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  )
  const [showBack, setShowBack] = useState(true)
  const hideTimer = useRef(null)

  // Let the page itself pinch-zoom (native, no custom JS) instead of the
  // outer app shell — restored to the app's default on unmount.
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    const prev = meta?.getAttribute('content')
    if (meta) {
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=6.0, user-scalable=yes'
      )
    }
    return () => { if (meta && prev) meta.setAttribute('content', prev) }
  }, [])

  useEffect(() => {
    const onResize = () => setContainerHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  // If the user (or system) exits fullscreen after we've started, treat it as
  // "close the page" — same behavior as the video stage, since there is no
  // navbar/header on this route to fall back to.
  useEffect(() => {
    const onFS = () => {
      if (!document.fullscreenElement && started) {
        try { window.screen?.orientation?.unlock?.() } catch (e) {}
        onBack()
      }
    }
    document.addEventListener('fullscreenchange', onFS)
    return () => document.removeEventListener('fullscreenchange', onFS)
  }, [started, onBack])

  useEffect(() => () => exitFullscreenAndUnlock(), [])

  // Load the document once the user has committed (tapped to open).
  useEffect(() => {
    if (!started || !url) return
    let cancelled = false
    setLoading(true)
    setError(false)

    const loadingTask = pdfjsLib.getDocument({ url, withCredentials: false })
    loadingTask.promise
      .then((doc) => {
        if (cancelled) return
        setPdfDoc(doc)
        setNumPages(doc.numPages)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
        setError(true)
      })

    return () => {
      cancelled = true
      loadingTask.destroy?.()
    }
  }, [started, url])

  const handleStart = async () => {
    setStarted(true)
    await goFullscreenLandscape(containerRef.current, null)
  }

  const handleRetry = () => {
    setError(false)
    setStarted(false)
    setTimeout(() => setStarted(true), 50)
  }

  // Auto-hide the back control, same rhythm as the video controls.
  const wake = useCallback(() => {
    setShowBack(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowBack(false), 2500)
  }, [])
  useEffect(() => { if (started) wake() }, [started, wake])

  // Track which page is roughly in view for the "page X / Y" indicator.
  useEffect(() => {
    if (!numPages) return
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const mid = el.scrollTop + el.clientHeight / 2
      let closest = 1
      let closestDist = Infinity
      Object.entries(pageRefs.current).forEach(([num, node]) => {
        if (!node) return
        const dist = Math.abs(node.offsetTop + node.offsetHeight / 2 - mid)
        if (dist < closestDist) { closestDist = dist; closest = Number(num) }
      })
      setCurrentPage(closest)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [numPages])

  const registerRef = useCallback((num, node) => { pageRefs.current[num] = node }, [])

  if (!url) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <BackIcon onClick={onBack} visible />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-[#14161c]">
      {/* Tap-to-open poster — same pattern the video stage uses to open full
          app + landscape, since browsers require a user tap for that. */}
      {!started && (
        <button
          onClick={handleStart}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#14161c]"
        >
          <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl active:scale-90 transition-transform">
            <FileText size={28} className="text-black" />
          </span>
          {title && <span className="text-white/70 text-sm px-8 text-center line-clamp-2">{title}</span>}
        </button>
      )}

      {started && (
        <div
          className="absolute inset-0"
          onTouchStart={wake}
          onMouseMove={wake}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#14161c] z-10">
              <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#14161c] px-6">
              <AlertTriangle size={30} className="text-red-400" />
              <p className="text-white/60 text-sm text-center">PDF load nahi hua.</p>
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-xl transition-all active:scale-95"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {pdfDoc && !error && (
            <div
              ref={scrollRef}
              className="w-full h-full overflow-y-auto overflow-x-auto"
              style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
            >
              <div className="flex flex-col items-center gap-3 py-3 min-h-full">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
                  <PdfPage
                    key={n}
                    pdfDoc={pdfDoc}
                    pageNumber={n}
                    containerHeight={containerHeight}
                    registerRef={registerRef}
                  />
                ))}
              </div>
            </div>
          )}

          {numPages > 1 && !loading && !error && (
            <div
              className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-[60] text-xs text-white/80 bg-black/45 backdrop-blur-md px-3 py-1 rounded-full transition-opacity duration-300 ${
                showBack ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {currentPage} / {numPages}
            </div>
          )}
        </div>
      )}

      <BackIcon onClick={onBack} visible={!started || showBack} />
    </div>
  )
}
