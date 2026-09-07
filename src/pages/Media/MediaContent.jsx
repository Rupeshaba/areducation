import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Hls from 'hls.js'
import { motion } from 'framer-motion'
import {
  ChevronLeft, Play, Pause, Volume2, VolumeX,
  SkipBack, SkipForward, Settings, X, CheckCircle, AlertTriangle,
  PictureInPicture2, Maximize, Minimize, FileText, Video, Clock,
} from 'lucide-react'
import api from '../../api/axios'
import { markContentCompleted, setLastPlayed, isContentCompleted } from '../../utils/progress'
import PdfReader from '../../components/PdfReader'
import { goFullscreenLandscape, exitFullscreenAndUnlock, useForcedLandscapeStyle } from '../../utils/fullscreen'
import CardThumbnail from '../../components/CardThumbnail'

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

// ─── Native / HLS video stage — plays inline (16:9 box) by default; only
// becomes a full-app, landscape-locked overlay when the user explicitly
// taps the fullscreen button, and returns to the inline box the moment
// fullscreen is exited (button, Escape, or system back-gesture) — it
// never navigates away on its own. ─────────────────────────────────────
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
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Rotates the player box with CSS when fullscreen + still portrait, so
  // fullscreen always looks landscape immediately, not just on devices
  // where screen.orientation.lock() actually works.
  const forcedLandscapeStyle = useForcedLandscapeStyle(isFullscreen)

  // Once the user has tapped play once, every later source swap (e.g.
  // picking the next item in the playlist) should autoplay directly
  // instead of showing the tap-to-play poster again.
  const startedOnceRef = useRef(false)

  const url = content.url

  // Setup source (HLS or plain mp4) as soon as we mount so it's ready to play instantly on tap.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    setError(null); setLoading(true); setLevels([]); setCurrentLevel(-1)
    setCurrentTime(0); setDuration(0); setBuffered(0)

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
      // Switching to this video from the playlist (user already started
      // playback once) — play it right away, no second tap needed.
      if (startedOnceRef.current) v.play().catch(() => {})
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

  // Track fullscreen state so the player can switch its own layout between
  // the inline 16:9 box and a full-app landscape overlay — exiting
  // fullscreen (button, Escape, back-gesture) just drops back to inline,
  // it never navigates away by itself.
  useEffect(() => {
    const onFS = () => {
      const isFS = !!document.fullscreenElement
      setIsFullscreen(isFS)
      if (!isFS) {
        try { window.screen?.orientation?.unlock?.() } catch (e) {}
      }
    }
    document.addEventListener('fullscreenchange', onFS)
    return () => document.removeEventListener('fullscreenchange', onFS)
  }, [])

  useEffect(() => () => exitFullscreenAndUnlock(), [])

  // Auto-hide controls
  const resetHide = useCallback(() => {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    if (playing) hideTimer.current = setTimeout(() => setShowCtrl(false), 2800)
  }, [playing])
  useEffect(() => { if (started) resetHide() }, [playing, started, resetHide])

  const handleStart = () => {
    setStarted(true)
    startedOnceRef.current = true
    const v = videoRef.current
    v?.play().catch(() => {})
  }

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      exitFullscreenAndUnlock()
    } else {
      await goFullscreenLandscape(containerRef.current, videoRef.current)
    }
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
    <div
      ref={containerRef}
      className={isFullscreen ? `bg-black z-[100] ${forcedLandscapeStyle ? '' : 'fixed inset-0'}` : 'relative w-full aspect-video bg-black overflow-hidden rounded-2xl'}
      style={isFullscreen ? forcedLandscapeStyle || undefined : undefined}
    >
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

        {/* Poster / tap-to-play overlay */}
        {!started && (
          <button
            onClick={handleStart}
            className="absolute inset-0 flex items-center justify-center bg-black"
          >
            {content.thumbnailUrl && (
              <img src={content.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-contain opacity-70" />
            )}
            <span className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl active:scale-90 transition-transform">
              <Play size={26} className="fill-black text-black ml-1" />
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
              <button onClick={e => { e.stopPropagation(); toggleFullscreen() }} className="mc-btn">
                {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
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

        {/* Back icon only makes sense here in fullscreen (to drop back to
            inline) — otherwise the header above the player already has a
            back button, so we don't duplicate it on top of the video. */}
        {isFullscreen && <BackIcon onClick={toggleFullscreen} visible={showCtrl} />}

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
// Loads the official YouTube IFrame Player API once and reuses it for every
// video on the page. Using the real API (instead of guessing at raw
// postMessage shapes) is what makes getCurrentTime/seekTo/onStateChange
// reliable — that unreliability was why YouTube videos always restarted
// from 0 instead of resuming like the HLS/native player does.
let ytApiPromise = null
function loadYouTubeIframeAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.()
      resolve(window.YT)
    }
    if (!document.querySelector('script[data-yt-iframe-api]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.setAttribute('data-yt-iframe-api', 'true')
      document.head.appendChild(tag)
    }
  })
  return ytApiPromise
}

function YouTubeStage({ content, onBack, contentId, onEnded }) {
  const ytId = extractYTId(content.url)
  const containerRef = useRef(null)
  const playerElRef = useRef(null)
  const playerRef = useRef(null)
  const saveIntervalRef = useRef(null)
  const idKey = `ar_pos_${contentId || content.id || content._id}`

  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showCtrl, setShowCtrl] = useState(true)
  const hideTimer = useRef(null)

  const forcedLandscapeStyle = useForcedLandscapeStyle(isFullscreen)

  useEffect(() => {
    const onFS = () => {
      const isFS = !!document.fullscreenElement
      setIsFullscreen(isFS)
      if (!isFS) {
        try { window.screen?.orientation?.unlock?.() } catch (e) {}
      }
    }
    document.addEventListener('fullscreenchange', onFS)
    return () => document.removeEventListener('fullscreenchange', onFS)
  }, [])

  useEffect(() => () => exitFullscreenAndUnlock(), [])

  const handleStart = () => {
    setStarted(true)
  }

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      exitFullscreenAndUnlock()
    } else {
      await goFullscreenLandscape(containerRef.current, null)
    }
  }

  const resetHide = useCallback(() => {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowCtrl(false), 2800)
  }, [])
  useEffect(() => { if (started) resetHide() }, [started, resetHide])

  // Create the real YT.Player once the user taps play.
  useEffect(() => {
    if (!started || !ytId) return
    let cancelled = false

    loadYouTubeIframeAPI().then((YT) => {
      if (cancelled || !playerElRef.current) return

      let savedPosition = 0
      try {
        const pos = localStorage.getItem(idKey)
        savedPosition = pos ? parseFloat(pos) : 0
      } catch { /* ignore */ }

      playerRef.current = new YT.Player(playerElRef.current, {
        videoId: ytId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            setLoading(false)
            if (savedPosition > 0) {
              try { e.target.seekTo(savedPosition, true) } catch { /* ignore */ }
            }
            e.target.playVideo()
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) {
              try { localStorage.removeItem(idKey) } catch { /* ignore */ }
              onEnded?.()
            }
          },
        },
      })

      // Periodically persist current playback position, same idea as the
      // native/HLS player's timeupdate-based save.
      saveIntervalRef.current = setInterval(() => {
        const p = playerRef.current
        if (!p || typeof p.getCurrentTime !== 'function') return
        try {
          const time = p.getCurrentTime()
          const dur = p.getDuration?.() || 0
          if (time > 0 && dur > 0 && Math.abs(time - dur) > 5) {
            localStorage.setItem(idKey, String(time))
          } else if (time > 0 && dur > 0 && Math.abs(time - dur) <= 5) {
            localStorage.removeItem(idKey)
          }
        } catch { /* ignore */ }
      }, 3000)
    })

    return () => {
      cancelled = true
      clearInterval(saveIntervalRef.current)
      try { playerRef.current?.destroy?.() } catch { /* ignore */ }
      playerRef.current = null
    }
  }, [started, ytId, idKey, onEnded])

  if (!ytId) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-2">
        <AlertTriangle size={28} className="text-danger-400" />
        <p className="text-gray-400 text-sm">YouTube URL parse nahi hua</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={isFullscreen ? `bg-black z-[100] ${forcedLandscapeStyle ? '' : 'fixed inset-0'}` : 'relative w-full aspect-video bg-black overflow-hidden rounded-2xl'}
      style={isFullscreen ? forcedLandscapeStyle || undefined : undefined}
      onMouseMove={() => started && resetHide()}
      onTouchStart={() => started && resetHide()}
    >
      {!started ? (
        <button onClick={handleStart} className="absolute inset-0 flex items-center justify-center bg-black">
          {content.thumbnailUrl && (
            <img src={content.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-contain opacity-70" />
          )}
          <span className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl active:scale-90 transition-transform">
            <Play size={26} className="fill-black text-black ml-1" />
          </span>
        </button>
      ) : (
        <>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="w-12 h-12 rounded-full border-2 border-danger-500/20 border-t-red-500 animate-spin" />
            </div>
          )}
          <div className="mc-yt-wrap w-full h-full absolute inset-0">
            <div ref={playerElRef} className="w-full h-full" />
          </div>

          {/* YT.Player replaces the target div with its own <iframe>, sized
              in pixels (defaults to 640x390) rather than filling the
              parent — without this override the video stays a small fixed
              box and doesn't rotate/fill the screen properly in
              fullscreen. Forcing it to 100% here makes it track the
              (possibly rotated) container exactly like the native player. */}
          <style>{`.mc-yt-wrap iframe { width: 100% !important; height: 100% !important; display: block; }`}</style>

          {/* Fullscreen toggle — YouTube's own iframe controls handle play/pause/seek */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleFullscreen() }}
            className={`absolute bottom-3 right-3 z-[60] w-10 h-10 flex items-center justify-center rounded-full
              bg-black/45 backdrop-blur-md text-white transition-opacity duration-300
              ${showCtrl ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </>
      )}
      {/* Same rule as the native player: back icon shown only to exit
          fullscreen — the header above already has the real back button. */}
      {isFullscreen && <BackIcon onClick={toggleFullscreen} visible={showCtrl} />}
    </div>
  )
}

// ─── PDF stage — full app, landscape-locked like the video stage, native
// pinch-zoom, no third-party toolbar / zoom buttons / "open externally" ────
function PDFStage({ content, onBack }) {
  return <PdfReader url={content.url} title={content.title} onBack={onBack} />
}

// ─── Content list shown below the player — same subject's videos, with the
// currently-playing one highlighted and auto-scrolled into view. ──────────
function ytIdOf(url) {
  return url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null
}
function ctypeOf(c) {
  const t = (c.type || '').toLowerCase().trim()
  if (t === 'pdf') return 'pdf'
  if (t === 'hls' || c.url?.includes('.m3u8')) return 'hls'
  if (ytIdOf(c.url)) return 'youtube'
  return 'video'
}
function fmtDurationShort(sec) {
  if (!sec) return ''
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function PlaylistItem({ item, isActive, onClick }) {
  const type = ctypeOf(item)
  const isCompleted = isContentCompleted(item.id)

  return (
    <button
      data-content-id={item.id}
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all duration-300 active:scale-[0.98] ${
        isActive ? 'ring-2 ring-primary-500/70' : 'hover:border-primary-500/30 hover:bg-white'
      }`}
      style={{
        background: isActive ? 'rgba(99,102,241,0.08)' : '#F7F8FC',
        border: isActive ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div className="relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
        <CardThumbnail item={item} alt={item.title} />
        {isActive ? (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            {/* Playing animation — bouncing equalizer bars */}
            <div className="flex items-end gap-0.5 h-4">
              <span className="w-1 bg-white rounded-full eq-bar" style={{ animationDelay: '0ms' }} />
              <span className="w-1 bg-white rounded-full eq-bar" style={{ animationDelay: '150ms' }} />
              <span className="w-1 bg-white rounded-full eq-bar" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.85)' }}>
              <Play size={10} fill="white" color="white" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold line-clamp-2 leading-snug ${isActive ? 'text-primary-700' : 'text-gray-900'}`}>
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-500">
            {isActive ? 'Playing' : type === 'hls' ? 'Video' : 'Video'}
          </span>
          {item.duration > 0 && (
            <span className="flex items-center gap-1 text-gray-500" style={{ fontSize: '10px' }}>
              <Clock size={9} />{fmtDurationShort(item.duration)}
            </span>
          )}
        </div>
      </div>

      {isCompleted && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.9)' }}>
          <CheckCircle size={13} className="text-white" />
        </div>
      )}

      <style>{`
        @keyframes eqBounce { 0%,100% { height: 30%; } 50% { height: 100%; } }
        .eq-bar { animation: eqBounce 0.9s ease-in-out infinite; }
      `}</style>
    </button>
  )
}

function findScrollParentEl(node) {
  let el = node?.parentElement
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el)
    if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) return el
    el = el.parentElement
  }
  return document.scrollingElement || document.documentElement
}

function scrollItemIntoView(el) {
  if (!el) return
  const container = findScrollParentEl(el)
  const isRoot = container === (document.scrollingElement || document.documentElement)
  const elRect = el.getBoundingClientRect()
  const containerRect = isRoot ? { top: 0, height: window.innerHeight } : container.getBoundingClientRect()
  const containerHeight = isRoot ? window.innerHeight : containerRect.height
  const currentScroll = isRoot ? window.scrollY : container.scrollTop
  const delta = (elRect.top - containerRect.top) - containerHeight / 2 + elRect.height / 2
  const targetScroll = Math.max(0, currentScroll + delta)
  if (container.scrollTo) container.scrollTo({ top: targetScroll, behavior: 'smooth' })
  else container.scrollTop = targetScroll
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────
export default function MediaContent() {
  const { courseId, subjectId, contentId, chapterId: paramChapterId } = useParams()
  const [searchParams] = useSearchParams()
  const searchChapterId = searchParams.get('chapterId')
  const chapterId = paramChapterId || searchChapterId
  const navigate  = useNavigate()

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

  // Full subject content list — used to render the playlist below the
  // player and to find "what plays next" for this video.
  const { data: subjectData } = useQuery({
    queryKey: ['subject-detail', subjectId],
    queryFn: () => api.get(`/subjects/${subjectId}`).then(r => r.data),
    enabled: !!subjectId,
    staleTime: 5 * 60 * 1000,
  })

  const subject = subjectData?.subject ?? null
  const allSubjectContents = useMemo(() => {
    const chapters = subject?.chapters ?? []
    if (chapters.length > 0) return chapters.flatMap(ch => (ch.contents ?? []).map(c => ({ ...c, _chapterId: ch.id })))
    return subject?.contents ?? []
  }, [subject])

  const videoPlaylist = useMemo(
    () => allSubjectContents.filter(c => ctypeOf(c) !== 'pdf'),
    [allSubjectContents]
  )

  const hasMarkedCompleteRef = useRef(false)
  useEffect(() => { hasMarkedCompleteRef.current = false }, [contentId])

  const handleEnded = useCallback(() => {
    if (hasMarkedCompleteRef.current) return
    hasMarkedCompleteRef.current = true
    markContentCompleted(contentId, { subjectId, courseId })
  }, [contentId, subjectId, courseId])

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

  // Remember this as "last played" for this subject so re-visiting the
  // subject page auto-scrolls back to it (existing behaviour, unchanged).
  useEffect(() => {
    if (contentId) setLastPlayed(contentId, { subjectId, courseId })
  }, [contentId, subjectId, courseId])

  const backUrl = chapterId
    ? `/courses/${courseId}/subjects/${subjectId}/chapters/${chapterId}`
    : `/courses/${courseId}/subjects/${subjectId}`

  const handleBack = useCallback(() => {
    exitFullscreenAndUnlock()
    navigate(backUrl, { replace: true })
  }, [navigate, backUrl])

  // Switch which content is playing without a full page reload. Always the
  // flat /content/:contentId route (chapterId only ever as a query param)
  // so this is the same <Route> match as before — React Router just swaps
  // params instead of unmounting/remounting MediaContent, which is what
  // used to make tapping a playlist item look like a page refresh.
  const playItem = useCallback((item) => {
    const targetChapterId = item._chapterId ?? null
    const url = targetChapterId
      ? `/courses/${courseId}/subjects/${subjectId}/content/${item.id}?chapterId=${targetChapterId}`
      : `/courses/${courseId}/subjects/${subjectId}/content/${item.id}`
    navigate(url, { replace: true })
  }, [navigate, courseId, subjectId])

  // Auto-scroll the playlist to the currently-playing item whenever it changes.
  const hasScrolledForRef = useRef(null)
  useEffect(() => {
    if (!contentId || hasScrolledForRef.current === contentId) return
    let attempts = 0
    let timeoutId = null
    let cancelled = false
    const tryScroll = () => {
      if (cancelled) return
      const el = document.querySelector(`[data-content-id="${CSS.escape(String(contentId))}"]`)
      if (el) {
        hasScrolledForRef.current = contentId
        scrollItemIntoView(el)
        return
      }
      attempts += 1
      if (attempts < 20) timeoutId = setTimeout(tryScroll, 100)
    }
    timeoutId = setTimeout(tryScroll, 150)
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId) }
  }, [contentId, videoPlaylist.length])

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (isError || !content) return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <AlertTriangle size={32} className="text-gray-400" />
      <button onClick={handleBack} className="text-sm text-primary-600 font-semibold">Go back</button>
    </div>
  )

  const isYT  = isYouTubeURL(content.url)

  if (content.type === 'pdf') {
    return <PDFStage content={content} onBack={handleBack} />
  }

  if (content.type === 'video' || content.type === 'hls') {
    return (
      <div className="min-h-screen bg-[#F7F8FC]">
        <div className="mx-auto w-full max-w-2xl">
          {/* Sticky stage — header + player pin to the top of the viewport
              as the page scrolls, so only the playlist underneath moves.
              The player itself never scrolls. */}
          <div className="sticky top-0 z-30 bg-[#F7F8FC]/95 backdrop-blur-md px-3 sm:px-4 pt-3 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={handleBack}
                className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:scale-90 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <h1 className="text-base font-bold text-gray-900 line-clamp-1 flex-1">{content.title}</h1>
            </div>

            <div className="shadow-lg shadow-gray-900/5 rounded-2xl">
              {isYT
                ? <YouTubeStage content={content} onBack={handleBack} contentId={contentId} onEnded={handleEnded} />
                : <NativeVideoStage content={content} onEnded={handleEnded} onBack={handleBack} contentId={contentId} />}
            </div>
          </div>

          {/* Playlist — same subject's content, current item highlighted +
              auto-scrolled to. This is the only part of the page meant to
              scroll past the pinned player above. */}
          {videoPlaylist.length > 0 && (
            <div className="px-3 sm:px-4 pb-24 pt-1">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <Video size={14} className="text-primary-500" />
                  Up next in this subject
                </h2>
                <span className="text-[11px] font-semibold text-gray-400">{videoPlaylist.length} videos</span>
              </div>
              <div className="flex flex-col gap-2">
                {videoPlaylist.map((item) => (
                  <PlaylistItem
                    key={item.id}
                    item={item}
                    isActive={item.id === contentId}
                    onClick={() => playItem(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-24">
      <button onClick={handleBack} className="text-sm text-primary-600 font-semibold">Go back</button>
    </div>
  )
}
