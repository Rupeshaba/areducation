/**
 * Client-side cache of every quiz attempt a user has ever submitted.
 *
 * The backend only exposes a single `/quiz/attempt/:attemptId` lookup and a
 * best-score/attempt-count summary per quiz — there's no endpoint to list
 * every past attempt for a quiz. So instead of round-tripping to the server,
 * every submit result is cached here (localStorage) and everything that
 * needs "attempt history" (Home's recent activity, the result page's
 * attempt dropdown + progress graph, per-question time in analysis) reads
 * from this cache first.
 */

const STORAGE_KEY = 'ar_quiz_cache_v1'
const MAX_ATTEMPTS_PER_QUIZ = 20
const MAX_QUIZZES = 60

export function quizKey(subject, quizName) {
  return `${subject || ''}::${quizName || ''}`
}

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    return true
  } catch {
    // Likely quota exceeded — drop the heaviest field (per-question
    // `results` breakdown) from the oldest attempts and retry once.
    try {
      const entries = Object.values(store)
      const allAttempts = []
      entries.forEach(e => e.attempts.forEach(a => allAttempts.push(a)))
      allAttempts
        .sort((a, b) => a.completedAt - b.completedAt)
        .slice(0, Math.ceil(allAttempts.length / 2))
        .forEach(a => { delete a.results })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
      return true
    } catch {
      return false
    }
  }
}

/**
 * Save a freshly-submitted attempt. `attempt` should contain at least:
 * { attemptId, score, correct, wrong, skipped, total, points, timeTaken,
 *   questionTimes, results, completedAt }
 */
export function saveAttempt(subject, quizName, attempt) {
  const store = readStore()
  const key = quizKey(subject, quizName)

  if (!store[key]) {
    store[key] = { subject, quizName, attempts: [] }
  }

  // Dedupe by attemptId (e.g. re-navigating to the same result page).
  const existing = store[key].attempts.filter(a => a.attemptId !== attempt.attemptId)
  store[key].attempts = [attempt, ...existing]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, MAX_ATTEMPTS_PER_QUIZ)

  // Bound total number of distinct quizzes tracked — drop the
  // least-recently-active ones first.
  const keys = Object.keys(store)
  if (keys.length > MAX_QUIZZES) {
    const sorted = keys
      .map(k => ({ k, last: store[k].attempts[0]?.completedAt || 0 }))
      .sort((a, b) => a.last - b.last)
    sorted.slice(0, keys.length - MAX_QUIZZES).forEach(({ k }) => delete store[k])
  }

  writeStore(store)
  return store[key]
}

export function getQuizEntry(subject, quizName) {
  const store = readStore()
  return store[quizKey(subject, quizName)] || null
}

/** One entry per unique quiz, sorted by most recently attempted first. */
export function getRecentQuizzes(limit = 10) {
  const store = readStore()
  return Object.values(store)
    .filter(e => e.attempts && e.attempts.length > 0)
    .sort((a, b) => b.attempts[0].completedAt - a.attempts[0].completedAt)
    .slice(0, limit)
}

/** Find a cached attempt by its attemptId, wherever it lives. */
export function findAttemptById(attemptId) {
  if (!attemptId) return null
  const store = readStore()
  for (const entry of Object.values(store)) {
    const idx = entry.attempts.findIndex(a => String(a.attemptId) === String(attemptId))
    if (idx !== -1) {
      return {
        subject: entry.subject,
        quizName: entry.quizName,
        attempt: entry.attempts[idx],
        attempts: entry.attempts,
        index: idx,
      }
    }
  }
  return null
}
