import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import Hls from 'hls.js'
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, CheckCircle, AlertCircle, XCircle, FileText, ChevronUp,
  PictureInPicture2, Monitor, Gauge, Settings, X
} from 'lucide-react'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'

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

// ─── HLS Custom Player ───────────────────────────────────────────────────────
function HLSPlayer({ url, onEnded }) {
  const videoRef     = useRef(null)
  const hlsRef       = useRef(null)
  const containerRef = useRef(null)
  const hideTimer    = useRef(null)

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
  const [skipFlash,    setSkipFlash]    = useState(null)

  // HLS init
  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    setError(null); setLoading(true); setLevels([]); setCurrentLevel(-1)
    setPlaying(false); setCurrentTime(0); setDuration(0)

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false, backBufferLength: 90 })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, (_, d) => {
        setLevels(d.levels)
        setLoading(false)
      })
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, d) => setCurrentLevel(d.level))
      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal) {
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
          else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
          else setError('Stream failed to load. Check URL or CORS settings.')
        }
      })
      return () => { hls.destroy(); hlsRef.current = null }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      const onMeta = () => setLoading(false)
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
  }, [url])

  // Video events
  useEffect(() => {
    const v = videoRef.current; if (!v) return
    const onTime  = () => {
      setCurrentTime(v.currentTime)
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1))
    }
    const onDur   = () => setDuration(v.duration || 0)
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onWait  = () => setLoading(true)
    const onCanP  = () => setLoading(false)
    const onEnd   = () => onEnded?.()
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
  }, [onEnded])

  // Fullscreen listener
  useEffect(() => {
    const onFS = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFS)
    return () => document.removeEventListener('fullscreenchange', onFS)
  }, [])

  // Controls auto-hide
  const resetHide = useCallback(() => {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    if (playing) {
      hideTimer.current = setTimeout(() => setShowCtrl(false), 2500)
    }
  }, [playing])

  useEffect(() => { resetHide() }, [playing, resetHide])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
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
        case '>': {
          const idx = SPEEDS.indexOf(speed)
          if (idx < SPEEDS.length - 1) changeSpeed(SPEEDS[idx + 1])
          break
        }
        case '<': {
          const idx = SPEEDS.indexOf(speed)
          if (idx > 0) changeSpeed(SPEEDS[idx - 1])
          break
        }
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [speed])

  // Actions
  const togglePlay = () => {
    const v = videoRef.current; if (!v) return
    v.paused ? v.play() : v.pause()
    resetHide()
  }
  const toggleMute    = () => { const v = videoRef.current; if (v) v.muted = !v.muted }
  const changeVol     = (val) => { const v = videoRef.current; if (!v) return; v.volume = val; v.muted = val === 0 }
  const doSkip        = (secs) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = Math.max(0, Math.min(v.currentTime + secs, v.duration || 0))
    setSkipFlash({ dir: secs > 0 ? 'right' : 'left', ts: Date.now() })
    setTimeout(() => setSkipFlash(null), 600)
  }
  const onSeekClick   = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    if (videoRef.current) videoRef.current.currentTime = pct * duration
  }
  const onSeekTouch   = (e) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width))
    if (videoRef.current) videoRef.current.currentTime = pct * duration
  }
  const changeSpeed   = (s) => {
    setSpeed(s)
    if (videoRef.current) videoRef.current.playbackRate = s
    setShowSettings(false)
  }
  const changeQuality = (level) => {
    if (hlsRef.current) hlsRef.current.currentLevel = level
    setCurrentLevel(level)
    setShowSettings(false)
  }
  const toggleFS      = () => {
    const el = containerRef.current
    if (!document.fullscreenElement) el?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }
  const togglePip     = async () => {
    const v = videoRef.current; if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch {}
  }

  const pct          = duration ? (currentTime / duration) * 100 : 0
  const buffPct      = duration ? (buffered   / duration) * 100 : 0
  const pipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document

  const qualityLabel = (l) => {
    if (l === -1) return 'Auto'
    const lvl = levels[l]
    if (!lvl) return `Q${l}`
    if (lvl.height)  return `${lvl.height}p`
    if (lvl.bitrate) return `${Math.round(lvl.bitrate / 1000)}k`
    return `L${l}`
  }

  return (
    <div className="relative w-full bg-black" style={{ paddingTop: '56.25%', borderRadius: '12px', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        className="absolute inset-0 select-none touch-none"
        onMouseMove={resetHide}
        onMouseLeave={() => { if (videoRef.current && !videoRef.current.paused) setShowCtrl(false) }}
        onTouchStart={resetHide}
      >
      <video ref={videoRef} className="w-full h-full object-contain" playsInline preload="metadata" />

      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85">
          <XCircle size={32} className="text-red-400" />
          <p className="text-white text-sm text-center px-6">{error}</p>
          <button className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-white"
            onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {skipFlash && (
        <div
          key={skipFlash.ts}
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-0.5
            ${skipFlash.dir === 'right' ? 'right-8' : 'left-8'}`}
          style={{ animation: 'mc-fadeout 0.6s forwards' }}
        >
          <span className="text-white text-3xl font-black">{skipFlash.dir === 'right' ? '▶▶' : '◀◀'}</span>
          <span className="text-white/80 text-xs font-semibold">10s</span>
        </div>
      )}

      {speed !== 1 && (
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded-lg font-mono pointer-events-none">
          {speed}x
        </div>
      )}

      {pip && (
        <div className="absolute top-3 right-3 bg-primary-600/80 backdrop-blur text-white text-xs px-2.5 py-1 rounded-lg font-medium pointer-events-none">
          PiP
        </div>
      )}

      {!showCtrl && <div className="absolute inset-0" onClick={togglePlay} />}

      <div
        className={`absolute inset-0 flex flex-col justify-end pointer-events-none transition-opacity duration-200
          ${showCtrl || !playing ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.2) 50%, transparent 75%)' }}
      >
        <div className="pointer-events-auto px-3 sm:px-4 pb-1">
          <div
            className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/seek"
            onClick={onSeekClick}
            onTouchMove={onSeekTouch}
          >
            <div className="absolute inset-y-0 left-0 bg-white/25 rounded-full" style={{ width: `${buffPct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow opacity-0 group-hover/seek:opacity-100 transition-all"
              style={{ left: `calc(${pct}% - 7px)` }}
            />
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 pb-2 sm:pb-3">
          <button onClick={togglePlay} className="mc-btn">
            {playing ? <Pause size={17} className="fill-current" /> : <Play size={17} className="fill-current ml-px" />}
          </button>
          <button onClick={() => doSkip(-10)} className="mc-btn"><SkipBack size={15} /></button>
          <button onClick={() => doSkip(10)} className="mc-btn"><SkipForward size={15} /></button>
          <button onClick={toggleMute} className="mc-btn hidden sm:flex">
            {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range" min="0" max="1" step="0.05"
            value={muted ? 0 : volume}
            onChange={e => changeVol(parseFloat(e.target.value))}
            className="hidden sm:block w-16 lg:w-20 accent-primary-500 cursor-pointer"
            onClick={e => e.stopPropagation()}
          />
          <span className="text-white text-[10px] sm:text-xs font-mono ml-1 tabular-nums whitespace-nowrap shrink-0">
            {fmtTime(currentTime)}
            {duration > 0 && <span className="text-white/40"> / {fmtTime(duration)}</span>}
          </span>
          <div className="flex-1" />
          {pipSupported && (
            <button onClick={togglePip} className={`mc-btn ${pip ? 'text-primary-400' : ''}`}>
              <PictureInPicture2 size={14} />
            </button>
          )}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowSettings(v => !v) }}
              className={`mc-btn ${showSettings ? 'text-primary-400' : ''}`}
            >
              <Settings size={14} />
            </button>
            {showSettings && (
              <div
                className="absolute bottom-12 right-0 w-60 bg-gray-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex border-b border-white/10 relative">
                  <button
                    onClick={() => setSettingsTab('speed')}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-all
                      ${settingsTab === 'speed' ? 'text-primary-400' : 'text-gray-500 hover:text-gray-300'}`}
                  >Speed</button>
                  {levels.length > 0 && (
                    <button
                      onClick={() => setSettingsTab('quality')}
                      className={`flex-1 py-2.5 text-xs font-semibold transition-all
                        ${settingsTab === 'quality' ? 'text-primary-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >Quality</button>
                  )}
                  <button onClick={() => setShowSettings(false)} className="absolute right-2 top-2.5 text-gray-600 hover:text-white">
                    <X size={12} />
                  </button>
                </div>
                {settingsTab === 'speed' && (
                  <div className="p-2 grid grid-cols-4 gap-1">
                    {SPEEDS.map(s => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`py-2 rounded-xl text-xs font-semibold transition-all active:scale-90
                          ${speed === s ? 'bg-primary-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                      >{s}x</button>
                    ))}
                  </div>
                )}
                {settingsTab === 'quality' && levels.length > 0 && (
                  <div className="p-2 space-y-0.5 max-h-52 overflow-y-auto">
                    {[-1, ...levels.map((_, i) => i)].map(l => (
                      <button
                        key={l}
                        onClick={() => changeQuality(l)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95
                          ${currentLevel === l ? 'bg-primary-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                      >
                        <span>{qualityLabel(l)}</span>
                        {l === -1 && (
                          <span className={`text-[10px] ${currentLevel === l ? 'text-white/60' : 'text-gray-600'}`}>
                            recommended
                          </span>
                        )}
                        {currentLevel === l && l !== -1 && <CheckCircle size={11} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={toggleFS} className="mc-btn">
            {fullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      <style>{`
        .mc-btn {
          width:32px; height:32px; display:flex; align-items:center; justify-content:center;
          color:white; border-radius:8px; transition:color .15s,transform .1s,background .15s; flex-shrink:0;
        }
        .mc-btn:hover { color:rgb(129,140,248); background:rgba(255,255,255,0.08); }
        .mc-btn:active { transform:scale(0.88); }
        @keyframes mc-fadeout { 0%{opacity:1} 60%{opacity:1} 100%{opacity:0} }
        @media(min-width:640px){ .mc-btn{ width:36px; height:36px; } }
      `}</style>
      </div>
    </div>
  )
}

// ─── YouTube Player + overlay controls ──────────────────────────────────────
function YouTubePlayer({ url, onEnded }) {
  const ytId         = extractYTId(url)
  const containerRef = useRef(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [loading,    setLoading]    = useState(true)

  const embedSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    : null

  useEffect(() => {
    const onFS = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFS)
    return () => document.removeEventListener('fullscreenchange', onFS)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.key === 'f') toggleFS()
      if (e.key === 'p') openPopup()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ytId])

  const toggleFS  = () => {
    const el = containerRef.current
    if (!document.fullscreenElement) el?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }
  const openPopup = () => {
    if (ytId) window.open(`https://www.youtube.com/watch?v=${ytId}`, '_blank', 'width=854,height=480,resizable=yes')
  }

  if (!embedSrc) return (
    <div className="relative w-full bg-black" style={{ paddingTop: '56.25%', borderRadius: '12px', overflow: 'hidden' }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <XCircle size={28} className="text-red-400" />
        <p className="text-gray-400 text-sm">Could not parse YouTube URL</p>
      </div>
    </div>
  )

  return (
    <div ref={containerRef} className="relative w-full bg-black" style={{ paddingTop: '56.25%', borderRadius: '12px', overflow: 'hidden' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10 rounded-xl">
          <div className="w-12 h-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
        </div>
      )}
      <iframe
        src={embedSrc}
        className="w-full h-full absolute inset-0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        title="YouTube Video"
        onLoad={() => setLoading(false)}
        style={{ border: 'none' }}
      />
      <div className="absolute top-2 right-2 z-20 flex gap-1.5">
        <button onClick={openPopup} title="Open in popup (P)" className="yt-obtn">
          <PictureInPicture2 size={14} />
        </button>
        <button onClick={toggleFS} title="Fullscreen (F)" className="yt-obtn">
          {fullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>
      </div>
      <div className="absolute bottom-2 left-2 z-20 text-[10px] text-white/25 pointer-events-none select-none hidden sm:block">
        F = Fullscreen &nbsp;·&nbsp; P = Popup window
      </div>
      <style>{`
        .yt-obtn {
          display:flex; align-items:center; justify-content:center;
          width:30px; height:30px; border-radius:8px;
          background:rgba(0,0,0,0.65); backdrop-filter:blur(6px);
          color:white; transition:background .15s, transform .1s;
        }
        .yt-obtn:hover  { background:rgba(0,0,0,0.9); }
        .yt-obtn:active { transform:scale(0.88); }
      `}</style>
    </div>
  )
}

// ─── Keyboard shortcut legend ────────────────────────────────────────────────
function KeyboardHelp({ isYT }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative hidden sm:inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1 transition-colors"
      >
        <span>⌨ Keyboard shortcuts</span>
        <ChevronUp size={12} className={`transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && (
        <div className="absolute bottom-7 left-0 bg-gray-900 border border-white/10 rounded-xl p-3 text-xs text-gray-300 w-64 z-30 shadow-2xl space-y-1.5">
          {isYT ? (
            <>
              <KRow k="F"   v="Fullscreen" />
              <KRow k="P"   v="Open in popup" />
            </>
          ) : (
            <>
              <KRow k="Space / K"  v="Play / Pause" />
              <KRow k="← / J"      v="Back 10s" />
              <KRow k="→ / L"      v="Forward 10s" />
              <KRow k="↑ / ↓"      v="Volume ±10%" />
              <KRow k="M"          v="Mute toggle" />
              <KRow k="F"          v="Fullscreen" />
              <KRow k="P"          v="Picture in Picture" />
              <KRow k="> / <"      v="Speed up / down" />
            </>
          )}
        </div>
      )}
    </div>
  )
}
function KRow({ k, v }) {
  return (
    <div className="flex justify-between gap-4">
      <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0">{k}</kbd>
      <span className="text-gray-400 text-right">{v}</span>
    </div>
  )
}

// ─── Inline PDF Viewer ───────────────────────────────────────────────────────
function InlinePDFViewer({ url, title }) {
  const [mode,    setMode]    = useState('google')
  const [loading, setLoading] = useState(true)

  const googleUrl = url ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true` : ''
  const directUrl = url ? `${url}#toolbar=1&navpanes=1` : ''
  const iframeSrc = mode === 'google' ? googleUrl : directUrl

  const handleLoad  = () => setLoading(false)
  const handleError = () => {
    setLoading(false)
    if (mode === 'google') { setMode('direct'); setLoading(true) }
    else setMode('error')
  }

  if (!url) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 bg-dark-800 rounded-xl mb-8">
      <p className="text-gray-400 text-sm">No PDF URL provided.</p>
    </div>
  )

  if (mode === 'error') return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 bg-dark-800 rounded-xl mb-8 border border-white/5">
      <p className="text-gray-400 text-sm text-center px-6">PDF could not be displayed in browser.</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 px-5 py-2.5 rounded-xl transition-all"
      >
        Open PDF in new tab
      </a>
    </div>
  )

  return (
    <div className="relative w-full mb-8">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2 px-1">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-[11px] sm:text-xs text-gray-500">Viewer:</span>
          <button
            onClick={() => { setMode('google'); setLoading(true) }}
            className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg transition-all ${mode === 'google' ? 'bg-primary-500/20 text-primary-300' : 'text-gray-500 hover:text-gray-300'}`}
          >Google Docs</button>
          <button
            onClick={() => { setMode('direct'); setLoading(true) }}
            className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg transition-all ${mode === 'direct' ? 'bg-primary-500/20 text-primary-300' : 'text-gray-500 hover:text-gray-300'}`}
          >Direct</button>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] sm:text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >Open in tab ↗</a>
      </div>
      <div className="relative h-[60vh] sm:h-[75vh] w-full bg-dark-800 rounded-lg sm:rounded-xl overflow-hidden border border-white/5">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-800 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
              <p className="text-gray-500 text-xs">Loading PDF{mode === 'google' ? ' via Google Docs' : ''}...</p>
            </div>
          </div>
        )}
        <iframe
          key={mode}
          src={iframeSrc}
          className="w-full h-full"
          title={title || 'PDF Viewer'}
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          allow="fullscreen"
        />
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT (only once) ──────────────────────────────────────────────
export default function MediaContent() {
  const { courseId, subjectId, contentId, chapterId: paramChapterId } = useParams()
  const [searchParams] = useSearchParams()
  const searchChapterId = searchParams.get('chapterId')
  const chapterId = paramChapterId || searchChapterId
  const navigate  = useNavigate()
  const user      = useAuthStore(s => s.user)

  const { data: contentData, isLoading, isError } = useQuery({
    queryKey: ['content-detail', contentId, chapterId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (chapterId) params.set('chapterId', chapterId)
      if (subjectId)  params.set('subjectId', subjectId)
      return api.get(`/content/${contentId}?${params.toString()}`).then(r => r.data)
    },
    enabled: !!contentId,
  })

  const markCompletedMutation = useMutation({
    mutationFn: () => api.post(`/user/progress/${contentId}/complete`, { subjectId, courseId }),
    onSuccess: () => console.log('Marked complete'),
    onError:   (err) => console.error('Mark complete failed:', err),
  })

  const handleEnded = useCallback(() => {
    if (user) markCompletedMutation.mutate()
  }, [user, markCompletedMutation])

  const content = contentData?.content || null

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (isError) return (
    <div className="flex flex-col items-center py-20 gap-3 text-center">
      <XCircle size={36} className="text-red-400" />
      <p className="text-gray-400">Could not load content. Please try again.</p>
      <button onClick={() => navigate(-1)} className="btn-primary text-sm">Go Back</button>
    </div>
  )
  if (!content) return (
    <div className="flex flex-col items-center py-20 gap-3 text-center">
      <FileText size={36} className="text-gray-600" />
      <p className="text-gray-400">Content not found.</p>
      <button onClick={() => navigate(-1)} className="btn-primary text-sm">Go Back</button>
    </div>
  )

  const backUrl = chapterId
    ? `/courses/${courseId}/subjects/${subjectId}/chapters/${chapterId}`
    : `/courses/${courseId}/subjects/${subjectId}`

  const isYT  = isYouTubeURL(content.url)
  const isHLS = !isYT && (isHLSURL(content.url) || content.type === 'hls')

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-0">
      <button onClick={() => navigate(backUrl)} className="text-primary-400 hover:text-primary-300 flex items-center gap-1 mb-3 sm:mb-4 text-xs sm:text-sm">
        <ArrowLeft size={15} className="sm:w-4 sm:h-4" /> {chapterId ? 'Back to Chapter' : 'Back to Subject'}
      </button>

      <h1 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-4 leading-snug">{content.title}</h1>
      {content.description && <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">{content.description}</p>}

      {(content.type === 'video' || content.type === 'hls') && (
        <>
          <div className="w-full rounded-lg sm:rounded-xl overflow-hidden bg-black shadow-2xl mb-2">
            {isYT
              ? <YouTubePlayer url={content.url} onEnded={handleEnded} />
              : isHLS
                ? <HLSPlayer url={content.url} onEnded={handleEnded} />
                : (
                  <video controls playsInline className="w-full aspect-video" onEnded={handleEnded}>
                    <source src={content.url} type="video/mp4" />
                  </video>
                )
            }
          </div>
          <div className="flex justify-end mb-4 sm:mb-6">
            <KeyboardHelp isYT={isYT} />
          </div>
        </>
      )}

      {content.type === 'pdf' && (
        <InlinePDFViewer url={content.url} title={content.title} />
      )}
    </div>
  )
}
