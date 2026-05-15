import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import Hls from 'hls.js'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, CheckCircle, AlertCircle,
  PictureInPicture2, X, Check
} from 'lucide-react'
import api from '../../api/axios'

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

function isYouTubeURL(url) { return /youtube\.com|youtu\.be/.test(url || '') }

function isHLSURL(url) {
  if (!url) return false
  return /\.m3u8(\?|#|$)/i.test(url) || /[?&]type=hls/i.test(url) || /\/hls\//i.test(url)
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]

// ─── Custom Player ────────────────────────────────────────────────────────────
function CustomPlayer({ url, savedPos = 0, onProgress, onComplete }) {
  const videoRef     = useRef(null)
  const hlsRef       = useRef(null)
  const containerRef = useRef(null)
  const hideTimer    = useRef(null)
  const lastSaved    = useRef(0)
  const tapTimer     = useRef(null)
  const tapCount     = useRef(0)
  const seekDragging = useRef(false)

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
  const [seekPct,      setSeekPct]      = useState(0)

  // ── HLS / native init ──────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    setError(null); setLoading(true); setLevels([]); setCurrentLevel(-1)
    setPlaying(false); setCurrentTime(0); setDuration(0); setSeekPct(0)

    const attachNative = () => {
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

    if (isHLSURL(url)) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, backBufferLength: 90 })
        hlsRef.current = hls
        hls.loadSource(url)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, (_, d) => {
          setLevels(d.levels); setLoading(false)
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
        return attachNative()
      } else {
        setError('Is browser mein HLS supported nahi hai.')
        setLoading(false)
      }
    } else {
      return attachNative()
    }
  }, [url])

  // ── Video event listeners ──────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current; if (!v) return
    const onTime = () => {
      const ct = v.currentTime
      setCurrentTime(ct)
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1))
      if (!seekDragging.current && v.duration) setSeekPct((ct / v.duration) * 100)
      if (ct - lastSaved.current >= 8) {
        lastSaved.current = ct
        onProgress?.(Math.floor(ct))
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

  // ── Fullscreen change ──────────────────────────────────────────────────
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
  const scheduleHide = useCallback((isPlaying) => {
    clearTimeout(hideTimer.current)
    if (isPlaying) {
      hideTimer.current = setTimeout(() => setShowCtrl(false), 2800)
    }
  }, [])

  const resetHide = useCallback(() => {
    setShowCtrl(true)
    scheduleHide(playing)
  }, [playing, scheduleHide])

  // ── Actions ────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return
    if (v.paused) { v.play(); scheduleHide(true) }
    else { v.pause(); clearTimeout(hideTimer.current) }
    setShowCtrl(true)
  }, [scheduleHide])

  const toggleMute = () => { const v = videoRef.current; if (v) v.muted = !v.muted }
  const changeVol  = (val) => {
    const v = videoRef.current; if (!v) return
    v.volume = val; v.muted = val === 0
  }

  const doSkip = useCallback((secs) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = Math.max(0, Math.min(v.currentTime + secs, v.duration || 0))
    setSkipFlash({ dir: secs > 0 ? 'right' : 'left', ts: Date.now() })
    setTimeout(() => setSkipFlash(null), 700)
    resetHide()
  }, [resetHide])

  // ── Seek — shared logic ────────────────────────────────────────────────
  const applySeek = useCallback((clientX, rect) => {
    const v = videoRef.current; if (!v || !v.duration) return
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    v.currentTime = pct * v.duration
    setSeekPct(pct * 100)
  }, [])

  // Mouse seek
  const onSeekMouseDown = (e) => {
    e.preventDefault()
    seekDragging.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    applySeek(e.clientX, rect)
    const move = (me) => applySeek(me.clientX, rect)
    const up   = ()   => { seekDragging.current = false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  // Touch seek
  const onSeekTouchStart = (e) => {
    e.stopPropagation()
    seekDragging.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    applySeek(e.touches[0].clientX, rect)
    const move = (te) => { te.preventDefault(); applySeek(te.touches[0].clientX, rect) }
    const end  = ()   => { seekDragging.current = false; window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end) }
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', end)
  }

  // ── Touch gestures on video area ───────────────────────────────────────
  // Single tap = toggle controls / play-pause when controls visible
  // Double tap left = -10s, right = +10s
  const onVideoTouchEnd = useCallback((e) => {
    if (showSettings) { setShowSettings(false); return }
    tapCount.current += 1
    if (tapCount.current === 1) {
      tapTimer.current = setTimeout(() => {
        tapCount.current = 0
        if (!showCtrl) {
          // First tap: just show controls
          setShowCtrl(true)
          clearTimeout(hideTimer.current)
          scheduleHide(playing)
        } else {
          togglePlay()
        }
      }, 220)
    } else if (tapCount.current >= 2) {
      clearTimeout(tapTimer.current)
      tapCount.current = 0
      const container = containerRef.current
      if (!container) return
      const rect  = container.getBoundingClientRect()
      const touchX = e.changedTouches[0].clientX - rect.left
      doSkip(touchX < rect.width / 2 ? -10 : 10)
    }
  }, [showCtrl, showSettings, playing, togglePlay, doSkip, scheduleHide])

  // ── Settings ───────────────────────────────────────────────────────────
  const changeSpeed = (s) => {
    setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s
    setShowSettings(false)
  }
  const changeQuality = (level) => {
    if (hlsRef.current) hlsRef.current.currentLevel = level
    setCurrentLevel(level); setShowSettings(false)
  }

  // ── Fullscreen with orientation lock ──────────────────────────────────
  const toggleFS = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.()
      try { await screen.orientation?.lock?.('landscape') } catch {}
    } else {
      await document.exitFullscreen?.()
      try { screen.orientation?.unlock?.() } catch {}
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
  const buffPct = duration ? (buffered / duration) * 100 : 0

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
      className="vp-container"
      onMouseMove={resetHide}
      onMouseLeave={() => { if (videoRef.current && !videoRef.current.paused) setShowCtrl(false) }}
    >
      <video ref={videoRef} className="vp-video" playsInline preload="metadata" />

      {/* Spinner */}
      {loading && !error && (
        <div className="vp-abs-center"><div className="vp-spinner" /></div>
      )}

      {/* Error */}
      {error && (
        <div className="vp-abs-center vp-err-bg">
          <AlertCircle size={28} color="#f87171" />
          <p className="vp-err-txt">{error}</p>
          <button className="vp-retry" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {/* Skip flash */}
      {skipFlash && (
        <div key={skipFlash.ts} className={`vp-skip ${skipFlash.dir}`}>
          <span className="vp-skip-arr">{skipFlash.dir === 'right' ? '▶▶' : '◀◀'}</span>
          <span className="vp-skip-lbl">10s</span>
        </div>
      )}

      {/* Touch layer — sits below controls */}
      <div
        className="vp-touch"
        onTouchEnd={onVideoTouchEnd}
        onClick={typeof window !== 'undefined' && !('ontouchstart' in window) ? togglePlay : undefined}
      />

      {/* Gradient + controls */}
      <div className={`vp-ctrl-wrap ${showCtrl || !playing ? 'on' : 'off'}`}>

        {/* Seek */}
        <div className="vp-seek-area">
          <div
            className="vp-seek-track"
            onMouseDown={onSeekMouseDown}
            onTouchStart={onSeekTouchStart}
          >
            <div className="vp-seek-bg" />
            <div className="vp-seek-buf" style={{ width: `${buffPct}%` }} />
            <div className="vp-seek-prog" style={{ width: `${seekPct}%` }} />
            <div className="vp-seek-thumb" style={{ left: `${seekPct}%` }} />
          </div>
          <div className="vp-times">
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="vp-row">
          <button className="vpb" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={18} style={{ fill: 'currentColor' }} /> : <Play size={18} style={{ fill: 'currentColor', marginLeft: 2 }} />}
          </button>
          <button className="vpb" onClick={() => doSkip(-10)} aria-label="Rewind 10s"><SkipBack size={16} /></button>
          <button className="vpb" onClick={() => doSkip(10)}  aria-label="Forward 10s"><SkipForward size={16} /></button>

          {/* Desktop volume */}
          <button className="vpb vp-d" onClick={toggleMute}>
            {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
            onChange={e => changeVol(parseFloat(e.target.value))}
            className="vp-vol vp-d" onClick={e => e.stopPropagation()} />

          {/* Mobile mute */}
          <button className="vpb vp-m" onClick={toggleMute}>
            {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <div style={{ flex: 1 }} />

          {speed !== 1 && <span className="vp-spbadge">{speed}x</span>}

          {pipSupported && (
            <button className={`vpb ${pip ? 'vpa' : ''}`} onClick={togglePip}><PictureInPicture2 size={14} /></button>
          )}

          {/* Settings */}
          <div style={{ position: 'relative' }}>
            <button
              className={`vpb ${showSettings ? 'vpa' : ''}`}
              onClick={e => { e.stopPropagation(); setShowSettings(v => !v) }}
              aria-label="Settings" aria-expanded={showSettings}
            ><Settings size={14} /></button>

            {showSettings && (
              <div
                className="vp-spanel"
                onClick={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                <div className="vp-stabs">
                  <button className={`vp-stab ${settingsTab === 'speed' ? 'on' : ''}`}
                    onClick={() => setSettingsTab('speed')}>Speed</button>
                  {levels.length > 0 && (
                    <button className={`vp-stab ${settingsTab === 'quality' ? 'on' : ''}`}
                      onClick={() => setSettingsTab('quality')}>Quality</button>
                  )}
                  <button className="vp-sclose" onClick={() => setShowSettings(false)}><X size={12} /></button>
                </div>

                {settingsTab === 'speed' && (
                  <div className="vp-sgrid">
                    {SPEEDS.map(s => (
                      <button key={s} className={`vp-sbtn ${speed === s ? 'on' : ''}`}
                        onClick={() => changeSpeed(s)}>{s}x</button>
                    ))}
                  </div>
                )}

                {settingsTab === 'quality' && levels.length > 0 && (
                  <div className="vp-sqlist">
                    {[-1, ...levels.map((_, i) => i)].map(l => (
                      <button key={l} className={`vp-sqitem ${currentLevel === l ? 'on' : ''}`}
                        onClick={() => changeQuality(l)}>
                        <span>{qualityLabel(l)}</span>
                        {l === -1 && <span className="vp-sqrec">recommended</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="vpb" onClick={toggleFS}>
            {fullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      {pip && <div className="vp-pip">PiP</div>}
    </div>
  )
}

// ─── YouTube Player ───────────────────────────────────────────────────────────
function YouTubePlayer({ url, title }) {
  const ytId = extractYTId(url)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  const embedSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`
    : null
  const liveSrc = !ytId && url

  if (!embedSrc && !liveSrc) return (
    <div className="yt-err">
      <AlertCircle size={24} color="#f87171" />
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>YouTube URL parse nahi hua</p>
    </div>
  )

  return (
    <div className="yt-shell">
      {loading && (
        <div className="vp-abs-center" style={{ zIndex: 10, background: '#0d0d0d' }}>
          <div className="vp-spinner" style={{ borderTopColor: '#ff4444', borderColor: 'rgba(255,68,68,0.12)' }} />
        </div>
      )}
      {error && (
        <div className="vp-abs-center vp-err-bg" style={{ zIndex: 10 }}>
          <AlertCircle size={26} color="#f87171" />
          <p className="vp-err-txt">Video load nahi hua</p>
          <button className="vp-retry" onClick={() => { setError(false); setLoading(true) }}>Retry</button>
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

// ─── Mark Complete ────────────────────────────────────────────────────────────
function MarkCompleteBtn({ onClick }) {
  const [done, setDone] = useState(false)
  const handle = () => {
    if (done) return
    setDone(true)
    onClick?.()
  }
  return (
    <button className={`mc-btn ${done ? 'mc-done' : ''}`} onClick={handle}>
      <span className="mc-icon">
        {done ? <Check size={16} strokeWidth={2.5} /> : <CheckCircle size={16} />}
      </span>
      <span>{done ? 'Completed!' : 'Mark as Complete'}</span>
      {done && <span className="mc-pop" aria-hidden="true">🎉</span>}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
    <div className="vp-pgload"><div className="vp-spinner" style={{ width: 38, height: 38 }} /></div>
  )
  if (!content) return (
    <div className="vp-pgload">
      <AlertCircle size={28} color="#f87171" />
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 10 }}>Content nahi mila.</p>
    </div>
  )

  const isYT = isYouTubeURL(content.url)

  return (
    <div className="vp-page">
      {/* Background */}
      <div className="vp-bg" aria-hidden="true">
        <div className="vp-bg-dots" />
        <div className="vp-orb vp-o1" />
        <div className="vp-orb vp-o2" />
        <div className="vp-orb vp-o3" />
      </div>

      <div className="vp-wrap">
        {/* Player */}
        <div className="vp-card">
          {isYT
            ? <YouTubePlayer url={content.url} title={content.title} />
            : <CustomPlayer
                url={content.url} savedPos={savedPos}
                onProgress={pos => saveProg.mutate({ position: pos, subjectId: content.subjectId })}
                onComplete={() => saveProg.mutate({ completed: true, position: 0, subjectId: content.subjectId })}
              />
          }
        </div>

        {/* Title + description + actions */}
        <div className="vp-meta">
          <h1 className="vp-title">{content.title}</h1>
          {content.description && <p className="vp-desc">{content.description}</p>}
          <MarkCompleteBtn
            onClick={() => saveProg.mutate({ completed: true, position: 0, subjectId: content.subjectId })}
          />
        </div>
      </div>

      <style>{`
        /* ─ Reset ─────────────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ─ Page & BG ─────────────────────────────────────── */
        .vp-page {
          min-height: 100vh;
          background: #07090f;
          font-family: 'DM Sans', 'Inter', system-ui, sans-serif;
          position: relative; overflow-x: hidden;
        }
        .vp-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .vp-bg-dots {
          position: absolute; inset: -40px;
          background-image: radial-gradient(rgba(99,102,241,0.18) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 20%, transparent 100%);
        }
        .vp-orb {
          position: absolute; border-radius: 50%;
          filter: blur(90px);
          animation: orbF 14s ease-in-out infinite alternate;
        }
        .vp-o1 {
          width: 640px; height: 640px; top: -180px; left: -180px;
          background: radial-gradient(circle, rgba(79,70,229,0.28), transparent 70%);
        }
        .vp-o2 {
          width: 520px; height: 520px; bottom: -120px; right: -100px;
          background: radial-gradient(circle, rgba(14,165,233,0.2), transparent 70%);
          animation-duration: 11s; animation-direction: alternate-reverse;
        }
        .vp-o3 {
          width: 380px; height: 380px; top: 45%; left: 55%;
          background: radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%);
          opacity: 0.8; animation-duration: 18s;
        }
        @keyframes orbF {
          0%   { transform: translate(0,0) scale(1); }
          100% { transform: translate(28px,36px) scale(1.1); }
        }

        /* ─ Layout ────────────────────────────────────────── */
        .vp-wrap {
          position: relative; z-index: 1;
          max-width: 880px; margin: 0 auto;
          padding: 24px 16px 48px;
        }
        .vp-card {
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.7);
          background: #0d0d0d; margin-bottom: 20px;
        }
        .vp-meta { padding: 0 2px; }
        .vp-title {
          font-size: clamp(15px, 2.8vw, 21px);
          font-weight: 600; color: #e8eaf0;
          line-height: 1.35; letter-spacing: -0.015em;
          margin-bottom: 10px;
        }
        .vp-desc {
          font-size: 13.5px; color: rgba(255,255,255,0.35);
          line-height: 1.65; margin-bottom: 20px;
        }

        /* ─ Mark complete ─────────────────────────────────── */
        .mc-btn {
          position: relative; overflow: hidden;
          display: inline-flex; align-items: center; gap: 9px;
          padding: 12px 24px;
          border-radius: 12px;
          border: 1px solid rgba(52,211,153,0.3);
          background: rgba(52,211,153,0.07);
          color: #34d399;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, transform 0.15s, color 0.2s, box-shadow 0.2s;
        }
        .mc-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, transparent 40%, rgba(52,211,153,0.12));
          opacity: 0; transition: opacity 0.2s;
        }
        .mc-btn:hover:not(.mc-done)::before { opacity: 1; }
        .mc-btn:hover:not(.mc-done) {
          background: rgba(52,211,153,0.13);
          border-color: rgba(52,211,153,0.5);
          box-shadow: 0 0 24px rgba(52,211,153,0.12);
          transform: translateY(-1px);
        }
        .mc-btn:active { transform: scale(0.97) !important; }
        .mc-btn.mc-done {
          background: rgba(52,211,153,0.15);
          border-color: rgba(52,211,153,0.45);
          color: #6ee7b7;
          animation: mcPop 0.45s cubic-bezier(0.34,1.56,0.64,1);
        }
        .mc-icon { display: flex; align-items: center; }
        .mc-btn.mc-done .mc-icon {
          animation: iconIn 0.45s cubic-bezier(0.34,1.56,0.64,1);
        }
        .mc-pop {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          animation: popFly 0.7s ease forwards; font-size: 18px;
        }
        @keyframes mcPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.07); }
          100% { transform: scale(1); }
        }
        @keyframes iconIn {
          0%   { transform: rotate(-120deg) scale(0.5); opacity: 0; }
          100% { transform: rotate(0deg) scale(1); opacity: 1; }
        }
        @keyframes popFly {
          0%   { transform: translateY(-50%) scale(0.5); opacity: 1; }
          100% { transform: translateY(calc(-50% - 30px)) scale(1.3); opacity: 0; }
        }

        /* ─ Page loading ──────────────────────────────────── */
        .vp-pgload {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: #07090f; gap: 12px;
        }

        /* ─ Player container ──────────────────────────────── */
        .vp-container {
          position: relative; width: 100%; aspect-ratio: 16/9;
          background: #0d0d0d;
          user-select: none; -webkit-user-select: none;
          touch-action: none;
        }
        .vp-video { width: 100%; height: 100%; display: block; object-fit: contain; }

        /* Fullscreen + auto-rotate */
        .vp-container:fullscreen,
        .vp-container:-webkit-full-screen {
          width: 100vw; height: 100vh; aspect-ratio: unset;
        }

        /* ─ Shared utils ──────────────────────────────────── */
        .vp-abs-center {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 12px;
        }
        .vp-err-bg { background: rgba(0,0,0,0.9); }
        .vp-err-txt { color: rgba(255,255,255,0.55); font-size: 13px; text-align: center; padding: 0 20px; line-height: 1.5; }
        .vp-retry {
          font-size: 12px; color: white;
          background: rgba(255,255,255,0.1);
          border: 0.5px solid rgba(255,255,255,0.18);
          border-radius: 9px; padding: 6px 18px; cursor: pointer;
          transition: background 0.15s;
        }
        .vp-retry:hover { background: rgba(255,255,255,0.16); }

        /* ─ Spinner ───────────────────────────────────────── */
        .vp-spinner {
          width: 44px; height: 44px; border-radius: 50%;
          border: 2.5px solid rgba(255,255,255,0.1);
          border-top-color: white;
          animation: spin 0.82s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ─ Skip flash ────────────────────────────────────── */
        .vp-skip {
          position: absolute; top: 50%; transform: translateY(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          pointer-events: none; z-index: 5;
          animation: skipFade 0.7s forwards;
        }
        .vp-skip.right { right: 10%; }
        .vp-skip.left  { left: 10%;  }
        .vp-skip-arr { font-size: 28px; font-weight: 900; color: white; line-height: 1; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
        .vp-skip-lbl { font-size: 11px; color: rgba(255,255,255,0.75); font-weight: 600; }
        @keyframes skipFade { 0%{opacity:1} 55%{opacity:1} 100%{opacity:0} }

        /* ─ Touch layer ───────────────────────────────────── */
        .vp-touch { position: absolute; inset: 0; z-index: 1; }

        /* ─ Controls ──────────────────────────────────────── */
        .vp-ctrl-wrap {
          position: absolute; inset: 0; z-index: 2;
          display: flex; flex-direction: column; justify-content: flex-end;
          background: linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.22) 40%, transparent 68%);
          transition: opacity 0.22s ease;
          pointer-events: none;
        }
        .vp-ctrl-wrap.on  { opacity: 1; }
        .vp-ctrl-wrap.off { opacity: 0; }
        .vp-ctrl-wrap.on > * { pointer-events: auto; }

        /* ─ Seek ──────────────────────────────────────────── */
        .vp-seek-area { padding: 0 14px 2px; }
        .vp-seek-track {
          position: relative; height: 24px; cursor: pointer; touch-action: none;
          display: flex; align-items: center;
        }
        .vp-seek-bg {
          position: absolute; inset: 0; margin: auto;
          height: 4px; border-radius: 4px;
          background: rgba(255,255,255,0.18);
        }
        .vp-seek-buf {
          position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          height: 4px; border-radius: 4px;
          background: rgba(255,255,255,0.22);
          pointer-events: none;
        }
        .vp-seek-prog {
          position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          height: 4px; border-radius: 4px;
          background: linear-gradient(90deg, #818cf8, #6366f1);
          pointer-events: none;
        }
        .vp-seek-thumb {
          position: absolute; top: 50%;
          width: 16px; height: 16px; border-radius: 50%;
          background: white;
          transform: translate(-50%, -50%);
          box-shadow: 0 1px 8px rgba(0,0,0,0.5);
          pointer-events: none;
          transition: transform 0.12s;
        }
        .vp-seek-track:hover .vp-seek-thumb,
        .vp-seek-track:active .vp-seek-thumb { transform: translate(-50%,-50%) scale(1.3); }
        .vp-times {
          display: flex; justify-content: space-between; padding: 3px 2px 0;
          font-size: 11px; font-family: 'Courier New', monospace;
          color: rgba(255,255,255,0.45);
        }

        /* ─ Controls row ──────────────────────────────────── */
        .vp-row {
          display: flex; align-items: center; gap: 2px;
          padding: 0 8px 12px;
        }
        .vpb {
          width: 36px; height: 36px; min-width: 36px;
          display: flex; align-items: center; justify-content: center;
          color: white; border-radius: 8px;
          border: none; background: transparent;
          cursor: pointer; flex-shrink: 0;
          transition: color 0.15s, background 0.15s, transform 0.1s;
        }
        .vpb:hover { color: #a5b4fc; background: rgba(255,255,255,0.09); }
        .vpb:active { transform: scale(0.85); }
        .vpa { color: #a5b4fc !important; }
        .vp-vol {
          width: 68px; accent-color: #818cf8; cursor: pointer;
        }
        .vp-spbadge {
          font-size: 10px; font-family: monospace;
          background: rgba(129,140,248,0.22); color: #a5b4fc;
          padding: 2px 7px; border-radius: 5px; margin-right: 2px; flex-shrink: 0;
        }

        /* Desktop/mobile visibility */
        .vp-d { display: none !important; }
        @media (min-width: 580px) {
          .vp-d { display: flex !important; }
          .vp-m { display: none !important; }
          .vp-vol { display: block !important; }
        }
        .vp-m { display: flex !important; }

        /* ─ Settings panel ────────────────────────────────── */
        .vp-spanel {
          position: absolute; bottom: 48px; right: 0;
          width: min(240px, 88vw);
          background: rgba(8,8,16,0.98);
          border: 0.5px solid rgba(255,255,255,0.12);
          border-radius: 14px; overflow: hidden;
          z-index: 50; box-shadow: 0 8px 40px rgba(0,0,0,0.8);
          animation: spOpen 0.18s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes spOpen {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .vp-stabs {
          display: flex; position: relative;
          border-bottom: 0.5px solid rgba(255,255,255,0.1);
        }
        .vp-stab {
          flex: 1; padding: 12px 0; font-size: 12px; font-weight: 600;
          color: rgba(255,255,255,0.35);
          background: none; border: none; cursor: pointer;
          transition: color 0.15s;
        }
        .vp-stab.on { color: #a5b4fc; }
        .vp-sclose {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.3); background: none; border: none;
          cursor: pointer; display: flex; align-items: center; padding: 5px;
          border-radius: 6px; transition: background 0.15s;
        }
        .vp-sclose:hover { background: rgba(255,255,255,0.08); }
        .vp-sgrid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 6px; padding: 10px;
        }
        .vp-sbtn {
          padding: 11px 0; border-radius: 10px;
          font-size: 12px; font-weight: 600;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.6);
          border: none; cursor: pointer;
          transition: background 0.15s, color 0.15s, transform 0.1s;
        }
        .vp-sbtn:hover { background: rgba(255,255,255,0.1); color: white; }
        .vp-sbtn:active { transform: scale(0.93); }
        .vp-sbtn.on { background: #4f46e5; color: white; }
        .vp-sqlist { padding: 8px; max-height: 200px; overflow-y: auto; }
        .vp-sqitem {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 9px 12px; border-radius: 9px;
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.6);
          background: transparent; border: none; cursor: pointer;
          transition: background 0.12s, color 0.12s;
          text-align: left;
        }
        .vp-sqitem.on { background: #4f46e5; color: white; }
        .vp-sqitem:not(.on):hover { background: rgba(255,255,255,0.07); }
        .vp-sqrec { font-size: 10px; color: rgba(255,255,255,0.28); }
        .vp-sqitem.on .vp-sqrec { color: rgba(255,255,255,0.55); }

        /* ─ PiP badge ─────────────────────────────────────── */
        .vp-pip {
          position: absolute; top: 10px; left: 10px; z-index: 10;
          background: rgba(79,70,229,0.9); color: white;
          font-size: 11px; font-weight: 700;
          padding: 3px 10px; border-radius: 7px;
          pointer-events: none; letter-spacing: 0.04em;
        }

        /* ─ YouTube shell ─────────────────────────────────── */
        .yt-shell {
          position: relative; width: 100%; aspect-ratio: 16/9; background: #0d0d0d;
        }
        .yt-err {
          width: 100%; aspect-ratio: 16/9; background: #0d0d0d;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px;
        }

        /* ─ Mobile tweaks ─────────────────────────────────── */
        @media (max-width: 380px) {
          .vp-row { padding: 0 4px 10px; gap: 0; }
          .vpb { width: 30px; height: 30px; min-width: 30px; }
          .vp-wrap { padding: 12px 10px 32px; }
          .vp-title { font-size: 15px; }
        }

        /* ─ Scrollbar for quality list ────────────────────── */
        .vp-sqlist::-webkit-scrollbar { width: 3px; }
        .vp-sqlist::-webkit-scrollbar-track { background: transparent; }
        .vp-sqlist::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
      `}</style>
    </div>
  )
}

export default VideoPlayer
