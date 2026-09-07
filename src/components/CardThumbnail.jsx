import { useState, useEffect } from 'react'
import { getThumbnailCandidates, getVideoFrameSrc } from '../utils/thumbnail'
import { APP_LOGO_URL } from '../constants/branding'

/**
 * Fills its parent (use with a `relative` card wrapper) with a stretched
 * background thumbnail. Falls through maxres → hq → mq → default YouTube
 * thumbnail sizes automatically if one 404s. If none of those exist (a
 * direct/self-hosted video with no uploaded thumbnail), it falls back to
 * the video file itself — paused at roughly where the learner left off —
 * so there's always a real frame instead of a blank card. If that also
 * fails (or the item has no video/pdf at all), the app logo is shown so
 * every card/list across the app has a consistent placeholder — pass a
 * custom `fallback` only when a page genuinely needs something else.
 */
const DefaultLogoFallback = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
    <img src={APP_LOGO_URL} alt="" className="w-1/3 h-1/3 object-contain opacity-30 grayscale" />
  </div>
)

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

  return fallback || <DefaultLogoFallback />
}
