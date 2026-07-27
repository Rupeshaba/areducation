import { useState, useEffect, useRef } from 'react'
import { getThumbnailCandidates, extractYouTubeId } from '../utils/thumbnail'

/**
 * Fills its parent (use with a `relative` card wrapper) with a thumbnail
 * that always fully stretches to cover the box (object-cover — no gaps,
 * no letterboxing).
 *
 * Resolution order:
 *  1. Whatever image URLs the backend/YouTube CDN can supply
 *     (getThumbnailCandidates — thumbnailUrl, then maxres → hq → mq → default).
 *  2. If none of those load (e.g. a directly-hosted video with no uploaded
 *     thumbnail and no YouTube ID), grab a frame from partway through the
 *     video itself and use that as the thumbnail — so nothing ever falls
 *     back to a blank/logo card just because a thumbnail wasn't uploaded.
 *  3. `fallback` (e.g. the brand logo) only if even frame-capture fails
 *     (private video, missing file, CORS-blocked source, etc.)
 */
export default function CardThumbnail({ item, alt = '', className = '', fallback = null }) {
  const candidates = getThumbnailCandidates(item)
  const [idx, setIdx] = useState(0)
  const [framePreview, setFramePreview] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const rawVideoUrl = item?.url || item?.videoUrl
  const isYouTube = !!extractYouTubeId(rawVideoUrl)

  useEffect(() => {
    setIdx(0)
    setFramePreview(null)
  }, [item?.thumbnailUrl, item?.url, item?.videoUrl])

  const noImageCandidatesLeft = candidates.length === 0 || idx >= candidates.length
  const canTryFrameCapture = noImageCandidatesLeft && !!rawVideoUrl && !isYouTube && !framePreview

  const captureFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    try {
      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 180
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.78)
      setFramePreview(dataUrl)
    } catch (e) {
      // Tainted canvas (cross-origin video without CORS headers) or other
      // decode failure — silently keep showing `fallback`.
    }
  }

  const handleLoadedMetadata = () => {
    const video = videoRef.current
    if (!video) return
    // A few seconds in tends to skip black/blank opening frames.
    const seekTo = Math.min(3, (video.duration || 6) * 0.15)
    try {
      video.currentTime = seekTo
    } catch {
      /* ignore */
    }
  }

  // 1. Captured video frame (once ready) — always wins so it replaces the
  //    hidden capture rig with a plain, cheap <img>.
  if (framePreview) {
    return (
      <img
        src={framePreview}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
      />
    )
  }

  // 2. Known image candidates (thumbnailUrl / YouTube CDN sizes).
  if (!noImageCandidatesLeft) {
    return (
      <img
        src={candidates[idx]}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
        onError={() => setIdx((i) => i + 1)}
      />
    )
  }

  // 3. No thumbnail exists at all — pull a frame straight out of the video.
  if (canTryFrameCapture) {
    return (
      <>
        <video
          ref={videoRef}
          src={rawVideoUrl}
          crossOrigin="anonymous"
          muted
          playsInline
          preload="metadata"
          className="hidden"
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={captureFrame}
          onError={() => setFramePreview(null)}
        />
        <canvas ref={canvasRef} className="hidden" />
        {fallback}
      </>
    )
  }

  // 4. Everything failed — brand fallback.
  return fallback
}
