import { useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Download, CheckCircle, AlertCircle, Loader, Maximize, Minimize } from 'lucide-react'
import api from '../../api/axios'

export default function PDFViewer() {
  const { contentId } = useParams()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [useGoogleViewer, setUseGoogleViewer] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['content', contentId],
    queryFn: () => api.get(`/content/${contentId}`).then(r => r.data),
  })

  const saveProg = useMutation({
    mutationFn: (d) => api.post(`/user/content/${contentId}/progress`, d),
  })

  const content = data?.content

  // Get PDF URL
  const pdfUrl = content?.url || ''

  // Google Docs Viewer URL
  const googleViewerUrl = pdfUrl ? `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true` : ''

  // Fullscreen handler
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  // Listen for fullscreen changes
  useState(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFSChange)
    return () => document.removeEventListener('fullscreenchange', handleFSChange)
  }, [])

  if (isLoading) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-9 h-9 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>
  )

  if (!content) return (
    <div className="flex flex-col items-center py-32 gap-3">
      <AlertCircle size={32} className="text-red-400" />
      <p className="text-gray-400 text-sm">Content not found.</p>
      <button onClick={() => navigate(-1)} className="text-sm text-primary-400 hover:underline">Go back</button>
    </div>
  )

  const handleSaveComplete = () => {
    saveProg.mutate(
      { completed: true, subjectId: content.subjectId },
      {
        onSuccess: () => {
          // Optional: show success toast
        },
      }
    )
  }

  const handleIframeError = () => {
    setLoading(false)
    if (useGoogleViewer) {
      // If Google Viewer fails, try direct PDF as fallback
      setUseGoogleViewer(false)
      setLoading(true)
    } else {
      setError(true)
    }
  }

  // Determine which URL to use in iframe
  const iframeSrc = useGoogleViewer ? googleViewerUrl : `${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`

  return (
    <div className={`max-w-5xl mx-auto w-full ${isFullscreen ? 'px-0' : 'px-4 sm:px-0'}`}>
      {/* Header - Hide in fullscreen */}
      {!isFullscreen && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm w-fit"
            >
              <ArrowLeft size={17} /> Back
            </button>
            <div className="flex items-center gap-2">
              <a 
                href={pdfUrl} 
                download 
                className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl transition-all active:scale-95"
              >
                <Download size={14} /> Download
              </a>
              <button
                onClick={handleSaveComplete}
                disabled={saveProg.isPending}
                className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 px-4 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveProg.isPending ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                {saveProg.isPending ? 'Saving...' : 'Mark as Complete'}
              </button>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-lg sm:text-xl font-bold text-white mb-4 leading-snug">
            {content.title}
          </h1>
        </>
      )}

      {/* PDF Viewer Container */}
      <div 
        ref={containerRef}
        className={`relative bg-dark-800 border border-white/5 shadow-2xl overflow-hidden ${
          isFullscreen 
            ? 'fixed inset-0 z-50 rounded-none' 
            : 'rounded-2xl'
        }`}
        style={{ height: isFullscreen ? '100vh' : '80vh' }}
      >
        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-3 right-3 z-30 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white rounded-lg transition-all active:scale-90"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>

        {/* Loading State */}
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-800 z-10">
            <div className="w-12 h-12 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin mb-3" />
            <p className="text-gray-400 text-sm">
              {useGoogleViewer ? 'Loading PDF with Google Viewer...' : 'Loading PDF...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-800 z-10 gap-3">
            <AlertCircle size={32} className="text-red-400" />
            <div className="text-center px-4">
              <p className="text-gray-300 text-sm mb-1">Unable to preview PDF</p>
              <p className="text-gray-500 text-xs mb-4">This might be due to browser restrictions or the file being inaccessible</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => {
                  setError(false)
                  setLoading(true)
                  setUseGoogleViewer(true)
                }}
                className="text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-white transition-all"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  setError(false)
                  setLoading(true)
                  setUseGoogleViewer(!useGoogleViewer)
                }}
                className="text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-white transition-all"
              >
                Switch Viewer
              </button>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 px-4 py-2 rounded-xl transition-all"
              >
                Open Directly
              </a>
            </div>
          </div>
        )}

        {/* PDF Iframe with touch-action for pinch zoom */}
        {!error && (
          <div 
            className="w-full h-full"
            style={{ 
              touchAction: 'pan-x pan-y pinch-zoom',
              overflow: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <iframe
              key={useGoogleViewer ? 'google' : 'direct'}
              src={iframeSrc}
              className="w-full h-full"
              title={content.title}
              onLoad={() => setLoading(false)}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              allow="fullscreen"
              style={{
                touchAction: 'pan-x pan-y pinch-zoom',
              }}
            />
          </div>
        )}
      </div>

      {/* Description if exists */}
      {content.description && !isFullscreen && (
        <p className="text-gray-400 text-sm leading-relaxed mt-4 px-1">
          {content.description}
        </p>
      )}

      {/* Mobile Actions (fixed at bottom) - Hide in fullscreen */}
      {!isFullscreen && (
        <>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-dark-900 via-dark-900/95 to-transparent sm:hidden z-20">
            <div className="flex gap-2">
              <a
                href={pdfUrl}
                download
                className="flex-1 flex items-center justify-center gap-2 text-sm bg-white/10 hover:bg-white/15 text-white py-3 rounded-xl transition-all active:scale-95"
              >
                <Download size={16} /> Download
              </a>
              <button
                onClick={handleSaveComplete}
                disabled={saveProg.isPending}
                className="flex-1 flex items-center justify-center gap-2 text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                <CheckCircle size={16} /> Complete
              </button>
            </div>
          </div>

          {/* Bottom padding for mobile to account for fixed buttons */}
          <div className="h-20 sm:h-0" />
        </>
      )}

      {/* Fullscreen Exit Hint */}
      {isFullscreen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full z-50 pointer-events-none">
          Press Esc or click <Minimize size={12} className="inline mx-1" /> to exit fullscreen
        </div>
      )}

      <style>{`
        /* Improved pinch zoom support */
        .pdf-container {
          touch-action: pan-x pan-y pinch-zoom !important;
          -webkit-overflow-scrolling: touch;
        }
        
        /* Better iframe interaction */
        iframe {
          touch-action: pan-x pan-y pinch-zoom !important;
        }

        /* Fullscreen animation */
        .fullscreen-enter {
          animation: fsIn 0.3s ease-out;
        }
        
        @keyframes fsIn {
          from { opacity: 0.8; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Meta viewport for mobile */
        @viewport {
          zoom: 1;
          width: extend-to-zoom;
        }
        
        /* Prevent text size adjust on orientation change */
        html {
          -webkit-text-size-adjust: 100%;
        }
      `}</style>
    </div>
  )
}