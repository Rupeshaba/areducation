import { useState, useEffect } from 'react'
import { getThumbnailCandidates, getVideoFrameSrc } from '../utils/thumbnail'
import { APP_LOGO_URL } from '../constants/branding'

/**
 * Fills its parent (use with a `relative` card wrapper) with a thumbnail
 * that is always shown in full — never cropped or zoomed — using
 * object-fill so the entire image stretches to fill the available space
 * exactly — never cropped, never letterboxed with empty gaps.
 * Falls through maxres → hq → mq → default YouTube thumbnail sizes
 * automatically if one 404s. If none of those exist (a direct/self-hosted
 * video with no uploaded thumbnail), it falls back to the video file
 * itself — paused at roughly where the learner left off — so there's
 * always a real frame instead of a blank card. If that also fails (or the
 * item has no video/pdf at all), a themed placeholder with the app logo is
 * shown so every card/list across the app has a consistent, on-brand
 * placeholder — pass a custom `fallback` only when a page genuinely needs
 * something else.
 */
const DefaultLogoFallback = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-100 via-primary-50 to-mint-400/20">
    <div className="absolute inset-0 opacity-40 bg-gradient-to-tr from-primary-500/20 via-transparent to-mint-500/20" />
    <img src={APP_LOGO_URL} alt="" className="relative w-1/3 h-1/3 object-contain drop-shadow-sm" />
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
        className={`absolute inset-0 w-full h-full object-fill bg-gray-50 ${className}`}
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
        className={`absolute inset-0 w-full h-full object-fill bg-gray-50 ${className}`}
        onError={() => setVideoFailed(true)}
      />
    )
  }

  return fallback || <DefaultLogoFallback />
}
