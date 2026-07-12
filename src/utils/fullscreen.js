// Shared fullscreen + landscape-lock helpers used by both the video stage and
// the PDF stage so both open the exact same way — full app, no chrome, locked
// to landscape wherever the platform allows it.

// Try to go fullscreen + lock landscape. Falls back silently where unsupported (iOS etc.)
export async function goFullscreenLandscape(el, videoEl) {
  try {
    if (!document.fullscreenElement) {
      await (el?.requestFullscreen?.() || el?.webkitRequestFullscreen?.())
    }
  } catch (e) { /* ignore */ }
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
