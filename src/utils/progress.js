// ─────────────────────────────────────────────────────────────────────────
// All "which content is completed" state lives ENTIRELY in localStorage.
// Nothing is sent to or read from the backend for this — it's instant,
// works offline, and every page (Subjects list, MyCourses, SubjectDetail,
// Progress) reads the exact same source of truth so the percentages never
// disagree with each other.
// ─────────────────────────────────────────────────────────────────────────

import api from '../api/axios'

const STORAGE_KEY = 'ar_completed_content_ids'
const MIGRATION_FLAG = 'ar_completed_migrated_v2'
const LOG_KEY = 'ar_completion_log'
const MAX_LOG_ENTRIES = 500
const LAST_PLAYED_KEY = 'ar_last_played'

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRaw(idsArray) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(idsArray))
  } catch {
    /* storage full or unavailable — fail silently, nothing else to do */
  }
}

// One-time migration from the old scheme (one localStorage key per content:
// `ar_completed_<id>` = 'true'). Keeps everyone's existing completions
// instead of resetting everyone to 0%.
function migrateLegacyKeysOnce() {
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') return
    const ids = new Set(readRaw())
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('ar_completed_') && key !== STORAGE_KEY && localStorage.getItem(key) === 'true') {
        ids.add(key.replace('ar_completed_', ''))
      }
    })
    writeRaw([...ids])
    localStorage.setItem(MIGRATION_FLAG, 'true')
  } catch {
    /* ignore */
  }
}

migrateLegacyKeysOnce()

export function getCompletedIdsSet() {
  return new Set(readRaw())
}

export function isContentCompleted(contentId) {
  if (!contentId) return false
  return getCompletedIdsSet().has(contentId)
}

function readLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function appendLog(contentId) {
  try {
    const log = readLog()
    log.push({ id: contentId, ts: Date.now() })
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-MAX_LOG_ENTRIES)))
  } catch {
    /* ignore */
  }
}

function removeFromLog(contentId) {
  try {
    const log = readLog().filter((e) => e.id !== contentId)
    localStorage.setItem(LOG_KEY, JSON.stringify(log))
  } catch {
    /* ignore */
  }
}

export function markContentCompleted(contentId, meta = {}) {
  if (!contentId) return
  const ids = getCompletedIdsSet()
  if (ids.has(contentId)) return
  ids.add(contentId)
  writeRaw([...ids])
  appendLog(contentId)
  window.dispatchEvent(new CustomEvent('ar-completion-changed'))

  // Local state above is instant and always the source of truth for this
  // device's UI. This is a best-effort mirror to the account so the same
  // completion shows up when the user opens another (synced) device —
  // failures here are silently ignored, never block the local UX.
  api.post(`/user/progress/${contentId}/complete`, {
    subjectId: meta.subjectId,
    courseId: meta.courseId,
  }).catch(() => {})
}

export function unmarkContentCompleted(contentId, meta = {}) {
  if (!contentId) return
  const ids = getCompletedIdsSet()
  if (!ids.has(contentId)) return
  ids.delete(contentId)
  writeRaw([...ids])
  removeFromLog(contentId)
  window.dispatchEvent(new CustomEvent('ar-completion-changed'))

  api.post(`/user/content/${contentId}/progress`, {
    completed: false,
    subjectId: meta.subjectId,
    courseId: meta.courseId,
  }).catch(() => {})
}

/**
 * Merge content ids the backend already has marked "completed" for this
 * account (e.g. done on a different device) into the local set. Used
 * wherever a page already fetches backend progress for a subject/course.
 */
export function mergeCompletedIds(ids = []) {
  if (!ids.length) return
  const current = getCompletedIdsSet()
  let changed = false
  ids.forEach((id) => {
    if (!current.has(id)) {
      current.add(id)
      changed = true
    }
  })
  if (changed) {
    writeRaw([...current])
    window.dispatchEvent(new CustomEvent('ar-completion-changed'))
  }
}

/**
 * Last 7 days of content-completion activity (including today), oldest
 * first — used by the Progress page's weekly activity bar chart. Days
 * with no completions still appear with count 0 so the chart always
 * shows a full week.
 */
export function getWeeklyActivity() {
  const log = readLog()
  const days = []
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const start = d.getTime()
    const end = start + 24 * 60 * 60 * 1000
    const count = log.filter((e) => e.ts >= start && e.ts < end).length
    days.push({ label: dayLabels[d.getDay()], count })
  }
  return days
}

// ─────────────────────────────────────────────────────────────────────────
// "Last played" tracking — remembers, per subject, which content the user
// opened most recently, so SubjectDetail can auto-scroll back to it.
// Stored as { [subjectId]: { contentId, ts } } so multiple subjects each
// keep their own last-played pointer instead of overwriting one another.
// ─────────────────────────────────────────────────────────────────────────

function readLastPlayedMap() {
  try {
    const raw = localStorage.getItem(LAST_PLAYED_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeLastPlayedMap(map) {
  try {
    localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(map))
  } catch {
    /* storage full or unavailable — fail silently */
  }
}

/**
 * Call this the moment the user opens a piece of content (video or PDF) —
 * typically on click, right before navigating to the content page. Safe to
 * call repeatedly; only the most recent call per subject sticks.
 */
export function setLastPlayed(contentId, meta = {}) {
  if (!contentId || !meta.subjectId) return
  const map = readLastPlayedMap()
  map[meta.subjectId] = { contentId, ts: Date.now() }
  writeLastPlayedMap(map)
}

/**
 * Returns the content id last opened within a given subject, or null if
 * nothing has been played there yet (or on a fresh device).
 */
export function getLastPlayed(subjectId) {
  if (!subjectId) return null
  const map = readLastPlayedMap()
  return map[subjectId]?.contentId ?? null
}

/**
 * Clears the last-played pointer for a subject — e.g. if the referenced
 * content no longer exists in the list, callers can drop the stale entry.
 */
export function clearLastPlayed(subjectId) {
  if (!subjectId) return
  const map = readLastPlayedMap()
  if (map[subjectId]) {
    delete map[subjectId]
    writeLastPlayedMap(map)
  }
}

export function toggleContentCompleted(contentId) {
  if (isContentCompleted(contentId)) unmarkContentCompleted(contentId)
  else markContentCompleted(contentId)
}

// Flattens a `/subjects/:id` response (chaptered or flat) into one content array.
export function flattenSubjectContents(subject) {
  const chapters = subject?.chapters ?? []
  if (chapters.length > 0) return chapters.flatMap((ch) => ch.contents ?? [])
  return subject?.contents ?? []
}

// Given a list of content objects, returns { completed, total } counted
// strictly against the ids that actually belong to that list — never a
// raw global count, which is what previously caused a subject to show a
// non-zero % even when nothing in it was completed.
export function computeContentsProgress(contents = []) {
  const completedIds = getCompletedIdsSet()
  const total = contents.length
  const completed = contents.filter((c) => completedIds.has(c.id)).length
  return { completed, total }
}
