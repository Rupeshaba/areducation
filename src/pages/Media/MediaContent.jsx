import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import Hls from 'hls.js'
import {
  ChevronLeft, Play, Pause, Volume2, VolumeX,
  SkipBack, SkipForward, Settings, X, CheckCircle, AlertTriangle,
  PictureInPicture2, ExternalLink,
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
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`
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

// Try to go fullscreen + lock landscape. Falls back silently where unsupported (iOS etc.)
async function goFullscreenLandscape(el, videoEl) {
  try {
    if (!document.fullscreenElement) {
      await (el?.requestFullscreen?.() || el?.webkitRequestFullscreen?.())
    }
  } catch (e) { /* ignore */ }
  try {
    if (window.screen?.orientation?.lock) {
      await window.screen.orientation.lock('landscape')
    }
  } catch (e) { /* not supported / not allowed outside fullscreen */ }
  // iOS Safari: element fullscreen mostly unsupported — use native video fullscreen
  // which auto-rotates to landscape for landscape-sized videos.
  if (!document.fullscreenElement && videoEl?.webkitEnterFullscreen) {
    try { videoEl.webkitEnterFullscreen() } catch (e) { /* ignore */ }
  }
}

function exitFullscreenAndUnlock() {
  try { if (document.fullscreenElement) document.exitFullscreen?.() } catch (e) {}
  try { window.screen?.orientation?.unlock?.() } catch (e) {}
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

// ─── Native / HLS video stage (fills the entire screen, no chrome around it) ─
function NativeVideoStage({ content, onEnded, onBack, contentId }) {
  const videoRef      = useRef(null)
  const hlsRef        = useRef(null)
  const containerRef  = useRef(null)
  const hideTimer      = useRef(null)
  const touchTimeoutRef = useRef(null)

  const [started,     setStarted]     = useState(false)
  const [playing,      setPlaying]      = useState(false)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [buffered,     setBuffered]     = useState(0)
  const [volume,       setVolume]       = useState(1)
  const [muted,        setMuted]        = useState(false)
  const [showCtrl,     setShowCtrl]     = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab,  setSettingsTab]  = useState('speed')
  const [speed,        setSpeed]        = useState(1)
  const [levels,       setLevels]       = useState([])
  const [currentLevel, setCurrentLevel] = useState(-1)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [skipFlash,    setSkipFlash]    = useState(null)

  const url = content.url

  // Setup source (HLS or plain mp4) as soon as we mount so it's ready to play instantly on tap.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    setError(null); setLoading(true); setLevels([]); setCurrentLevel(-1)

    if (isHLSURL(url)) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, backBufferLength: 90 })
        hlsRef.current = hls
        hls.loadSource(url)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, (_, d) => { setLevels(d.levels); setLoading(false) })
        hls.on(Hls.Events.LEVEL_SWITCHED, (_, d) => setCurrentLevel(d.level))
        hls.on(Hls.Events.ERROR, (_, d) => {
          if (d.fatal) {
            if (d.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
            else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
            else setError('Stream load nahi hua.')
          }
        })
        return () => { hls.destroy(); hlsRef.current = null }
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url
        const onMeta = () => setLoading(false)
        const onErr  = () => setError('Stream load nahi hua.')
        video.addEventListener('loadedmetadata', onMeta)
        video.addEventListener('error', onErr)
        return () => {
          video.removeEventListener('loadedmetadata', onMeta)
          video.removeEventListener('error', onErr)
        }
      } else {
        setError('Is browser mein video supported nahi hai.'); setLoading(false)
      }
    } else {
      video.src = url
      const onMeta = () => setLoading(false)
      const onErr  = () => setError('Video load nahi hua.')
      video.addEventListener('loadedmetadata', onMeta)
      video.addEventListener('error', onErr)
      return () => {
        video.removeEventListener('loadedmetadata', onMeta)
        video.removeEventListener('error', onErr)
      }
    }
  }, [url])

  // Video element events
  useEffect(() => {
    const v = videoRef.current; if (!v) return
    const idKey = `ar_pos_${contentId || content.id || content._id}`
    
    const onTime  = () => {
      const time = v.currentTime
      setCurrentTime(time)
      if (time > 0 && Math.abs(time - (v.duration || 0)) > 5) {
        localStorage.setItem(idKey, String(time))
      } else if (time > 0 && Math.abs(time - (v.duration || 0)) <= 5) {
        localStorage.removeItem(idKey)
      }
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1))
    }
    const onDur   = () => setDuration(v.duration || 0)
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onWait  = () => setLoading(true)
    const onCanP  = () => setLoading(false)
    const onEnd   = () => {
      localStorage.removeItem(idKey)
      onEnded?.()
    }
    const onVol   = () => { setVolume(v.volume); setMuted(v.muted) }
    
    const onMeta = () => {
      setLoading(false)
      const saved = localStorage.getItem(idKey)
      if (saved) {
        const pos = parseFloat(saved)
        if (!isNaN(pos) && pos > 0 && pos < (v.duration || 999999)) {
          v.currentTime = pos
        }
      }
    }

    v.addEventListener('timeupdate', onTime)
    v.addEventListener('durationchange', onDur)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('waiting', onWait)
    v.addEventListener('playing', onCanP)
    v.addEventListener('canplay', onCanP)
    v.addEventListener('ended', onEnd)
    v.addEventListener('volumechange', onVol)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('durationchange', onDur)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('waiting', onWait)
      v.removeEventListener('playing', onCanP)
      v.removeEventListener('canplay', onCanP)
      v.removeEventListener('ended', onEnd)
      v.removeEventListener('volumechange', onVol)
    }
  }, [onEnded, contentId, content])

  // If the user (or system) exits fullscreen after we've started, treat it as "close the page"
  // — since there is no navbar/header to fall back on otherwise.
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

  // Auto-hide controls
  const resetHide = useCallback(() => {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    if (playing) hideTimer.current = setTimeout(() => setShowCtrl(false), 2800)
  }, [playing])
  useEffect(() => { if (started) resetHide() }, [playing, started, resetHide])

  const handleStart = async () => {
    setStarted(true)
    const v = videoRef.current
    await goFullscreenLandscape(containerRef.current, v)
    v?.play().catch(() => {})
  }

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return
    v.paused ? v.play() : v.pause()
    resetHide()
  }
  const toggleMute = () => { const v = videoRef.current; if (v) v.muted = !v.muted }
  const changeVol  = (val) => { const v = videoRef.current; if (!v) return; v.volume = val; v.muted = val === 0 }
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
  const changeSpeed = (s) => { setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s; setShowSettings(false) }
  const changeQuality = (level) => { if (hlsRef.current) hlsRef.current.currentLevel = level; setCurrentLevel(level); setShowSettings(false) }
  const togglePip = async () => {
    const v = videoRef.current; if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch {}
  }

  const handleVideoTap = (e) => {
    e.stopPropagation()
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current)
      touchTimeoutRef.current = null
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      x < rect.width / 2 ? doSkip(-10) : doSkip(10)
    } else {
      touchTimeoutRef.current = setTimeout(() => {
        togglePlay()
        touchTimeoutRef.current = null
      }, 220)
    }
  }

  const pct     = duration ? (currentTime / duration) * 100 : 0
  const buffPct = duration ? (buffered / duration) * 100 : 0
  const pipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document

  const qualityLabel = (l) => {
    if (l === -1) return 'Auto'
    const lvl = levels[l]
    if (!lvl) return `Q${l}`
    if (lvl.height) return `${lvl.height}p`
    if (lvl.bitrate) return `${Math.round(lvl.bitrate / 1000)}k`
    return `L${l}`
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black">
      <div
        className="absolute inset-0 select-none touch-none"
        onMouseMove={() => started && resetHide()}
        onMouseLeave={() => { if (started && videoRef.current && !videoRef.current.paused) setShowCtrl(false) }}
        onTouchStart={() => started && resetHide()}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          preload="metadata"
          onClick={started ? handleVideoTap : undefined}
        />

        {/* Poster / tap-to-play overlay — this is what the user taps to launch fullscreen landscape */}
        {!started && (
          <button
            onClick={handleStart}
            className="absolute inset-0 flex items-center justify-center bg-black"
          >
            {content.thumbnailUrl && (
              <img src={content.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-contain opacity-70" />
            )}
            <span className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl active:scale-90 transition-transform">
              <Play size={30} className="fill-black text-black ml-1" />
            </span>
          </button>
        )}

        {started && loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 z-40">
            <AlertTriangle size={32} className="text-danger-400" />
            <p className="text-white text-sm text-center px-6">{error}</p>
            <button className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-white" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {skipFlash && (
          <div key={skipFlash.ts}
            className={`absolute top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-0.5 ${skipFlash.dir === 'right' ? 'right-8' : 'left-8'}`}
            style={{ animation: 'mc-fadeout 0.6s forwards' }}>
            <span className="text-white text-3xl font-black">{skipFlash.dir === 'right' ? '▶▶' : '◀◀'}</span>
            <span className="text-white/80 text-xs font-semibold">10s</span>
          </div>
        )}

        {started && !showCtrl && <div className="absolute inset-0" onClick={togglePlay} />}

        {started && (
          <div
            className={`absolute inset-0 flex flex-col justify-end pointer-events-none transition-opacity duration-200 ${showCtrl || !playing ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.2) 50%, transparent 75%)' }}
          >
            <div className="pointer-events-auto px-3 sm:px-4 pb-1">
              <div className="relative h-1.5 bg-white/20 rounded-full cursor-pointer" onClick={onSeekClick} onTouchMove={onSeekTouch}>
                <div className="absolute inset-y-0 left-0 bg-white/25 rounded-full" style={{ width: `${buffPct}%` }} />
                <div className="absolute inset-y-0 left-0 bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow" style={{ left: `calc(${pct}% - 7px)` }} />
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
              <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                onChange={e => changeVol(parseFloat(e.target.value))}
                className="hidden sm:block w-16 lg:w-20 accent-primary-500 cursor-pointer"
                onClick={e => e.stopPropagation()} />
              <span className="text-white text-[10px] sm:text-xs font-mono ml-1 tabular-nums whitespace-nowrap shrink-0">
                {fmtTime(currentTime)}{duration > 0 && <span className="text-white/40"> / {fmtTime(duration)}</span>}
              </span>
              <div className="flex-1" />
              {pipSupported && (
                <button onClick={togglePip} className="mc-btn"><PictureInPicture2 size={14} /></button>
              )}
              <button onClick={e => { e.stopPropagation(); setShowSettings(v => !v) }} className={`mc-btn ${showSettings ? 'text-primary-400' : ''}`}>
                <Settings size={14} />
              </button>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="absolute z-50 top-2 right-2 bottom-12 w-48 sm:w-60 flex flex-col bg-gray-950/95 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex border-b border-white/10 relative shrink-0">
              <button onClick={() => setSettingsTab('speed')} className={`flex-1 py-2.5 text-xs font-semibold transition-all ${settingsTab === 'speed' ? 'text-primary-400' : 'text-gray-500 hover:text-gray-300'}`}>Speed</button>
              {levels.length > 0 && (
                <button onClick={() => setSettingsTab('quality')} className={`flex-1 py-2.5 text-xs font-semibold transition-all ${settingsTab === 'quality' ? 'text-primary-400' : 'text-gray-500 hover:text-gray-300'}`}>Quality</button>
              )}
              <button onClick={() => setShowSettings(false)} className="absolute right-2 top-2.5 text-gray-600 hover:text-white"><X size={12} /></button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {settingsTab === 'speed' && (
                <div className="p-2 grid grid-cols-4 gap-1">
                  {SPEEDS.map(s => (
                    <button key={s} onClick={() => changeSpeed(s)} className={`py-2 rounded-xl text-xs font-semibold transition-all active:scale-90 ${speed === s ? 'bg-primary-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>{s}x</button>
                  ))}
                </div>
              )}
              {settingsTab === 'quality' && levels.length > 0 && (
                <div className="p-2 space-y-0.5">
                  {[-1, ...levels.map((_, i) => i)].map(l => (
                    <button key={l} onClick={() => changeQuality(l)} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-[0.98] ${currentLevel === l ? 'bg-primary-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}>
                      <span>{qualityLabel(l)}</span>
                      {currentLevel === l && l !== -1 && <CheckCircle size={11} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <BackIcon onClick={onBack} visible={!started || showCtrl} />

        <style>{`
          .mc-btn { width:32px; height:32px; display:flex; align-items:center; justify-content:center; color:white; border-radius:8px; transition:color .15s,transform .1s,background .15s; flex-shrink:0; }
          .mc-btn:hover { color:rgb(139,124,255); background:rgba(255,255,255,0.08); }
          .mc-btn:active { transform:scale(0.88); }
          @keyframes mc-fadeout { 0%{opacity:1} 60%{opacity:1} 100%{opacity:0} }
          @media(min-width:640px){ .mc-btn{ width:36px; height:36px; } }
        `}</style>
      </div>
    </div>
  )
}

// ─── YouTube stage (fills screen, tap-to-play triggers fullscreen landscape) ─
function YouTubeStage({ content, onBack, contentId }) {
  const ytId = extractYTId(content.url)
  const containerRef = useRef(null)
  const iframeRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Get saved position from localStorage
  const [savedPosition, setSavedPosition] = useState(() => {
    try {
      const pos = localStorage.getItem(`ar_pos_${contentId || content.id || content._id}`)
      return pos ? parseInt(pos, 10) : 0
    } catch { return 0 }
  })

  const embedSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&start=${Math.floor(savedPosition)}&origin=${encodeURIComponent(window.location.origin)}`
    : null

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

  const handleStart = async () => {
    setStarted(true)
    await goFullscreenLandscape(containerRef.current, null)
  }

  // Save position periodically for YouTube
  useEffect(() => {
    if (!started || !ytId) return
    
    const idKey = `ar_pos_${contentId || content.id || content._id}`
    const saveInterval = setInterval(() => {
      const iframe = iframeRef.current
      if (!iframe) return
      try {
        // Request current time from YouTube iframe
        iframe.contentWindow?.postMessage(JSON.stringify({
          event: 'command',
          func: 'getCurrentTime'
        }), '*')
      } catch {}
    }, 5000)

    // Listen for messages from YouTube iframe
    const handleMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com' && event.origin !== 'https://www.youtube-nocookie.com') return
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (data?.event === 'infoDelivery' && typeof data.info?.currentTime === 'number') {
          const pos = data.info.currentTime
          if (pos > 0) {
            localStorage.setItem(idKey, String(pos))
            setSavedPosition(pos)
          }
        }
      } catch {}
    }
    window.addEventListener('message', handleMessage)
    
    return () => {
      clearInterval(saveInterval)
      window.removeEventListener('message', handleMessage)
    }
  }, [started, ytId, contentId, content])

  // Seek to saved position when iframe is ready
  useEffect(() => {
    if (!started || !ytId || savedPosition <= 0) return
    
    const idKey = `ar_pos_${contentId || content.id || content._id}`
    const seekTimeout = setTimeout(() => {
      const iframe = iframeRef.current
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [savedPosition, true]
        }), '*')
      }
    }, 1500)
    
    return () => clearTimeout(seekTimeout)
  }, [started, ytId, savedPosition, contentId, content])

  if (!embedSrc) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-2">
        <AlertTriangle size={28} className="text-danger-400" />
        <p className="text-gray-400 text-sm">YouTube URL parse nahi hua</p>
        <BackIcon onClick={onBack} />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black">
      {!started ? (
        <button onClick={handleStart} className="absolute inset-0 flex items-center justify-center bg-black">
          {content.thumbnailUrl && (
            <img src={content.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-contain opacity-70" />
          )}
          <span className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl active:scale-90 transition-transform">
            <Play size={30} className="fill-black text-black ml-1" />
          </span>
        </button>
      ) : (
        <>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="w-12 h-12 rounded-full border-2 border-danger-500/20 border-t-red-500 animate-spin" />
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={embedSrc}
            className="w-full h-full absolute inset-0 border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            title="Video"
            onLoad={() => setLoading(false)}
          />
        </>
      )}
      <BackIcon onClick={onBack} visible />
    </div>
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

// ─── PDF stage — full page, portrait, nothing on screen but the PDF ─────────
function PDFStage({ content, onBack }) {
  const url = content.url
  const driveId = extractDriveId(url)

  // Drive links get Drive's own /preview embed — the only shape Google reliably
  // allows inside an iframe. Everything else goes through the Google Docs viewer
  // first (works for most publicly reachable PDFs incl. Cloudinary), falling
  // back to a direct browser-native render if that fails.
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
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      )}
      <BackIcon onClick={onBack} visible={showBack} />
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────
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
  })

  const handleEnded = useCallback(() => {
    if (user) markCompletedMutation.mutate()
  }, [user, markCompletedMutation])

  const content = contentData?.content || null

  useEffect(() => {
    if (content && contentId) {
      try {
        const recent = JSON.parse(localStorage.getItem('ar_recently_watched') || '[]')
        const entry = {
          id: contentId,
          contentId,
          courseId,
          subjectId,
          chapterId,
          title: content.title,
          type: content.type,
          thumbnailUrl: content.thumbnailUrl,
          url: content.url,
          lastActiveAt: new Date().toISOString()
        }
        const filtered = recent.filter(item => item.contentId !== contentId)
        const updated = [entry, ...filtered].slice(0, 10)
        localStorage.setItem('ar_recently_watched', JSON.stringify(updated))
      } catch (e) {
        console.error('Error saving to recently watched:', e)
      }
    }
  }, [content, contentId, courseId, subjectId, chapterId])

  const backUrl = chapterId
    ? `/courses/${courseId}/subjects/${subjectId}/chapters/${chapterId}`
    : `/courses/${courseId}/subjects/${subjectId}`

  const handleBack = useCallback(() => {
    exitFullscreenAndUnlock()
    navigate(backUrl, { replace: true })
  }, [navigate, backUrl])

  if (isLoading) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (isError || !content) return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-3">
      <AlertTriangle size={32} className="text-gray-500" />
      <BackIcon onClick={handleBack} visible />
    </div>
  )

  const isYT  = isYouTubeURL(content.url)
  const isHLS = !isYT && (isHLSURL(content.url) || content.type === 'hls')

  if (content.type === 'pdf') {
    return <PDFStage content={content} onBack={handleBack} />
  }

  if (content.type === 'video' || content.type === 'hls') {
    return isYT
      ? <YouTubeStage content={content} onBack={handleBack} contentId={contentId} />
      : <NativeVideoStage content={content} onEnded={handleEnded} onBack={handleBack} contentId={contentId} />
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <BackIcon onClick={handleBack} visible />
    </div>
  )
}
