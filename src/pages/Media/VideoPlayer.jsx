import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import Hls from 'hls.js'
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, CheckCircle, AlertCircle,
  PictureInPicture2, X, Gauge, Monitor
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

// ─── Custom Player ───────────────────────────────────────────────────────────
function CustomPlayer({ url, savedPos = 0, onProgress, onComplete, title }) {
  const videoRef     = useRef(null)
  const hlsRef       = useRef(null)
  const containerRef = useRef(null)
  const hideTimer    = useRef(null)
  const lastSaved    = useRef(0)
  const seekbarRef   = useRef(null)
  const touchStartRef = useRef(null)
  const touchTimeoutRef = useRef(null)

  const [playing,      setPlaying]      = useState(false)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [buffered,     setBuffered]     = useState(0)
  const [volume,       setVolume]       = useState(1)
  const [muted,        setMuted]        = useState(false)
  const [fullscreen,   setFullscreen]   = useState(false)
  const [pip,          setPip]          = useState(false)
  const [showCtrl,     setShowCtrl]     = useState(true)
  const [showSpeed,    setShowSpeed]    = useState(false)
  const [showQuality,  setShowQuality]  = useState(false)
  const [speed,        setSpeed]        = useState(1)
  const [levels,       setLevels]       = useState([])
  const [currentLevel, setCurrentLevel] = useState(-1)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [doneFired,    setDoneFired]    = useState(false)
  const [skipFlash,    setSkipFlash]    = useState(null)

  // Handle screen orientation for fullscreen
  const handleFullscreenChange = useCallback(() => {
    const isFullscreen = !!document.fullscreenElement
    setFullscreen(isFullscreen)
    // Lock to landscape when entering fullscreen on mobile
    if (isFullscreen && window.screen?.orientation?.lock) {
      // Check if we are on a mobile device (portrait mode likely)
      if (window.innerHeight > window.innerWidth) {
        window.screen.orientation.lock('landscape').catch(() => {})
      }
    } else if (!isFullscreen && window.screen?.orientation?.unlock) {
      window.screen.orientation.unlock()
    }
  }, [])

  // ── HLS / native init ──────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    setError(null); setLoading(true); setLevels([]); setCurrentLevel(-1)
    setPlaying(false); setCurrentTime(0); setDuration(0)

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
        return () => { hls.destroy(); hlsRef.current = null }
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url
        const onMeta = () => { setLoading(false); if (savedPos > 2) video.currentTime = savedPos }
        const onErr  = () => setError('Stream load nahi hua.')
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
      const onMeta = () => { setLoading(false); if (savedPos > 2) video.currentTime = savedPos }
      const onErr  = () => setError('Video load nahi hua.')
      video.addEventListener('loadedmetadata', onMeta)
      video.addEventListener('error', onErr)
      return () => {
        video.removeEventListener('loadedmetadata', onMeta)
        video.removeEventListener('error', onErr)
      }
    }
  }, [url])

  // ── Video event listeners ──────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => {
      setCurrentTime(v.currentTime)
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1))
      if (v.currentTime - lastSaved.current >= 8) {
        lastSaved.current = v.currentTime
        onProgress?.(Math.floor(v.currentTime))
      }
    }
    const onDur   = () => setDuration(v.duration || 0)
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onWait  = () => setLoading(true)
    const onCanP  = () => setLoading(false)
    const onEnd   = () => { if (!doneFired) { setDoneFired(true); onComplete?.() } }
    const onPipE  = () => setPip(true)
    const onPipL  = () => setPip(false)
    const onVol   = () => { setVolume(v.volume); setMuted(v.muted) }

    v.addEventListener('timeupdate',            onTime)
    v.addEventListener('durationchange',        onDur)
    v.addEventListener('play',                  onPlay)
    v.addEventListener('pause',                 onPause)
    v.addEventListener('waiting',               onWait)
    v.addEventListener('playing',               onCanP)
    v.addEventListener('canplay',               onCanP)
    v.addEventListener('ended',                 onEnd)
    v.addEventListener('enterpictureinpicture', onPipE)
    v.addEventListener('leavepictureinpicture', onPipL)
    v.addEventListener('volumechange',          onVol)
    return () => {
      v.removeEventListener('timeupdate',            onTime)
      v.removeEventListener('durationchange',        onDur)
      v.removeEventListener('play',                  onPlay)
      v.removeEventListener('pause',                 onPause)
      v.removeEventListener('waiting',               onWait)
      v.removeEventListener('playing',               onCanP)
      v.removeEventListener('canplay',               onCanP)
      v.removeEventListener('ended',                 onEnd)
      v.removeEventListener('enterpictureinpicture', onPipE)
      v.removeEventListener('leavepictureinpicture', onPipL)
      v.removeEventListener('volumechange',          onVol)
    }
  }, [doneFired])

  // ── Fullscreen ─────────────────────────────────────────────────────────
  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [handleFullscreenChange])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return
      const v = videoRef.current; if (!v) return
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break
        case 'ArrowRight': case 'l': e.preventDefault(); doSkip(10); break
        case 'ArrowLeft':  case 'j': e.preventDefault(); doSkip(-10); break
        case 'ArrowUp':   e.preventDefault(); changeVol(Math.min(1, v.volume + 0.1)); break
        case 'ArrowDown': e.preventDefault(); changeVol(Math.max(0, v.volume - 0.1)); break
        case 'm': toggleMute(); break
        case 'f': toggleFS(); break
        case 'p': togglePip(); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Controls auto-hide ─────────────────────────────────────────────────
  const resetHide = useCallback(() => {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    if (playing) {
      hideTimer.current = setTimeout(() => setShowCtrl(false), 2500)
    }
  }, [playing])

  // ── Touch/Double-click handlers ────────────────────────────────────────────
  const handleVideoClick = (e) => {
    e.stopPropagation()
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current)
      touchTimeoutRef.current = null
      // Double click detected
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      if (x < rect.width / 2) {
        doSkip(-10)
      } else {
        doSkip(10)
      }
    } else {
      touchTimeoutRef.current = setTimeout(() => {
        togglePlay()
        touchTimeoutRef.current = null
      }, 200)
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current; if (!v) return
    v.paused ? v.play() : v.pause()
    resetHide()
  }

  const toggleMute = () => {
    const v = videoRef.current; if (!v) return
    v.muted = !v.muted
  }

  const changeVol = (val) => {
    const v = videoRef.current; if (!v) return
    v.volume = val; v.muted = val === 0
  }

  const doSkip = (secs) => {
    const v = videoRef.current; if (!v) return
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

  const toggleFS = () => {
    const el = containerRef.current
    if (!document.fullscreenElement) {
      el?.requestFullscreen?.()
      // Also try to lock orientation immediately (some browsers may need this)
      if (window.screen?.orientation?.lock && window.innerHeight > window.innerWidth) {
        window.screen.orientation.lock('landscape').catch(() => {})
      }
    } else {
      document.exitFullscreen?.()
    }
  }

  const togglePip = async () => {
    const v = videoRef.current; if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch {}
  }

  const pipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document
  const pct     = duration ? (currentTime / duration) * 100 : 0
  const buffPct = duration ? (buffered   / duration) * 100 : 0

  const qualityLabel = (l) => {
    if (l === -1) return 'Auto'
    const lvl = levels[l]
    if (!lvl) return `Q${l}`
    if (lvl.height) return `${lvl.height}p`
    if (lvl.bitrate) return `${Math.round(lvl.bitrate / 1000)}k`
    return `L${l}`
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const close = () => { setShowSpeed(false); setShowQuality(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full select-none touch-none aspect-video overflow-hidden rounded-2xl"
      onMouseMove={resetHide}
      onMouseLeave={() => { if (videoRef.current && !videoRef.current.paused) setShowCtrl(false) }}
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

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-end pointer-events-none transition-opacity duration-300 ${
          showCtrl || !playing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 75%)',
        }}
      >
        {/* ── Seek bar ── */}
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
            aria-label="Seek"
            aria-valuenow={Math.round(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
          >
            <div className="relative h-1 sm:h-1.5 bg-white/20 rounded-full">
              {/* Buffer */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/20 transition-all"
                style={{ width: `${buffPct}%` }}
              />
              {/* Progress */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-indigo-400 transition-all"
                style={{ width: `${pct}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full shadow-lg transition-all"
                style={{ left: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Controls row ── */}
        <div className="pointer-events-auto flex items-center gap-1 px-2 pb-3 sm:px-3 sm:pb-4 flex-wrap">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-0.5" />}
          </button>

          {/* Skip */}
          <button onClick={() => doSkip(-10)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors">
            <SkipBack size={18} />
          </button>
          <button onClick={() => doSkip(10)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors">
            <SkipForward size={18} />
          </button>

          {/* Volume control */}
          <button onClick={toggleMute} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors">
            {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Volume slider - desktop only */}
          <div className="hidden sm:flex items-center w-20">
            <input
              type="range" min="0" max="1" step="0.05"
              value={muted ? 0 : volume}
              onChange={e => changeVol(parseFloat(e.target.value))}
              aria-label="Volume"
              className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-indigo-400"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Time */}
          <span className="text-xs sm:text-sm font-mono text-white/90 ml-1 whitespace-nowrap tabular-nums flex-shrink-0">
            {fmtTime(currentTime)}
            {duration > 0 && (
              <span className="text-white/40"> / {fmtTime(duration)}</span>
            )}
          </span>

          <div className="flex-1" />

          {/* Speed button */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { setShowSpeed(v => !v); setShowQuality(false) }}
              className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors ${showSpeed ? 'text-indigo-400' : ''}`}
              aria-label="Playback Speed"
            >
              <Gauge size={18} />
              {speed !== 1 && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold bg-indigo-500 text-white px-1 rounded-full">
                  {speed}
                </span>
              )}
            </button>
            {showSpeed && (
              <div
                className="absolute bottom-full right-0 mb-2 w-48 sm:w-56 bg-[#0f0f1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                style={{ maxHeight: '60vh' }}
              >
                <div className="p-2">
                  <div className="text-xs text-white/50 px-2 py-1 font-medium uppercase tracking-wider">Speed</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SPEEDS.map(s => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                          speed === s
                            ? 'bg-indigo-500 text-white'
                            : 'text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quality button (only if HLS has levels) */}
          {levels.length > 0 && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => { setShowQuality(v => !v); setShowSpeed(false) }}
                className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors ${showQuality ? 'text-indigo-400' : ''}`}
                aria-label="Quality"
              >
                <Monitor size={18} />
              </button>
              {showQuality && (
                <div
                  className="absolute bottom-full right-0 mb-2 w-48 sm:w-56 bg-[#0f0f1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                  style={{ maxHeight: '60vh' }}
                >
                  <div className="p-2">
                    <div className="text-xs text-white/50 px-2 py-1 font-medium uppercase tracking-wider">Quality</div>
                    <div className="space-y-1">
                      {[-1, ...levels.map((_, i) => i)].map(l => (
                        <button
                          key={l}
                          onClick={() => changeQuality(l)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentLevel === l
                              ? 'bg-indigo-500 text-white'
                              : 'text-white/70 hover:bg-white/10'
                          }`}
                        >
                          <span>{qualityLabel(l)}</span>
                          {l === -1 && (
                            <span className="text-[10px] text-white/40">Auto</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PiP */}
          {pipSupported && (
            <button
              onClick={togglePip}
              className={`hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors ${pip ? 'text-indigo-400' : ''}`}
              aria-label="Picture in Picture"
            >
              <PictureInPicture2 size={16} />
            </button>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFS}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>

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
        .animate-skipFlash {
          animation: skipFlash 0.65s ease-out forwards;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  )
}

// ─── YouTube Player ──────────────────────────────────────────────────────────
function YouTubePlayer({ url, title }) {
  const ytId    = extractYTId(url)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  const embedSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${window.location.origin}`
    : null

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
          <button
            onClick={() => { setError(false); setLoading(true) }}
            className="text-xs text-white bg-white/10 border border-white/20 rounded-lg px-4 py-1.5"
          >
            Retry
          </button>
        </div>
      )}
      <iframe
        src={embedSrc || liveSrc}
        className="absolute inset-0 w-full h-full border-0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        title={title || 'YouTube Video'}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
      />
    </div>
  )
}

// ─── Animated Button Component ───────────────────────────────────────────────
function AnimatedButton({ onClick, icon: Icon, label, variant = 'primary' }) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = (e) => {
    setIsAnimating(true)
    onClick(e)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const variants = {
    primary: {
      bg: 'linear-gradient(135deg, #10b981, #059669)',
      hoverBg: 'linear-gradient(135deg, #059669, #047857)',
      color: 'white',
      border: 'none'
    },
    secondary: {
      bg: 'rgba(52,211,153,0.08)',
      hoverBg: 'rgba(52,211,153,0.15)',
      color: '#34d399',
      border: '0.5px solid rgba(52,211,153,0.3)'
    }
  }

  const currentVariant = variants[variant]

  return (
    <button
      onClick={handleClick}
      className="relative inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 overflow-hidden active:scale-95"
      style={{
        background: currentVariant.bg,
        color: currentVariant.color,
        border: currentVariant.border,
      }}
      onMouseEnter={(e) => {
        if (variant === 'primary') {
          e.currentTarget.style.background = variants.primary.hoverBg
        } else {
          e.currentTarget.style.background = variants.secondary.hoverBg
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = currentVariant.bg
      }}
    >
      {isAnimating && (
        <div className="absolute inset-0 bg-white/20 animate-ripple" />
      )}
      <Icon size={16} />
      <span>{label}</span>
      <style>{`
        @keyframes ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
        }
        .animate-ripple {
          animation: ripple 0.3s ease-out;
        }
      `}</style>
    </button>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
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

  const content  = data?.content
  const savedPos = progressData?.progress?.position || 0
  const isCompleted = progressData?.progress?.completed

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full border-3 border-indigo-400/20 border-t-indigo-400 animate-spin" />
    </div>
  )

  if (!content) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <AlertCircle size={40} className="text-red-400" />
      <p className="text-secondary text-sm">Content nahi mila.</p>
      <button
        onClick={() => navigate(-1)}
        className="text-indigo-400 text-sm font-medium hover:underline"
      >
        Wapas jao
      </button>
    </div>
  )

  const isYT = isYouTubeURL(content.url)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a14] to-[#14141e] py-4 px-3 sm:py-6 sm:px-6">
      <div className="max-w-3xl mx-auto w-full">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        {/* Title & metadata */}
        <div className="mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-white leading-tight">
            {content.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {content.duration && (
              <span className="text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded-md">
                {fmtTime(content.duration)}
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">
                <CheckCircle size={12} /> Completed
              </span>
            )}
          </div>
        </div>

        {/* Player */}
        <div className="rounded-2xl overflow-hidden bg-black shadow-2xl shadow-indigo-500/5">
          {isYT
            ? <YouTubePlayer url={content.url} title={content.title} />
            : (
              <CustomPlayer
                url={content.url}
                savedPos={savedPos}
                title={content.title}
                onProgress={pos => saveProg.mutate({ position: pos, subjectId: content.subjectId })}
                onComplete={() => saveProg.mutate({ completed: true, position: 0, subjectId: content.subjectId })}
              />
            )
          }
        </div>

        {/* Description */}
        {content.description && (
          <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-sm text-white/70 leading-relaxed">
              {content.description}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {!isCompleted && (
            <AnimatedButton
              onClick={() => saveProg.mutate({ completed: true, position: 0, subjectId: content.subjectId })}
              icon={CheckCircle}
              label="Mark as Complete"
              variant="primary"
            />
          )}
          {isCompleted && (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-sm font-semibold">
              <CheckCircle size={16} />
              <span>Course Completed! 🎉</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer
