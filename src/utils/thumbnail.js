export function extractYouTubeId(url) {
  if (!url) return null
  const trimmed = String(url).trim()

  // Bare 11-character video ID with no URL wrapper at all — some import
  // paths store just the ID directly.
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed

  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
    /youtube\.com\/v\/([\w-]{11})/,
  ]
  for (const p of patterns) {
    const m = trimmed.match(p)
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
 *
 * We also try both `i.ytimg.com` and `img.youtube.com` — they're the same
 * CDN, but on some networks one hostname is reachable and the other isn't,
 * which is why a thumbnail can show fine on youtube.com yet fail to load
 * here. Trying both means one blocked host no longer blanks the image.
 */
export function getThumbnailCandidates(item) {
  const candidates = []
  if (item?.thumbnailUrl) candidates.push(item.thumbnailUrl)

  const ytId = extractYouTubeId(item?.url || item?.videoUrl || item?.youtubeUrl || item?.videoId)
  if (ytId) {
    candidates.push(
      `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${ytId}/default.jpg`,
    )
  }
  return candidates
}

/**
 * For direct/self-hosted video files (not YouTube) that have no uploaded
 * thumbnail — use the video file itself as the thumbnail via a media
 * fragment (`#t=<seconds>`), so the frame shown matches roughly where the
 * learner paused, using the same `ar_pos_<contentId>` resume position the
 * player already saves. Returns null for YouTube content or when there's
 * no playable URL, so callers know to fall back to a static image/logo.
 */
export function getVideoFrameSrc(item) {
  const rawUrl = item?.url || item?.videoUrl
  if (!rawUrl || extractYouTubeId(rawUrl)) return null

  const contentId = item?.contentId || item?.id
  let resumeAt = 3
  if (contentId) {
    try {
      const saved = localStorage.getItem(`ar_pos_${contentId}`)
      const pos = parseFloat(saved)
      if (!isNaN(pos) && pos > 1) resumeAt = pos
    } catch {
      // localStorage unavailable — just use the default offset
    }
  }
  return `${rawUrl}#t=${resumeAt}`
}
