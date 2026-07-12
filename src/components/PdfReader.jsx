import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronLeft, FileText, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
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

const driveEmbedUrl = (id) => `https://drive.google.com/file/d/${id}/preview`
// Drive's raw download endpoint — unlike /preview (which Drive intentionally
// shrinks down to a bare "Open" button on mobile browsers), this returns the
// actual file bytes and can be fed straight into our own canvas renderer.
const driveDirectDownloadUrl = (id) => `https://drive.google.com/uc?export=download&id=${id}`
const googleViewerUrl = (url) => `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`

// Every viewing strategy we try, in order, before giving up. We always try
// the canvas (pdf.js) reader first — it doesn't depend on a browser's own
// PDF plugin, which desktop Chrome has but mobile browsers largely don't
// (mobile iframes either show a stripped-down "Open" button for Drive links
// or fail to render the PDF at all), so canvas is the one strategy that
// behaves the same on phone and laptop. Only when canvas can't fetch the
// bytes at all (real CORS block) do we fall back to embeds/viewers.
function buildStages(url) {
  const driveId = extractDriveId(url)
  if (driveId) {
    return [
      { kind: 'canvas', src: driveDirectDownloadUrl(driveId) },
      { kind: 'drive', src: driveEmbedUrl(driveId) },
      { kind: 'google', src: googleViewerUrl(url) },
    ]
  }
  return [
    { kind: 'canvas', src: url },
    { kind: 'direct', src: url },
    { kind: 'google', src: googleViewerUrl(url) },
  ]
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
// scrolls into view (keeps big PDFs light — nothing is rendered up front),
// and re-renders at higher resolution whenever the committed zoom changes so
// zoomed-in text stays crisp instead of being stretched.
function PdfPage({ pdfDoc, pageNumber, containerWidth, zoom, registerRef }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [rendered, setRendered] = useState(false)
  const [size, setSize] = useState(null) // { width, height } in CSS px

  // Work out the page's natural size first so the placeholder reserves the
  // right amount of space before it's actually rendered (avoids layout
  // jump). Always fits the full device width, scaled further by `zoom`.
  useEffect(() => {
    let cancelled = false
    pdfDoc.getPage(pageNumber).then((page) => {
      if (cancelled) return
      const base = page.getViewport({ scale: 1 })
      const fitScale = (containerWidth / base.width) * zoom
      setSize({ width: base.width * fitScale, height: base.height * fitScale, fitScale })
    })
    return () => { cancelled = true }
  }, [pdfDoc, pageNumber, containerWidth, zoom])

  useEffect(() => {
    if (!wrapRef.current || !registerRef) return
    registerRef(pageNumber, wrapRef.current)
  }, [pageNumber, registerRef])

  // Render (or re-render) the canvas at the current size. Runs the first
  // time the page scrolls into view, and again any time `size` changes
  // afterwards (i.e. the user pinch-zoomed) so already-visible pages get a
  // fresh, sharp render instead of a blurry CSS stretch.
  useEffect(() => {
    if (!size) return
    const el = wrapRef.current
    if (!el) return

    const doRender = () => {
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

    if (rendered) {
      doRender()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect()
          doRender()
        }
      },
      { rootMargin: '400px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, pdfDoc, pageNumber])

  return (
    <div
      ref={wrapRef}
      className="flex items-center justify-center mx-auto"
      style={{
        width: size ? `${size.width}px` : '100%',
        height: size ? `${size.height}px` : `${containerWidth * 1.3}px`,
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
  const [stages, setStages] = useState([])
  const [stageIndex, setStageIndex] = useState(0)
  const iframeTimeoutRef = useRef(null)
  const currentStage = stages[stageIndex]
  const [containerWidth, setContainerWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 400
  )
  const [zoom, setZoom] = useState(1)
  const pagesWrapRef = useRef(null)
  const pinchRef = useRef(null) // { startDist, startZoom }
  const MIN_ZOOM = 1
  const MAX_ZOOM = 4
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
    const onResize = () => setContainerWidth(window.innerWidth)
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

  // Kick off the stage pipeline once the user has committed (tapped to open).
  useEffect(() => {
    if (!started || !url) return
    setStages(buildStages(url))
    setStageIndex(0)
    setZoom(1)
  }, [started, url])

  // Manual pinch-to-zoom. Browsers disable native pinch-zoom while an
  // element is in Fullscreen mode (which this reader always is), so we
  // implement it ourselves: track two-finger distance, live-preview the
  // scale with a cheap CSS transform while fingers move, then "commit" it
  // by re-rendering the actual canvases at the new resolution on release —
  // that keeps text crisp instead of a blurry stretched preview, and lets
  // native scrolling reach the now-larger page normally.
  useEffect(() => {
    const el = scrollRef.current
    if (!started || !el) return

    const dist = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        pinchRef.current = { startDist: dist(e.touches[0], e.touches[1]), startZoom: zoom }
      }
    }
    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const d = dist(e.touches[0], e.touches[1])
        const live = pinchRef.current.startZoom * (d / pinchRef.current.startDist)
        const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, live))
        if (pagesWrapRef.current) {
          pagesWrapRef.current.style.transform = `scale(${clamped / zoom})`
          pagesWrapRef.current.style.transformOrigin = '50% 50%'
        }
        pinchRef.current.liveZoom = clamped
      }
    }
    const onTouchEnd = (e) => {
      if (e.touches.length < 2 && pinchRef.current) {
        const finalZoom = pinchRef.current.liveZoom || pinchRef.current.startZoom
        pinchRef.current = null
        if (pagesWrapRef.current) pagesWrapRef.current.style.transform = ''
        setZoom(finalZoom)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [started, zoom, pdfDoc])

  // If we've fallen off the end of the stage list, every strategy failed —
  // show the final error state (with an "open in browser" escape hatch).
  useEffect(() => {
    if (!started || stages.length === 0) return
    if (stageIndex >= stages.length) {
      setLoading(false)
      setError(true)
    }
  }, [started, stages, stageIndex])

  // Canvas stage: fetch + render via pdf.js. A real fetch/parsing failure
  // (e.g. CORS-blocked host) rejects the promise, so we can reliably
  // detect it and advance to the next stage automatically.
  useEffect(() => {
    if (!started || !currentStage || currentStage.kind !== 'canvas') return
    let cancelled = false
    setLoading(true)
    setError(false)
    setPdfDoc(null)

    const fetchUrl = currentStage.src || url
    const loadingTask = pdfjsLib.getDocument({ url: fetchUrl, withCredentials: false })
    loadingTask.promise
      .then((doc) => {
        if (cancelled) return
        setPdfDoc(doc)
        setNumPages(doc.numPages)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        console.error('[PdfReader] canvas stage failed for', fetchUrl, e)
        setStageIndex((i) => i + 1)
      })

    return () => {
      cancelled = true
      loadingTask.destroy?.()
    }
  }, [started, url, currentStage])

  // Iframe stages (direct / drive / google viewer): the browser navigates
  // to the URL itself, which sidesteps CORS entirely. onLoad isn't a
  // guarantee the PDF actually rendered (a blocked/blank page still
  // "loads"), so we also arm a timeout — if nothing loads at all within a
  // reasonable window (dead link, network failure), move to the next stage.
  useEffect(() => {
    if (!started || !currentStage || currentStage.kind === 'canvas') return
    setLoading(true)
    setError(false)
    clearTimeout(iframeTimeoutRef.current)
    iframeTimeoutRef.current = setTimeout(() => {
      console.error('[PdfReader] iframe stage timed out:', currentStage.kind, currentStage.src)
      setStageIndex((i) => i + 1)
    }, 12000)
    return () => clearTimeout(iframeTimeoutRef.current)
  }, [started, currentStage])

  const handleIframeLoad = () => {
    clearTimeout(iframeTimeoutRef.current)
    setLoading(false)
  }

  const handleStart = async () => {
    setStarted(true)
    await goFullscreenLandscape(containerRef.current, null)
  }

  const handleRetry = () => {
    setError(false)
    setPdfDoc(null)
    setZoom(1)
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
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-xl transition-all active:scale-95"
                >
                  <RefreshCw size={14} /> Retry
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 px-4 py-2 rounded-xl transition-all active:scale-95"
                >
                  <ExternalLink size={14} /> Open in Browser
                </a>
              </div>
            </div>
          )}

          {currentStage?.kind !== 'canvas' && currentStage?.src && !error && (
            <iframe
              key={currentStage.src}
              src={currentStage.src}
              className="w-full h-full border-0"
              title={title}
              onLoad={handleIframeLoad}
              allow="fullscreen"
              style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
            />
          )}

          {currentStage?.kind === 'canvas' && pdfDoc && !error && (
            <div
              ref={scrollRef}
              className="w-full h-full overflow-y-auto overflow-x-auto"
              style={{ touchAction: 'pan-x pan-y' }}
            >
              <div ref={pagesWrapRef} className="flex flex-col items-center gap-3 py-3 min-h-full">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
                  <PdfPage
                    key={n}
                    pdfDoc={pdfDoc}
                    pageNumber={n}
                    containerWidth={containerWidth}
                    zoom={zoom}
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
