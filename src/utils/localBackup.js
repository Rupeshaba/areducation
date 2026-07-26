/**
 * Bundles up every piece of local-only app state (localStorage) so it can
 * be handed to a newly-paired device during device sync, and restores it
 * there. Deliberately excludes:
 *  - `ar-edu-auth`        — the new device gets its own fresh tokens from
 *                           the sync approval itself, not a copied session.
 *  - `AR_EDU_QUERY_CACHE` — just a React Query response cache; it refetches
 *                           from the API on its own and would only bloat
 *                           the transfer payload for no benefit.
 */

const EXCLUDED_KEYS = new Set(['ar-edu-auth', 'AR_EDU_QUERY_CACHE'])

function isAppKey(key) {
  return key === 'chatBg' || key.startsWith('ar_') || key.startsWith('ar-')
}

// The quiz-attempt cache can carry a heavy per-question `results` /
// `questionTimes` breakdown (used only by the analysis screen). Strip that
// before sending it over the wire — summary stats (score, correct, points,
// etc.) are what Progress/Home actually need on the new device, and this
// keeps the sync payload small.
function trimQuizCacheForTransfer(raw) {
  try {
    const parsed = JSON.parse(raw)
    Object.values(parsed).forEach((entry) => {
      entry.attempts?.forEach((a) => {
        delete a.results
        delete a.questionTimes
      })
    })
    return JSON.stringify(parsed)
  } catch {
    return raw
  }
}

/** Collect everything worth handing to a newly-paired device. */
export function exportLocalState() {
  const data = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || EXCLUDED_KEYS.has(key) || !isAppKey(key)) continue
      let value = localStorage.getItem(key)
      if (key === 'ar_quiz_cache_v1') value = trimQuizCacheForTransfer(value)
      data[key] = value
    }
  } catch {
    /* localStorage unavailable — sync will just proceed without local data */
  }
  return data
}

/** Write a bundle received from another device back into localStorage. */
export function importLocalState(data) {
  if (!data || typeof data !== 'object') return
  try {
    Object.entries(data).forEach(([key, value]) => {
      if (EXCLUDED_KEYS.has(key) || !isAppKey(key)) return
      if (typeof value !== 'string') return
      localStorage.setItem(key, value)
    })
    // Refresh anything on-screen that reads completion/quiz state.
    window.dispatchEvent(new CustomEvent('ar-completion-changed'))
  } catch {
    /* best-effort — a partial restore is still better than none */
  }
}
