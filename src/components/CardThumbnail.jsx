import { useState, useEffect } from 'react'
import { getThumbnailCandidates } from '../utils/thumbnail'

/**
 * Fills its parent (use with a `relative` card wrapper) with a stretched
 * background thumbnail. Falls through maxres → hq → mq → default YouTube
 * thumbnail sizes automatically if one 404s, then finally shows `fallback`.
 */
export default function CardThumbnail({ item, alt = '', className = '', fallback = null }) {
  const candidates = getThumbnailCandidates(item)
  const [idx, setIdx] = useState(0)

  useEffect(() => { setIdx(0) }, [item?.thumbnailUrl, item?.url, item?.videoUrl])

  if (candidates.length === 0 || idx >= candidates.length) {
    return fallback
  }

  return (
    <img
      src={candidates[idx]}
      alt={alt}
      className={`absolute inset-0 w-full h-full object-cover ${className}`}
      onError={() => setIdx((i) => i + 1)}
    />
  )
}
