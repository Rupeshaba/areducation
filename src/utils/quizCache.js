/**
 * Client-side cache of every quiz attempt a user has ever submitted.
 *
 * The backend only exposes a single `/quiz/attempt/:attemptId` lookup and a
 * `/quiz/my-attempts` list (account-wide, last 50) — there's no per-quiz
 * history endpoint. So this cache remains the primary read path for
 * everything that needs "attempt history" (Home's recent activity, the
 * result page's attempt dropdown + progress graph, per-question time in
 * analysis), and `mergeAttempts()` below tops it up from `/quiz/my-attempts`
 * so attempts made on another device also show up here.
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
 * { attemptId, quizId, score, correct, wrong, skipped, total, timeTaken,
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

/**
 * Flattens every attempt across every quiz into one list, most recent
 * first — used by the Progress page for "recent attempts", quiz average,
 * best score, and the score-trend graph, so it stays in sync with
 * whatever Home/QuizResult already cache here (no separate storage key
 * to keep in sync).
 */
export function getAllRecentAttempts(limit = 20) {
  const store = readStore()
  const all = []
  Object.values(store).forEach((entry) => {
    entry.attempts.forEach((a) => {
      all.push({
        attemptId: a.attemptId,
        subject: entry.subject,
        quizName: entry.quizName,
        score: Math.round(a.score),
        correct: a.correct,
        total: a.total,
        completedAt: a.completedAt,
      })
    })
  })
  return all.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).slice(0, limit)
}

/**
 * Fold attempts reported by the backend (`GET /quiz/my-attempts`, which is
 * account-wide and therefore includes attempts made on OTHER devices) into
 * this local cache, deduping by attemptId. This is what actually makes quiz
 * history "device-synced" — this cache stays the single read path, we just
 * top it up from the server instead of only ever writing to it locally.
 */
export function mergeAttempts(remoteAttempts = []) {
  if (!remoteAttempts.length) return
  const store = readStore()

  remoteAttempts.forEach((r) => {
    const attemptId = r.id || r.attemptId
    if (!attemptId) return
    const key = quizKey(r.subject, r.quizName)
    if (!store[key]) store[key] = { subject: r.subject, quizName: r.quizName, attempts: [] }

    const already = store[key].attempts.some(a => String(a.attemptId) === String(attemptId))
    if (!already) {
      store[key].attempts.push({
        attemptId,
        quizId: r.quizId,
        score: r.score,
        correct: r.correct,
        wrong: r.wrong,
        skipped: r.skipped,
        total: r.total,
        timeTaken: r.timeTaken,
        completedAt: r.completedAt,
      })
    }
  })

  Object.values(store).forEach((entry) => {
    entry.attempts = entry.attempts
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(0, MAX_ATTEMPTS_PER_QUIZ)
  })

  writeStore(store)
}

/**
 * Build a "weak questions" practice set for a quiz from its attempt
 * history. Target size = half the quiz (rounded up when odd), so a
 * 15-question quiz yields 8.
 *
 * Priority:
 *  1. Questions gotten wrong, most-frequently-wrong first (across all
 *     cached attempts for this quiz — repeated mistakes surface first).
 *  2. If that isn't enough to fill the target, top up with correctly
 *     answered questions, slowest-answered first (most time taken).
 *
 * Questions are matched by their `question` text since attempt results
 * don't carry a stable question id.
 */
export function buildWeakPracticeSet(subject, quizName) {
  const entry = getQuizEntry(subject, quizName)
  const attempts = entry?.attempts?.filter(a => Array.isArray(a.results) && a.results.length > 0) || []
  if (attempts.length === 0) return []

  const latest = attempts[0]
  const total = latest.total || latest.results.length
  const targetCount = Math.ceil(total / 2)

  // key -> { question data, wrongCount, bestKnownTime }
  const map = new Map()

  attempts.forEach((attempt) => {
    attempt.results.forEach((q, idx) => {
      if (!q || !q.question) return
      const key = q.question
      const wasWrong = !q.isCorrect
      const timeTaken = q.timeTaken || attempt.questionTimes?.[idx] || 0

      if (!map.has(key)) {
        map.set(key, {
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          wrongCount: 0,
          correctCount: 0,
          maxCorrectTime: 0,
        })
      }
      const rec = map.get(key)
      if (wasWrong) {
        rec.wrongCount += 1
      } else {
        rec.correctCount += 1
        if (timeTaken > rec.maxCorrectTime) rec.maxCorrectTime = timeTaken
      }
    })
  })

  const all = Array.from(map.values())

  const wrongOnes = all
    .filter(r => r.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount)

  const picked = wrongOnes.slice(0, targetCount)

  if (picked.length < targetCount) {
    const pickedKeys = new Set(picked.map(p => p.question))
    const correctFillers = all
      .filter(r => r.wrongCount === 0 && !pickedKeys.has(r.question))
      .sort((a, b) => b.maxCorrectTime - a.maxCorrectTime)
    picked.push(...correctFillers.slice(0, targetCount - picked.length))
  }

  return picked.map(({ question, options, correctAnswer, explanation }) => ({
    question, options, correctAnswer, explanation,
  }))
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
