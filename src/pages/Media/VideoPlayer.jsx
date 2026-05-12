import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import Hls from 'hls.js'
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, CheckCircle, AlertCircle,
  PictureInPicture2, X
} from 'lucide-react'
import api from '../../api/axios'

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${m}:${String(sec).padStart(2,'0')}`
}

// All YouTube URL formats: watch, youtu.be, embed, shorts, live, channel live
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
  // Match .m3u8 in path or query params, or explicit hls type hints
  return /\.m3u8(\?|#|$)/i.test(url) ||
    /[?&]type=hls/i.test(url) ||
    /\/hls\//i.test(url)
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3]

// ─── Custom Player ─────────────────────────────────────────────────────────
function CustomPlayer({ url, savedPos = 0, onProgress, onComplete, title }) {
  const videoRef     = useRef(null)
  const hlsRef       = useRef(null)
  const containerRef = useRef(null)
  const hideTimer    = useRef(null)
  const lastSaved    = useRef(0)

  const [playing,      setPlaying]      = useState(false)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [buffered,     setBuffered]     = useState(0)
  const [volume,       setVolume]       = useState(1)
  const [muted,        setMuted]        = useState(false)
  const [fullscreen,   setFullscreen]   = useState(false)
  const [pip,          setPip]          = useState(false)
  const [showCtrl,     setShowCtrl]     = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab,  setSettingsTab]  = useState('speed')
  const [speed,        setSpeed]        = useState(1)
  const [levels,       setLevels]       = useState([])
  const [currentLevel, setCurrentLevel] = useState(-1)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [doneFired,    setDoneFired]    = useState(false)
  const [skipFlash,    setSkipFlash]    = useState(null) // {dir, ts}

  // ── HLS / native init ─────────────────────────────────────────────────
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
            if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad()
            } else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError()
            } else {
              setError('Stream failed to load. Check HLS URL or CORS settings.')
            }
          }
        })
        return () => { hls.destroy(); hlsRef.current = null }
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari / iOS)
        video.src = url
        const onMeta = () => { setLoading(false); if (savedPos > 2) video.currentTime = savedPos }
        const onErr  = () => setError('Stream failed to load.')
        video.addEventListener('loadedmetadata', onMeta)
        video.addEventListener('error', onErr)
        return () => {
          video.removeEventListener('loadedmetadata', onMeta)
          video.removeEventListener('error', onErr)
        }
      } else {
        setError('HLS playback is not supported in this browser.')
        setLoading(false)
      }
    } else {
      video.src = url
      const onMeta = () => { setLoading(false); if (savedPos > 2) video.currentTime = savedPos }
      const onErr  = () => setError('Video failed to load.')
      video.addEventListener('loadedmetadata', onMeta)
      video.addEventListener('error', onErr)
      return () => {
        video.removeEventListener('loadedmetadata', onMeta)
        video.removeEventListener('error', onErr)
      }
    }
  }, [url])

  // ── Event listeners ───────────────────────────────────────────────────
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

  // ── Fullscreen listener ───────────────────────────────────────────────
  useEffect(() => {
    const onFS = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFS)
    return () => document.removeEventListener('fullscreenchange', onFS)
  }, [])

  // ── Keyboard ──────────────────────────────────────────────────────────
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

  // ── Controls hide ─────────────────────────────────────────────────────
  const resetHide = useCallback(() => {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    if (playing) {
      hideTimer.current = setTimeout(() => {
        setShowCtrl(false)
      }, 2000) // Reduced from 3000 to 2000 for faster hide
    }
  }, [playing])

  // ── Actions ───────────────────────────────────────────────────────────
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
    setTimeout(() => setSkipFlash(null), 600)
  }

  const onSeekClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    if (videoRef.current) videoRef.current.currentTime = pct * duration
  }

  const onSeekTouch = (e) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width))
    if (videoRef.current) videoRef.current.currentTime = pct * duration
  }

  const changeSpeed = (s) => {
    setSpeed(s)
    if (videoRef.current) videoRef.current.playbackRate = s
    setShowSettings(false)
  }

  const changeQuality = (level) => {
    if (hlsRef.current) hlsRef.current.currentLevel = level
    setCurrentLevel(level)
    setShowSettings(false)
  }

  const toggleFS = () => {
    const el = containerRef.current
    if (!document.fullscreenElement) el?.requestFullscreen?.()
    else document.exitFullscreen?.()
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

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full select-none touch-none"
      style={{ aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden' }}
      onMouseMove={resetHide}
      onMouseLeave={() => { if (videoRef.current && !videoRef.current.paused) setShowCtrl(false) }}
      onTouchStart={resetHide}
    >
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
      />

      {/* Loading */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-white text-sm text-center px-6">{error}</p>
          <button
            className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-white transition-all"
            onClick={() => window.location.reload()}
          >Retry</button>
        </div>
      )}

      {/* Skip flash */}
      {skipFlash && (
        <div
          key={skipFlash.ts}
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-0.5 transition-opacity ${skipFlash.dir === 'right' ? 'right-6 sm:right-10' : 'left-6 sm:left-10'}`}
          style={{ animation: 'fadeout 0.6s forwards' }}
        >
          <span className="text-white text-2xl font-black leading-none">{skipFlash.dir === 'right' ? '▶▶' : '◀◀'}</span>
          <span className="text-white/80 text-xs font-semibold">10s</span>
        </div>
      )}

      {/* Tap zone - only when controls hidden */}
      {!showCtrl && (
        <div className="absolute inset-0" onClick={togglePlay} />
      )}

      {/* Gradient + controls */}
      <div
        className={`absolute inset-0 flex flex-col justify-end pointer-events-none transition-opacity duration-200 ${showCtrl || !playing ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 45%, transparent 72%)' }}
      >
        {/* Seek bar */}
        <div className="pointer-events-auto px-3 sm:px-4 pb-1">
          <div
            className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/seek"
            onClick={onSeekClick}
            onTouchMove={onSeekTouch}
          >
            <div className="absolute inset-y-0 left-0 bg-white/25 rounded-full transition-all" style={{ width: `${buffPct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover/seek:opacity-100 transition-all"
              style={{ left: `calc(${pct}% - 7px)` }}
            />
          </div>
        </div>

        {/* Controls row */}
        <div className="pointer-events-auto flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 pb-2 sm:pb-3">

          {/* Play/Pause */}
          <button onClick={togglePlay} className="ctrl-btn">
            {playing ? <Pause size={17} className="fill-current" /> : <Play size={17} className="fill-current ml-px" />}
          </button>

          {/* Skip */}
          <button onClick={() => doSkip(-10)} className="ctrl-btn"><SkipBack size={15} /></button>
          <button onClick={() => doSkip(10)}  className="ctrl-btn"><SkipForward size={15} /></button>

          {/* Volume (desktop) */}
          <button onClick={toggleMute} className="ctrl-btn hidden sm:flex">
            {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range" min="0" max="1" step="0.05"
            value={muted ? 0 : volume}
            onChange={e => changeVol(parseFloat(e.target.value))}
            className="hidden sm:block w-16 lg:w-20 accent-primary-500 cursor-pointer"
            onClick={e => e.stopPropagation()}
          />

          {/* Time */}
          <span className="text-white text-[10px] sm:text-xs font-mono ml-1 tabular-nums whitespace-nowrap shrink-0">
            {fmtTime(currentTime)}
            {duration > 0 && <span className="text-white/40"> / {fmtTime(duration)}</span>}
          </span>

          <div className="flex-1" />

          {/* Speed badge */}
          {speed !== 1 && (
            <span className="text-[10px] bg-primary-500/25 text-primary-300 px-1.5 py-0.5 rounded font-mono shrink-0 hidden sm:inline">
              {speed}x
            </span>
          )}

          {/* PiP */}
          {pipSupported && (
            <button onClick={togglePip} className={`ctrl-btn ${pip ? 'text-primary-400' : ''}`}>
              <PictureInPicture2 size={14} />
            </button>
          )}

          {/* Settings */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowSettings(v => !v) }}
              className={`ctrl-btn ${showSettings ? 'text-primary-400' : ''}`}
            >
              <Settings size={14} />
            </button>

            {showSettings && (
              <div
                className="absolute bottom-11 right-0 w-56 bg-gray-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Tabs */}
                <div className="flex border-b border-white/10 relative">
                  <button
                    onClick={() => setSettingsTab('speed')}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-all ${settingsTab === 'speed' ? 'text-primary-400' : 'text-gray-500 hover:text-gray-300'}`}
                  >Speed</button>
                  {levels.length > 0 && (
                    <button
                      onClick={() => setSettingsTab('quality')}
                      className={`flex-1 py-2.5 text-xs font-semibold transition-all ${settingsTab === 'quality' ? 'text-primary-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >Quality</button>
                  )}
                  <button onClick={() => setShowSettings(false)} className="absolute right-2 top-2 text-gray-600 hover:text-white transition-colors">
                    <X size={12} />
                  </button>
                </div>

                {settingsTab === 'speed' && (
                  <div className="p-2 grid grid-cols-4 gap-1">
                    {SPEEDS.map(s => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`py-2 rounded-xl text-xs font-semibold transition-all active:scale-90 ${speed === s ? 'bg-primary-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                      >{s}x</button>
                    ))}
                  </div>
                )}

                {settingsTab === 'quality' && levels.length > 0 && (
                  <div className="p-2 space-y-0.5 max-h-48 overflow-y-auto">
                    {[-1, ...levels.map((_, i) => i)].map(l => (
                      <button
                        key={l}
                        onClick={() => changeQuality(l)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${currentLevel === l ? 'bg-primary-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                      >
                        <span>{qualityLabel(l)}</span>
                        {l === -1 && <span className={`text-[10px] ${currentLevel === l ? 'text-white/60' : 'text-gray-600'}`}>recommended</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFS} className="ctrl-btn">
            {fullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      {/* PiP indicator */}
      {pip && (
        <div className="absolute top-3 left-3 bg-primary-600/80 backdrop-blur text-white text-xs px-2.5 py-1 rounded-lg font-medium pointer-events-none">
          PiP active
        </div>
      )}

      <style>{`
        .ctrl-btn {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          color: white; border-radius: 8px;
          transition: color 0.15s, transform 0.1s, background 0.15s;
          flex-shrink: 0;
        }
        .ctrl-btn:hover { color: rgb(129,140,248); background: rgba(255,255,255,0.08); }
        .ctrl-btn:active { transform: scale(0.88); }
        @keyframes fadeout { 0%{opacity:1} 60%{opacity:1} 100%{opacity:0} }
        @media(min-width:640px){ .ctrl-btn{ width:36px; height:36px; } }
      `}</style>
    </div>
  )
}

// ─── YouTube Player ────────────────────────────────────────────────────────
function YouTubePlayer({ url, title }) {
  const ytId = extractYTId(url)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const embedSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${window.location.origin}`
    : null

  // Live channel or custom live URL — try direct embed
  const liveSrc = !ytId && url

  useEffect(() => {
    // Listen for YouTube iframe messages for keyboard support
    const handleMessage = (e) => {
      if (e.origin !== 'https://www.youtube.com') return
      try {
        const data = JSON.parse(e.data)
        // YouTube API events
        if (data.event === 'infoDelivery' && data.info) {
          setLoading(false)
        }
      } catch {}
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  if (!embedSrc && !liveSrc) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center" style={{ aspectRatio: '16/9' }}>
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-gray-400 text-sm">Could not parse YouTube URL</p>
        <p className="text-gray-600 text-xs break-all max-w-xs">{url}</p>
      </div>
    )
  }

  return (
    <div className="relative" style={{ aspectRatio: '16/9' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="w-12 h-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-center">
            <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm mb-2">Failed to load video</p>
            <button
              onClick={() => { setError(false); setLoading(true) }}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-white transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      <iframe
        src={embedSrc || liveSrc}
        className="w-full h-full absolute inset-0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        title={title || 'YouTube Video'}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        style={{ border: 'none' }}
      />
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
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

  const isYT = isYouTubeURL(content.url)

  return (
    <div className="max-w-4xl mx-auto w-full px-0 sm:px-0">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-3 transition-colors text-sm"
      >
        <ArrowLeft size={17} /> Back
      </button>

      <h1 className="text-base sm:text-xl font-bold text-white mb-3 leading-snug">
        {content.title}
      </h1>

      {/* Player */}
      <div className="w-full rounded-2xl overflow-hidden bg-black shadow-2xl mb-4">
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

      {content.description && (
        <p className="text-gray-400 text-sm leading-relaxed mb-4">{content.description}</p>
      )}

      <button
        onClick={() => saveProg.mutate({ completed: true, position: 0, subjectId: content.subjectId })}
        className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 px-4 py-2.5 rounded-xl transition-all active:scale-95"
      >
        <CheckCircle size={15} /> Mark as Complete
      </button>
    </div>
  )
}

export default VideoPlayer