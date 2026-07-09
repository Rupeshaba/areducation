// ─────────────────────────────────────────────────────────────────────────
// All "which content is completed" state lives ENTIRELY in localStorage.
// Nothing is sent to or read from the backend for this — it's instant,
// works offline, and every page (Subjects list, MyCourses, SubjectDetail,
// Progress) reads the exact same source of truth so the percentages never
// disagree with each other.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ar_completed_content_ids'
const MIGRATION_FLAG = 'ar_completed_migrated_v2'

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

export function markContentCompleted(contentId) {
  if (!contentId) return
  const ids = getCompletedIdsSet()
  if (ids.has(contentId)) return
  ids.add(contentId)
  writeRaw([...ids])
  window.dispatchEvent(new CustomEvent('ar-completion-changed'))
}

export function unmarkContentCompleted(contentId) {
  if (!contentId) return
  const ids = getCompletedIdsSet()
  if (!ids.has(contentId)) return
  ids.delete(contentId)
  writeRaw([...ids])
  window.dispatchEvent(new CustomEvent('ar-completion-changed'))
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
