import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import Hls from 'hls.js'
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, CheckCircle, AlertCircle,
  PictureInPicture2, Monitor, Gauge
} from 'lucide-react'
import api from '../../api/axios'

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${m}:${String(sec).padStart(2,'0')}`
}

function extractYTId(url) {
  if (!url) return null
  const patterns = [
    /[?&]v=([^&#\s]+)/,
    /youtu\.be\/([^?&#\s]+)/,
    /youtube\.com\/embed\/([^?&#\s]+)/,
    /youtube\.com\/shorts\/([^?&#\s]+)/,
    /youtube\.com\/live\/([^?&#\s]+)/,
    /youtube\.com\/v\/([^?&#\s]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}

function isYouTubeURL(url) {
  return /youtube\.com|youtu\.be/.test(url || '')
}

function isHLSURL(url) {
  if (!url) return false
  return /\.m3u8(\?|#|$)/i.test(url) ||
    /[?&]type=hls/i.test(url) ||
    /\/hls\//i.test(url)
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3]

// ─── Custom Player (No Controls Inside) ────────────────────────────────────
function CustomPlayer({ url, savedPos = 0, onProgress, onComplete, title, 
  playing, setPlaying, currentTime, setCurrentTime, duration, setDuration,
  buffered, setBuffered, volume, setVolume, muted, setMuted,
  fullscreen, setFullscreen, pip, setPip, speed, setSpeed,
  levels, setLevels, currentLevel, setCurrentLevel,
  loading, setLoading, error, setError, showCtrl, setShowCtrl,
  showSpeed, setShowSpeed, showQuality, setShowQuality,
  containerRef, videoRef, hlsRef, skipFlash, setSkipFlash,
  togglePlay, toggleMute, changeVol, doSkip, toggleFS, togglePip,
  qualityLabel, pipSupported, pct, buffPct, handleVideoClick, resetHide,
  onSeekClick, onSeekStart, onSeekMove, onSeekEnd, seekbarRef,
  changeSpeed, changeQuality
}) {
  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full select-none touch-none"
      style={{ aspectRatio: '16/9', borderRadius: '14px', overflow: 'hidden' }}
      onMouseMove={resetHide}
      onTouchStart={resetHide}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
        onClick={handleVideoClick}
        onDoubleClick={toggleFS}
      />

      {/* Buffering spinner */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90">
          <AlertCircle size={30} className="text-red-400" />
          <p className="text-white text-sm text-center px-6 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-white bg-white/10 border border-white/20 rounded-lg px-4 py-1.5"
          >
            Retry
          </button>
        </div>
      )}

      {/* Skip flash overlay */}
      {skipFlash && (
        <div
          key={skipFlash.ts}
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-0.5 animate-skipFlash ${
            skipFlash.dir === 'right' ? 'right-[10%]' : 'left-[10%]'
          }`}
        >
          <span className="text-2xl font-black text-white leading-none">
            {skipFlash.dir === 'right' ? '▶▶' : '◀◀'}
          </span>
          <span className="text-[11px] font-semibold text-white/75">10s</span>
        </div>
      )}

      {/* Controls overlay - ONLY visible in fullscreen */}
      {fullscreen && (
        <div
          className={`absolute inset-0 flex flex-col justify-end pointer-events-none transition-opacity duration-300 ${
            showCtrl || !playing ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 75%)',
          }}
        >
          {/* ── Fullscreen Seek bar ── */}
          <div className="pointer-events-auto px-3 pb-1 sm:px-4">
            <div
              ref={seekbarRef}
              className="py-2 cursor-pointer touch-none"
              onClick={onSeekClick}
              onTouchStart={onSeekStart}
              onTouchMove={onSeekMove}
              onTouchEnd={onSeekEnd}
              onMouseDown={onSeekStart}
              onMouseMove={onSeekMove}
              onMouseUp={onSeekEnd}
              role="slider"
            >
              <div className="relative h-1 sm:h-1.5 bg-white/20 rounded-full">
                <div className="absolute inset-y-0 left-0 rounded-full bg-white/20 transition-all" style={{ width: `${buffPct}%` }} />
                <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-400 transition-all" style={{ width: `${pct}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full shadow-lg transition-all" style={{ left: `${pct}%` }} />
              </div>
            </div>
          </div>

          {/* ── Fullscreen Controls ── */}
          <div className="pointer-events-auto flex items-center gap-1 px-2 pb-3 flex-wrap">
            <button onClick={togglePlay} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors">
              {playing ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-0.5" />}
            </button>
            <button onClick={() => doSkip(-10)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors">
              <SkipBack size={18} />
            </button>
            <button onClick={() => doSkip(10)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors">
              <SkipForward size={18} />
            </button>
            <button onClick={toggleMute} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors">
              {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div className="hidden sm:flex items-center w-20">
              <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={e => changeVol(parseFloat(e.target.value))} className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-indigo-400" />
            </div>
            <span className="text-xs sm:text-sm font-mono text-white/90 ml-1 whitespace-nowrap tabular-nums flex-shrink-0">
              {fmtTime(currentTime)}
              {duration > 0 && <span className="text-white/40"> / {fmtTime(duration)}</span>}
            </span>
            <div className="flex-1" />
            
            {/* Speed */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setShowSpeed(!showSpeed); setShowQuality(false) }} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors relative">
                <span className="text-xs sm:text-sm font-bold">{speed}x</span>
              </button>
              {showSpeed && (
                <div className="absolute bottom-full right-0 mb-2 w-48 sm:w-56 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[60vh]">
                  <div className="p-2">
                    <div className="text-[10px] text-white/50 px-2 py-1 font-medium uppercase">Speed</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SPEEDS.map(s => (
                        <button key={s} onClick={() => changeSpeed(s)} className={`py-2 rounded-lg text-sm font-medium transition-colors ${speed === s ? 'bg-indigo-500 text-white' : 'text-white/70 hover:bg-white/10'}`}>
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quality */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setShowQuality(!showQuality); setShowSpeed(false) }} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl transition-colors ${levels.length > 0 ? 'text-white hover:bg-white/10 active:bg-white/20' : 'text-white/30 cursor-not-allowed'}`} disabled={levels.length === 0}>
                <Monitor size={18} />
              </button>
              {showQuality && levels.length > 0 && (
                <div className="absolute bottom-full right-0 mb-2 w-48 sm:w-56 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[60vh]">
                  <div className="p-2">
                    <div className="text-[10px] text-white/50 px-2 py-1 font-medium uppercase">Quality</div>
                    <div className="space-y-1">
                      {[-1, ...levels.map((_, i) => i)].map(l => (
                        <button key={l} onClick={() => changeQuality(l)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentLevel === l ? 'bg-indigo-500 text-white' : 'text-white/70 hover:bg-white/10'}`}>
                          <span>{qualityLabel(l)}</span>
                          {l === -1 && <span className="text-[10px] text-white/40">Auto</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PiP */}
            {pipSupported && (
              <button onClick={togglePip} className={`hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors ${pip ? 'text-indigo-400' : ''}`}>
                <PictureInPicture2 size={16} />
              </button>
            )}

            {/* Exit Fullscreen */}
            <button onClick={toggleFS} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors">
              <Minimize size={18} />
            </button>
          </div>
        </div>
      )}

      {/* PiP indicator */}
      {pip && (
        <div className="absolute top-2 left-2 bg-indigo-500/80 backdrop-blur-sm text-white text-[10px] font-medium px-3 py-1 rounded-full pointer-events-none">
          PiP
        </div>
      )}

      <style>{`
        @keyframes skipFlash {
          0% { opacity: 1; transform: translateY(-50%) scale(1); }
          50% { opacity: 1; transform: translateY(-50%) scale(1.1); }
          100% { opacity: 0; transform: translateY(-50%) scale(1); }
        }
        .animate-skipFlash { animation: skipFlash 0.65s ease-out forwards; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  )
}

// ─── YouTube Player ──────────────────────────────────────────────────────────
function YouTubePlayer({ url, title }) {
  const ytId = extractYTId(url)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const embedSrc = ytId ? `https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${window.location.origin}` : null
  const liveSrc = !ytId && url

  if (!embedSrc && !liveSrc) {
    return (
      <div className="aspect-video flex flex-col items-center justify-center gap-2 bg-[#0a0a0a] rounded-2xl p-4">
        <AlertCircle size={26} className="text-red-400" />
        <p className="text-white/45 text-sm text-center">YouTube URL parse nahi hua</p>
        <p className="text-white/20 text-xs break-all max-w-xs text-center">{url}</p>
      </div>
    )
  }

  return (
    <div className="relative aspect-video bg-[#0a0a0a] rounded-2xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] z-10">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-400/20 border-t-indigo-400 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#0a0a0a]">
          <AlertCircle size={30} className="text-red-400" />
          <p className="text-white/45 text-sm">Video load nahi hua</p>
          <button onClick={() => { setError(false); setLoading(true) }} className="text-xs text-white bg-white/10 border border-white/20 rounded-lg px-4 py-1.5">
            Retry
          </button>
        </div>
      )}
      <iframe src={embedSrc || liveSrc} className="absolute inset-0 w-full h-full border-0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" title={title || 'YouTube Video'} onLoad={() => setLoading(false)} onError={() => setError(true)} />
    </div>
  )
}

// ─── Controls Component (Outside Player) ────────────────────────────────────
function PlayerControls({ 
  playing, setPlaying, currentTime, duration, volume, muted, setMuted,
  fullscreen, pip, speed, setSpeed, showSpeed, setShowSpeed,
  showQuality, setShowQuality, levels, currentLevel, setCurrentLevel,
  togglePlay, toggleMute, changeVol, doSkip, toggleFS, togglePip,
  changeSpeed, changeQuality, qualityLabel, pipSupported, pct, buffPct,
  onSeekClick, onSeekStart, onSeekMove, onSeekEnd, seekbarRef,
  containerRef
}) {
  return (
    <div className="mt-3 space-y-3">
      {/* ─── Seek Bar ─── */}
      <div className="w-full">
        <div
          ref={seekbarRef}
          className="py-2 cursor-pointer touch-none"
          onClick={onSeekClick}
          onTouchStart={onSeekStart}
          onTouchMove={onSeekMove}
          onTouchEnd={onSeekEnd}
          onMouseDown={onSeekStart}
          onMouseMove={onSeekMove}
          onMouseUp={onSeekEnd}
        >
          <div className="relative h-1.5 bg-white/20 rounded-full">
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/20 transition-all" style={{ width: `${buffPct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 bg-indigo-500 rounded-full shadow-lg transition-all" style={{ left: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* ─── Controls Row ─── */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* Play/Pause */}
        <button onClick={togglePlay} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white bg-white/5 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors">
          {playing ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-0.5" />}
        </button>

        {/* Skip */}
        <button onClick={() => doSkip(-10)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white/70 rounded-xl hover:bg-white/10 hover:text-white active:bg-white/20 transition-colors">
          <SkipBack size={18} />
        </button>
        <button onClick={() => doSkip(10)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white/70 rounded-xl hover:bg-white/10 hover:text-white active:bg-white/20 transition-colors">
          <SkipForward size={18} />
        </button>

        {/* Volume */}
        <button onClick={toggleMute} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white/70 rounded-xl hover:bg-white/10 hover:text-white active:bg-white/20 transition-colors">
          {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <div className="hidden sm:flex items-center w-24">
          <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={e => changeVol(parseFloat(e.target.value))} className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-indigo-500" />
        </div>

        {/* Time */}
        <span className="text-xs sm:text-sm font-mono text-white/70 ml-1 whitespace-nowrap tabular-nums flex-shrink-0">
          {fmtTime(currentTime)}
          {duration > 0 && <span className="text-white/30"> / {fmtTime(duration)}</span>}
        </span>

        <div className="flex-1" />

        {/* Speed Button */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => { setShowSpeed(!showSpeed); setShowQuality(false) }} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white/70 hover:text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors relative">
            <span className="text-xs sm:text-sm font-bold">{speed}x</span>
          </button>
          {showSpeed && (
            <div className="absolute bottom-full right-0 mb-2 w-48 sm:w-56 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[60vh]">
              <div className="p-2">
                <div className="text-[10px] text-white/50 px-2 py-1 font-medium uppercase">Speed</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {SPEEDS.map(s => (
                    <button key={s} onClick={() => changeSpeed(s)} className={`py-2 rounded-lg text-sm font-medium transition-colors ${speed === s ? 'bg-indigo-500 text-white' : 'text-white/70 hover:bg-white/10'}`}>
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quality Button */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => { setShowQuality(!showQuality); setShowSpeed(false) }} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl transition-colors ${levels.length > 0 ? 'text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20' : 'text-white/20 cursor-not-allowed'}`} disabled={levels.length === 0}>
            <Monitor size={18} />
          </button>
          {showQuality && levels.length > 0 && (
            <div className="absolute bottom-full right-0 mb-2 w-48 sm:w-56 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[60vh]">
              <div className="p-2">
                <div className="text-[10px] text-white/50 px-2 py-1 font-medium uppercase">Quality</div>
                <div className="space-y-1">
                  {[-1, ...levels.map((_, i) => i)].map(l => (
                    <button key={l} onClick={() => changeQuality(l)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentLevel === l ? 'bg-indigo-500 text-white' : 'text-white/70 hover:bg-white/10'}`}>
                      <span>{qualityLabel(l)}</span>
                      {l === -1 && <span className="text-[10px] text-white/40">Auto</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PiP */}
        {pipSupported && (
          <button onClick={togglePip} className={`hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 items-center justify-center rounded-xl transition-colors ${pip ? 'text-indigo-400' : 'text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20'}`}>
            <PictureInPicture2 size={16} />
          </button>
        )}

        {/* Fullscreen Button */}
        <button onClick={toggleFS} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white/70 hover:text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors">
          <Maximize size={18} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Video Player Component ───────────────────────────────────────────
export function VideoPlayer() {
  const { contentId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['content', contentId],
    queryFn: () => api.get(`/content/${contentId}`).then(r => r.data),
  })

  const { data: progressData } = useQuery({
    queryKey: ['content-progress', contentId],
    queryFn: () => api.get(`/user/content/${contentId}/progress`).then(r => r.data),
  })

  const saveProg = useMutation({
    mutationFn: (d) => api.post(`/user/content/${contentId}/progress`, d),
  })

  const content = data?.content
  const savedPos = progressData?.progress?.position || 0
  const isCompleted = progressData?.progress?.completed

  // ─── Player State ──────────────────────────────────────────────────────
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const containerRef = useRef(null)
  const hideTimer = useRef(null)
  const lastSaved = useRef(0)
  const seekbarRef = useRef(null)
  const touchStartRef = useRef(null)
  const touchTimeoutRef = useRef(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [pip, setPip] = useState(false)
  const [showCtrl, setShowCtrl] = useState(true)
  const [showSpeed, setShowSpeed] = useState(false)
  const [showQuality, setShowQuality] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [levels, setLevels] = useState([])
  const [currentLevel, setCurrentLevel] = useState(-1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [doneFired, setDoneFired] = useState(false)
  const [skipFlash, setSkipFlash] = useState(null)

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleFullscreenChange = useCallback(() => {
    const isFullscreen = !!document.fullscreenElement
    setFullscreen(isFullscreen)
    if (isFullscreen && window.screen?.orientation?.lock) {
      setTimeout(() => {
        window.screen.orientation.lock('landscape').catch(() => {})
      }, 200)
    } else if (!isFullscreen && window.screen?.orientation?.unlock) {
      window.screen.orientation.unlock()
    }
  }, [])

  const resetHide = useCallback(() => {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    if (playing && fullscreen) {
      hideTimer.current = setTimeout(() => setShowCtrl(false), 3000)
    }
  }, [playing, fullscreen])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    v.paused ? v.play() : v.pause()
    resetHide()
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
  }

  const changeVol = (val) => {
    const v = videoRef.current
    if (!v) return
    v.volume = val
    v.muted = val === 0
  }

  const doSkip = (secs) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.currentTime + secs, v.duration || 0))
    setSkipFlash({ dir: secs > 0 ? 'right' : 'left', ts: Date.now() })
    setTimeout(() => setSkipFlash(null), 650)
  }

  const onSeekStart = (e) => {
    e.preventDefault()
    touchStartRef.current = true
  }

  const onSeekMove = (e) => {
    if (!touchStartRef.current) return
    e.preventDefault()
    const rect = seekbarRef.current?.getBoundingClientRect()
    if (!rect) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    if (videoRef.current && duration) {
      videoRef.current.currentTime = pct * duration
    }
  }

  const onSeekEnd = () => {
    touchStartRef.current = null
    resetHide()
  }

  const onSeekClick = (e) => {
    const rect = seekbarRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    if (videoRef.current) videoRef.current.currentTime = pct * duration
  }

  const changeSpeed = (s) => {
    setSpeed(s)
    if (videoRef.current) videoRef.current.playbackRate = s
    setShowSpeed(false)
  }

  const changeQuality = (level) => {
    if (hlsRef.current) hlsRef.current.currentLevel = level
    setCurrentLevel(level)
    setShowQuality(false)
  }

  const toggleFS = async () => {
    const el = containerRef.current
    if (!document.fullscreenElement) {
      try {
        await el?.requestFullscreen?.()
        if (window.screen?.orientation?.lock) {
          setTimeout(() => {
            window.screen.orientation.lock('landscape').catch(() => {})
          }, 200)
        }
      } catch (err) {
        console.log('Fullscreen failed:', err)
      }
    } else {
      try {
        await document.exitFullscreen?.()
        if (window.screen?.orientation?.unlock) {
          window.screen.orientation.unlock()
        }
      } catch (err) {
        console.log('Exit fullscreen failed:', err)
      }
    }
  }

  const togglePip = async () => {
    const v = videoRef.current
    if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch {}
  }

  const handleVideoClick = (e) => {
    e.stopPropagation()
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current)
      touchTimeoutRef.current = null
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      if (x < rect.width / 2) doSkip(-10)
      else doSkip(10)
    } else {
      touchTimeoutRef.current = setTimeout(() => {
        togglePlay()
        touchTimeoutRef.current = null
      }, 200)
    }
  }

  const pipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document
  const pct = duration ? (currentTime / duration) * 100 : 0
  const buffPct = duration ? (buffered / duration) * 100 : 0

  const qualityLabel = (l) => {
    if (l === -1) return 'Auto'
    const lvl = levels[l]
    if (!lvl) return `Q${l}`
    if (lvl.height) return `${lvl.height}p`
    if (lvl.bitrate) return `${Math.round(lvl.bitrate / 1000)}k`
    return `L${l}`
  }

  // ─── Effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video || !content?.url) return
    setError(null)
    setLoading(true)
    setLevels([])
    setCurrentLevel(-1)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)

    const url = content.url
    if (isHLSURL(url)) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, backBufferLength: 90 })
        hlsRef.current = hls
        hls.loadSource(url)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, (_, d) => {
          setLevels(d.levels)
          setLoading(false)
          if (savedPos > 2) video.currentTime = savedPos
        })
        hls.on(Hls.Events.LEVEL_SWITCHED, (_, d) => setCurrentLevel(d.level))
        hls.on(Hls.Events.ERROR, (_, d) => {
          if (d.fatal) {
            if (d.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
            else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
            else setError('Stream load nahi hua. HLS URL ya CORS check karo.')
          }
        })
        return () => { hls.destroy()
          hlsRef.current = null }
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url
        const onMeta = () => { setLoading(false)
          if (savedPos > 2) video.currentTime = savedPos }
        const onErr = () => setError('Stream load nahi hua.')
        video.addEventListener('loadedmetadata', onMeta)
        video.addEventListener('error', onErr)
        return () => {
          video.removeEventListener('loadedmetadata', onMeta)
          video.removeEventListener('error', onErr)
        }
      } else {
        setError('Is browser mein HLS supported nahi hai.')
        setLoading(false)
      }
    } else {
      video.src = url
      const onMeta = () => { setLoading(false)
        if (savedPos > 2) video.currentTime = savedPos }
      const onErr = () => setError('Video load nahi hua.')
      video.addEventListener('loadedmetadata', onMeta)
      video.addEventListener('error', onErr)
      return () => {
        video.removeEventListener('loadedmetadata', onMeta)
        video.removeEventListener('error', onErr)
      }
    }
  }, [content?.url])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
