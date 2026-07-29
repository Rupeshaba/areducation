/**
 * Guest identity for anonymous quiz players.
 *
 * A guest gets a stable id + a display name, both kept in localStorage so we
 * only ever ask for the name once — across every quiz, forever, on this
 * device. When the person later creates an account, `getGuestId()` is handed
 * to the backend's /quiz/claim-guest so their earlier leaderboard rows get
 * merged into the new account.
 */

const ID_KEY = 'ar_guest_id'
const NAME_KEY = 'ar_guest_name'

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID() } catch { /* fall through */ }
  }
  return 'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

/** Stable guest id — created on first use and reused thereafter. */
export function getGuestId() {
  try {
    let id = localStorage.getItem(ID_KEY)
    if (!id) {
      id = uuid()
      localStorage.setItem(ID_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

/** The guest's saved display name, or '' if they haven't given one yet. */
export function getGuestName() {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

export function setGuestName(name) {
  try {
    const clean = String(name || '').trim().slice(0, 40)
    if (clean) localStorage.setItem(NAME_KEY, clean)
    return clean
  } catch {
    return ''
  }
}

export function hasGuestName() {
  return !!getGuestName()
}

/** Clear guest markers — called after a successful claim/merge into an account. */
export function clearGuest() {
  try {
    localStorage.removeItem(ID_KEY)
    localStorage.removeItem(NAME_KEY)
  } catch { /* ignore */ }
}

/**
 * base64 so unicode names (Hindi etc.) can travel safely in an HTTP header,
 * which is latin1-only. Backend decodes X-Guest-Name the same way.
 */
export function encodeGuestName(name) {
  try {
    return btoa(unescape(encodeURIComponent(name || '')))
  } catch {
    return ''
  }
}
