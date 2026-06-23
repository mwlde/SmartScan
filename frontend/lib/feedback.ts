export interface FeedbackEntry {
  timestamp: number
  predicted_label: string
  confidence: number
  correct_label: string | null  // null means the prediction was correct
  image_thumbnail: string
}

const LOG_KEY     = 'ss_feedback_log'
const OPT_OUT_KEY = 'ss_feedback_opt_out'

export function isFeedbackOptedOut(): boolean {
  try { return localStorage.getItem(OPT_OUT_KEY) === 'true' } catch { return false }
}

export function setFeedbackOptOut(): void {
  try { localStorage.setItem(OPT_OUT_KEY, 'true') } catch { /* ignore */ }
}

export function addFeedbackEntry(entry: FeedbackEntry): void {
  try {
    const log: FeedbackEntry[] = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]')
    log.unshift(entry)
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 200)))
  } catch { /* ignore */ }
}

export function getFeedbackLog(): FeedbackEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') } catch { return [] }
}
