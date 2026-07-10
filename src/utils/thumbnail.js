export function extractYouTubeId(url) {
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

/**
 * Ordered list of thumbnail URLs worth trying for a piece of content:
 * whatever the backend supplied first, then YouTube's own CDN at
 * decreasing quality. `maxresdefault.jpg` is only generated for videos
 * uploaded in HD, so relying on it alone is why thumbnails were missing
 * for a lot of videos — `hqdefault.jpg` is generated for essentially
 * every public YouTube video, so it's included as a guaranteed fallback.
 */
export function getThumbnailCandidates(item) {
  const candidates = []
  if (item?.thumbnailUrl) candidates.push(item.thumbnailUrl)
  const ytId = extractYouTubeId(item?.url || item?.videoUrl || item?.youtubeUrl)
  if (ytId) {
    candidates.push(
      `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${ytId}/default.jpg`,
    )
  }
  return candidates
}
