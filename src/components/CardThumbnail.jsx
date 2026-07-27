import { useState, useEffect } from 'react'
import { getThumbnailCandidates, getVideoFrameSrc } from '../utils/thumbnail'

/**
 * Fills its parent (use with a `relative` card wrapper) with a stretched
 * background thumbnail. Falls through maxres → hq → mq → default YouTube
 * thumbnail sizes automatically if one 404s. If none of those exist (a
 * direct/self-hosted video with no uploaded thumbnail), it falls back to
 * the video file itself — paused at roughly where the learner left off —
 * so there's always a real frame instead of a blank card. Only shows
 * `fallback` (the logo) once every option above has failed.
 */
export default function CardThumbnail({ item, alt = '', className = '', fallback = null }) {
  const candidates = getThumbnailCandidates(item)
  const [idx, setIdx] = useState(0)
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => { setIdx(0); setVideoFailed(false) }, [item?.thumbnailUrl, item?.url, item?.videoUrl])

  if (idx < candidates.length) {
    return (
      <img
        src={candidates[idx]}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
        onError={() => setIdx((i) => i + 1)}
      />
    )
  }

  const frameSrc = !videoFailed && item?.type !== 'pdf' ? getVideoFrameSrc(item) : null
  if (frameSrc) {
    return (
      <video
        key={frameSrc}
        src={frameSrc}
        muted
        playsInline
        preload="metadata"
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
        onError={() => setVideoFailed(true)}
      />
    )
  }

  return fallback
}
