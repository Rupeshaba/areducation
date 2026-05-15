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
    const onFS = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFS)
    return () => document.removeEventListener('fullscreenchange', onFS)
  }, [])

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

      {/* Tap-to-play when controls hidden */}
      {!showCtrl && <div className="absolute inset-0" onClick={togglePlay} />}

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
          {/* Larger hit-area wrapper (mobile-friendly) */}
          <div
            style={{ padding: '8px 0', cursor: 'pointer' }}
            onClick={onSeekClick}
            onTouchMove={onSeekTouch}
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
                style={{ width: `${pct}%`, background: '#818cf8', transition: 'width 0.1s' }}
              />
              {/* Thumb — show on hover via group but always visible on mobile */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 14, height: 14,
                  background: 'white',
                  top: '50%', transform: 'translate(-50%, -50%)',
                  left: `${pct}%`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  transition: 'left 0.1s',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Controls row ── */}
        <div
          className="pointer-events-auto flex items-center"
          style={{ padding: '0 8px 12px', gap: 2 }}
        >
          {/* Play / Pause */}
          <button onClick={togglePlay} className="vp-btn" aria-label={playing ? 'Pause' : 'Play'}>
            {playing
              ? <Pause size={17} style={{ fill: 'currentColor', flexShrink: 0 }} />
              : <Play  size={17} style={{ fill: 'currentColor', marginLeft: 2, flexShrink: 0 }} />}
          </button>

          {/* Skip */}
          <button onClick={() => doSkip(-10)} className="vp-btn" aria-label="Rewind 10s">
            <SkipBack size={15} />
          </button>
          <button onClick={() => doSkip(10)} className="vp-btn" aria-label="Forward 10s">
            <SkipForward size={15} />
          </button>

          {/* Volume — desktop only */}
          <button onClick={toggleMute} className="vp-btn vp-desktop" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range" min="0" max="1" step="0.05"
            value={muted ? 0 : volume}
            onChange={e => changeVol(parseFloat(e.target.value))}
            aria-label="Volume"
            className="vp-desktop"
            style={{ width: 64, accentColor: '#818cf8', cursor: 'pointer' }}
            onClick={e => e.stopPropagation()}
          />

          {/* Mobile mute only */}
          <button onClick={toggleMute} className="vp-btn vp-mobile" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

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
              className="vp-desktop"
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
              className="vp-btn"
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
              <Settings size={14} />
            </button>

            {showSettings && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', bottom: 46, right: 0,
                  width: 228,
                  background: 'rgba(10,10,18,0.97)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 14,
                  overflow: 'hidden', zIndex: 50,
                }}
              >
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                  <button
                    onClick={() => setSettingsTab('speed')}
                    style={{
                      flex: 1, padding: '10px 0', fontSize: 
