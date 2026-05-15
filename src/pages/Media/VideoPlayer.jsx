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
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab,  setSettingsTab]  = useState('speed')
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
    
    if (isFullscreen && window.screen?.orientation?.lock) {
      window.screen.orientation.lock('landscape').catch(() => {})
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
    setShowSettings(false)
  }

  const changeQuality = (level) => {
    if (hlsRef.current) hlsRef.current.currentLevel = level
    setCurrentLevel(level)
    setShowSettings(false)
  }

  const toggleFS = () => {
    const el = containerRef.current
    if (!document.fullscreenElement) {
      el?.requestFullscreen?.()
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

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full select-none touch-none"
      style={{ aspectRatio: '16/9', borderRadius: '14px', overflow: 'hidden' }}
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
          <div
            className="rounded-full animate-spin"
            style={{
              width: 44, height: 44,
              border: '2.5px solid rgba(255,255,255,0.12)',
              borderTopColor: 'white',
            }}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: 'rgba(0,0,0,0.88)' }}>
          <AlertCircle size={30} style={{ color: '#f87171' }} />
          <p className="text-white text-sm text-center px-6 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontSize: 12, color: 'white',
              background: 'rgba(255,255,255,0.1)',
              border: '0.5px solid rgba(255,255,255,0.2)',
              borderRadius: 10, padding: '6px 16px',
            }}
          >Retry</button>
        </div>
      )}

      {/* Skip flash overlay */}
      {skipFlash && (
        <div
          key={skipFlash.ts}
          className="absolute pointer-events-none flex flex-col items-center"
          style={{
            top: '50%', transform: 'translateY(-50%)',
            [skipFlash.dir === 'right' ? 'right' : 'left']: '10%',
            gap: 2, animation: 'skipfadeout 0.65s forwards',
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 900, color: 'white', lineHeight: 1 }}>
            {skipFlash.dir === 'right' ? '▶▶' : '◀◀'}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>10s</span>
        </div>
      )}

      {/* Controls gradient + UI */}
      <div
        className="absolute inset-0 flex flex-col justify-end pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.25) 40%, transparent 68%)',
          opacity: showCtrl || !playing ? 1 : 0,
          transition: 'opacity 0.22s ease',
        }}
      >
        {/* ── Seek bar ── */}
        <div className="pointer-events-auto" style={{ padding: '0 14px 4px' }}>
          <div
            ref={seekbarRef}
            style={{ padding: '8px 0', cursor: 'pointer' }}
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
            <div
              className="relative rounded-full"
              style={{ height: 4, background: 'rgba(255,255,255,0.2)' }}
            >
              {/* Buffer */}
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${buffPct}%`, background: 'rgba(255,255,255,0.22)' }}
              />
              {/* Progress */}
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${pct}%`, background: '#818cf8', transition: 'width 0.05s linear' }}
              />
              {/* Thumb */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 14, height: 14,
                  background: 'white',
                  top: '50%', transform: 'translate(-50%, -50%)',
                  left: `${pct}%`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  transition: 'left 0.05s linear',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Controls row ── */}
        <div
          className="pointer-events-auto flex items-center flex-wrap"
          style={{ padding: '0 8px 12px', gap: 2 }}
        >
          {/* Play / Pause */}
          <button onClick={togglePlay} className="vp-btn" aria-label={playing ? 'Pause' : 'Play'}>
            {playing
              ? <Pause size={18} style={{ fill: 'currentColor', flexShrink: 0 }} />
              : <Play  size={18} style={{ fill: 'currentColor', marginLeft: 2, flexShrink: 0 }} />}
          </button>

          {/* Skip */}
          <button onClick={() => doSkip(-10)} className="vp-btn" aria-label="Rewind 10s">
            <SkipBack size={16} />
          </button>
          <button onClick={() => doSkip(10)} className="vp-btn" aria-label="Forward 10s">
            <SkipForward size={16} />
          </button>

          {/* Volume control */}
          <button onClick={toggleMute} className="vp-btn" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          
          {/* Volume slider - desktop only */}
          <div className="hidden sm:block">
            <input
              type="range" min="0" max="1" step="0.05"
              value={muted ? 0 : volume}
              onChange={e => changeVol(parseFloat(e.target.value))}
              aria-label="Volume"
              style={{ width: 64, accentColor: '#818cf8', cursor: 'pointer' }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Time */}
          <span
            style={{
              fontSize: 11, fontFamily: 'var(--font-mono, monospace)',
              color: 'rgba(255,255,255,0.9)', marginLeft: 4,
              whiteSpace: 'nowrap', flexShrink: 0, tabularNums: true,
            }}
          >
            {fmtTime(currentTime)}
            {duration > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.38)' }}> / {fmtTime(duration)}</span>
            )}
          </span>

          <div style={{ flex: 1 }} />

          {/* Speed badge */}
          {speed !== 1 && (
            <span
              className="hidden sm:inline-block"
              style={{
                fontSize: 10, fontFamily: 'var(--font-mono, monospace)',
                background: 'rgba(129,140,248,0.2)', color: '#a5b4fc',
                padding: '2px 6px', borderRadius: 5, marginRight: 2, flexShrink: 0,
              }}
            >{speed}x</span>
          )}

          {/* PiP */}
          {pipSupported && (
            <button
              onClick={togglePip}
              className="vp-btn hidden sm:inline-flex"
              aria-label="Picture in Picture"
              style={pip ? { color: '#a5b4fc' } : {}}
            >
              <PictureInPicture2 size={14} />
            </button>
          )}

          {/* Settings */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setShowSettings(v => !v) }}
              className="vp-btn"
              aria-label="Settings"
              aria-expanded={showSettings}
              style={showSettings ? { color: '#a5b4fc' } : {}}
            >
              <Settings size={15} />
            </button>

            {showSettings && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40 sm:hidden"
                  onClick={() => setShowSettings(false)}
                  style={{ background: 'rgba(0,0,0,0.6)' }}
                />
                
                {/* Settings Panel */}
                <div
                  onClick={e => e.stopPropagation()}
                  className="fixed bottom-0 left-0 right-0 z-50 sm:absolute sm:bottom-full sm:right-0 sm:left-auto sm:top-auto sm:mb-2"
                  style={{
                    background: 'rgba(10,10,18,0.98)',
                    backdropFilter: 'blur(20px)',
                    borderTopLeftRadius: '20px',
                    borderTopRightRadius: '20px',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    overflow: 'hidden',
                    maxHeight: '80vh',
                    ...(window.innerWidth >= 640 && {
                      width: 260,
                      borderRadius: 16,
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                    })
                  }}
                >
                  {/* Header */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '16px 16px',
                    borderBottom: '0.5px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <button
                        onClick={() => setSettingsTab('speed')}
                        style={{
                          fontSize: 15, fontWeight: 600,
                          color: settingsTab === 'speed' ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '4px 0',
                        }}
                      >Speed</button>
                      {levels.length > 0 && (
                        <button
                          onClick={() => setSettingsTab('quality')}
                          style={{
                            fontSize: 15, fontWeight: 600,
                            color: settingsTab === 'quality' ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '4px 0',
                          }}
                        >Quality</button>
                      )}
                    </div>
                    <button
                      onClick={() => setShowSettings(false)}
                      aria-label="Close settings"
                      style={{
                        color: 'rgba(255,255,255,0.5)',
                        background: 'none', border: 'none',
                        cursor: 'pointer', padding: 4,
                      }}
                    ><X size={18} /></button>
                  </div>

                  {settingsTab === 'speed' && (
                    <div style={{ 
                      padding: 16,
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', 
                      gap: 8,
                      maxHeight: '60vh',
                      overflowY: 'auto'
                    }}>
                      {SPEEDS.map(s => (
                        <button
                          key={s}
                          onClick={() => changeSpeed(s)}
                          style={{
                            padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 500,
                            background: speed === s ? '#4f46e5' : 'rgba(255,255,255,0.06)',
                            color: speed === s ? 'white' : 'rgba(255,255,255,0.7)',
                            border: 'none', cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >{s}x</button>
                      ))}
                    </div>
                  )}

                  {settingsTab === 'quality' && levels.length > 0 && (
                    <div style={{ 
                      padding: 8, 
                      maxHeight: '60vh', 
                      overflowY: 'auto' 
                    }}>
                      {[-1, ...levels.map((_, i) => i)].map(l => (
                        <button
                          key={l}
                          onClick={() => changeQuality(l)}
                          style={{
                            width: '100%', display: 'flex',
                            alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 16px', borderRadius: 12,
                            fontSize: 14, fontWeight: 500,
                            background: currentLevel === l ? '#4f46e5' : 'transparent',
                            color: currentLevel === l ? 'white' : 'rgba(255,255,255,0.7)',
                            border: 'none', cursor: 'pointer',
                            transition: 'all 0.12s',
                            marginBottom: 4,
                          }}
                        >
                          <span>{qualityLabel(l)}</span>
                          {l === -1 && (
                            <span style={{
                              fontSize: 11,
                              color: currentLevel === l ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)',
                            }}>Auto</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFS} className="vp-btn" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* PiP indicator */}
      {pip && (
        <div
          style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(79,70,229,0.8)',
            backdropFilter: 'blur(6px)',
            color: 'white', fontSize: 11, fontWeight: 500,
            padding: '3px 10px', borderRadius: 8,
            pointerEvents: 'none',
          }}
        >PiP active</div>
      )}

      <style>{`
        .vp-btn {
          width: 40px; height: 40px; min-width: 40px;
          display: flex; align-items: center; justify-content: center;
          color: white; border-radius: 10px; cursor: pointer;
          border: none; background: transparent; flex-shrink: 0;
          transition: all 0.15s;
        }
        .vp-btn:active { 
          background: rgba(255,255,255,0.15);
          transform: scale(0.95);
        }
        @media(min-width:640px){
          .vp-btn:hover { color: #a5b4fc; background: rgba(255,255,255,0.08); }
          .vp-btn:active { transform: scale(0.87); }
        }
        @keyframes skipfadeout { 
          0%{ opacity: 1; transform: translateY(-50%) scale(1); } 
          50%{ opacity: 1; transform: translateY(-50%) scale(1.1); }
          100%{ opacity: 0; transform: translateY(-50%) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 0.8s linear infinite; }
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
      <div
        style={{ aspectRatio: '16/9', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          background: '#0a0a0a', borderRadius: 14, padding: '0 16px' }}
      >
        <AlertCircle size={26} style={{ color: '#f87171' }} />
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center' }}>
          YouTube URL parse nahi hua
        </p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, wordBreak: 'break-all', maxWidth: 280, textAlign: 'center' }}>
          {url}
        </p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 14, overflow: 'hidden', background: '#0a0a0a' }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: '#0a0a0a', zIndex: 10,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '2.5px solid rgba(129,140,248,0.2)',
            borderTopColor: '#818cf8',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10,
          background: '#0a0a0a',
        }}>
          <AlertCircle size={30} style={{ color: '#f87171' }} />
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Video load nahi hua</p>
          <button
            onClick={() => { setError(false); setLoading(true) }}
            style={{
              fontSize: 12, color: 'white',
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: 10, padding: '6px 16px', cursor: 'pointer',
            }}
          >Retry</button>
        </div>
      )}
      <iframe
        src={embedSrc || liveSrc}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
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
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontSize: 14, fontWeight: 600,
        background: currentVariant.bg,
        color: currentVariant.color,
        border: currentVariant.border,
        padding: '10px 24px', borderRadius: 12,
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isAnimating ? 'scale(0.96)' : 'scale(1)',
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
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255,255,255,0.2)',
            animation: 'ripple 0.3s ease-out',
          }}
        />
      )}
      <Icon size={16} />
      <span>{label}</span>
      <style>{`
        @keyframes ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
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
    <div className="flex justify-center items-center py-32">
      <div
        style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid rgba(129,140,248,0.2)',
          borderTopColor: '#818cf8',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!content) return (
    <div className="flex flex-col items-center py-32 gap-4">
      <AlertCircle size={40} style={{ color: '#f87171' }} />
      <p style={{ color: 'rgba(var(--color-text-secondary))', fontSize: 15 }}>Content nahi mila.</p>
      <button
        onClick={() => navigate(-1)}
        style={{ fontSize: 14, color: '#818cf8', cursor: 'pointer', background: 'none', border: 'none' }}
      >Wapas jao</button>
    </div>
  )

  const isYT = isYouTubeURL(content.url)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 0% 0%, rgba(129,140,248,0.03) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(52,211,153,0.03) 0%, transparent 50%)',
    }}>
      <div style={{ maxWidth: 860, margin: '0 auto', width: '100%', padding: '16px' }}>
        
        {/* Title - Below Player on Mobile */}
        <div style={{ marginBottom: 16, order: 2 }}>
          <h1 style={{
            fontSize: 'clamp(18px, 5vw, 24px)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            lineHeight: 1.3,
            marginBottom: 8,
          }}>
            {content.title}
          </h1>
          
          {/* Metadata */}
          <div style={{
            display: 'flex', gap: 12, alignItems: 'center',
            flexWrap: 'wrap', marginTop: 8
          }}>
            {content.duration && (
              <span style={{
                fontSize: 12, color: 'var(--color-text-secondary)',
                background: 'var(--color-background-secondary)',
                padding: '2px 8px', borderRadius: 6,
              }}>
                {fmtTime(content.duration)}
              </span>
            )}
            {isCompleted && (
              <span style={{
                fontSize: 12, color: '#34d399',
                background: 'rgba(52,211,153,0.1)',
                padding: '2px 8px', borderRadius: 6,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <CheckCircle size={12} /> Completed
              </span>
            )}
          </div>
        </div>

        {/* Player */}
        <div style={{ 
          borderRadius: 16, 
          overflow: 'hidden', 
          background: '#0a0a0a', 
          marginBottom: 20,
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)'
        }}>
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
          <div style={{
            background: 'var(--color-background-secondary)',
            borderRadius: 12,
            padding: '16px',
            marginBottom: 20,
            border: '0.5px solid var(--color-border-tertiary)',
          }}>
            <p style={{
              fontSize: 14, color: 'var(--color-text-secondary)',
              lineHeight: 1.6, margin: 0,
            }}>
              {content.description}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex', gap: 12, flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: 8,
        }}>
          {!isCompleted && (
            <AnimatedButton
              onClick={() => saveProg.mutate({ completed: true, position: 0, subjectId: content.subjectId })}
              icon={CheckCircle}
              label="Mark as Complete"
              variant="primary"
            />
          )}
          
          {isCompleted && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 500,
              color: '#34d399',
              background: 'rgba(52,211,153,0.08)',
              padding: '10px 24px', borderRadius: 12,
              border: '0.5px solid rgba(52,211,153,0.3)',
            }}>
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
