// Shared fullscreen + landscape-lock helpers used by both the video stage and
// the PDF stage so both open the exact same way — full app, no chrome, locked
// to landscape wherever the platform allows it.

import { useEffect, useState } from 'react'

// Try to go fullscreen + lock landscape. Falls back silently where unsupported (iOS etc.)
export async function goFullscreenLandscape(el, videoEl) {
  try {
    if (!document.fullscreenElement) {
      await (el?.requestFullscreen?.() || el?.webkitRequestFullscreen?.())
    }
  } catch (e) { /* ignore */ }
  // Give the browser a frame to actually register the fullscreen change
  // before asking for the orientation lock — some browsers fire
  // fullscreenchange a tick after the requestFullscreen() promise settles,
  // and locking too early fails silently on those.
  await new Promise((r) => requestAnimationFrame(r))
  try {
    if (window.screen?.orientation?.lock) {
      await window.screen.orientation.lock('landscape')
    }
  } catch (e) { /* not supported / not allowed outside fullscreen */ }
  // iOS Safari: element fullscreen mostly unsupported — use native video fullscreen
  // which auto-rotates to landscape for landscape-sized videos.
  if (!document.fullscreenElement && videoEl?.webkitEnterFullscreen) {
    try { videoEl.webkitEnterFullscreen() } catch (e) { /* ignore */ }
  }
}

export function exitFullscreenAndUnlock() {
  try { if (document.fullscreenElement) document.exitFullscreen?.() } catch (e) {}
  try { window.screen?.orientation?.unlock?.() } catch (e) {}
}

// Plain fullscreen, no orientation lock at all — used by the PDF reader,
// which (unlike video) should stay in whatever orientation the device is
// already in (normally portrait) instead of forcing landscape.
export async function goFullscreenOnly(el) {
  try {
    if (!document.fullscreenElement) {
      await (el?.requestFullscreen?.() || el?.webkitRequestFullscreen?.())
    }
  } catch (e) { /* ignore */ }
}

// screen.orientation.lock() only actually rotates the screen on Android
// Chrome-family browsers inside a fullscreen element — it's unsupported on
// iOS Safari and most desktop browsers, so on those the video would open
// fullscreen but stay portrait-shaped until the person physically turns
// their phone. This hook makes "fullscreen" *look* landscape immediately
// everywhere else too, by rotating the player box with CSS whenever it's
// fullscreen and the viewport is still taller than it is wide. If the real
// orientation lock above did succeed, the viewport itself is already
// landscape-shaped by then, so this fallback naturally no-ops — the two
// never fight each other.
export function useForcedLandscapeStyle(active) {
  const [style, setStyle] = useState(null)

  useEffect(() => {
    if (!active) { setStyle(null); return }

    const update = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      if (h > w) {
        setStyle({
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: `${h}px`,
          height: `${w}px`,
          transform: 'translate(-50%, -50%) rotate(90deg)',
          transformOrigin: 'center center',
        })
      } else {
        setStyle(null)
      }
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [active])

  return style
}
