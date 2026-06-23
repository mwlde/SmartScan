import { supabase } from './supabase'

export interface FeedbackEntry {
  id: string
  timestamp: number
  predicted_label: string
  confidence: number
  was_correct: boolean
  correct_label: string | null  // null when was_correct is true
}

const LOG_KEY     = 'ss_feedback_log'
const OPT_OUT_KEY = 'ss_feedback_opt_out'

export function isFeedbackOptedOut(): boolean {
  try { return localStorage.getItem(OPT_OUT_KEY) === 'true' } catch { return false }
}

export function setFeedbackOptOut(): void {
  try { localStorage.setItem(OPT_OUT_KEY, 'true') } catch { /* ignore */ }
}

// Writes to localStorage, then tries Supabase — silently continues on failure.
export async function submitFeedback(
  predicted_label: string,
  confidence: number,
  correct_label: string | null,
): Promise<void> {
  const was_correct = correct_label === null
  const id          = crypto.randomUUID()
  const timestamp   = Date.now()

  // Always write locally first so the entry is never lost
  const entry: FeedbackEntry = { id, timestamp, predicted_label, confidence, was_correct, correct_label }
  try {
    const log: FeedbackEntry[] = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]')
    log.unshift(entry)
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 200)))
  } catch { /* storage full — continue anyway */ }

  // Best-effort Supabase insert — attach user_id when signed in
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('feedback').insert({
      id,
      predicted_label,
      confidence,
      was_correct,
      correct_label,
      user_id: user?.id ?? null,
    })
  } catch { /* no internet or Supabase error — local copy already saved */ }
}

export function getFeedbackLog(): FeedbackEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') } catch { return [] }
}
