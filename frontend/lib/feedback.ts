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

// ── Image helpers ─────────────────────────────────────────────────────────────

// Compress a raw base64 PNG (no data-URL prefix) to a JPEG Blob.
// Max 800 px on the longest side, JPEG quality 0.8.
async function _compressForUpload(rawB64: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.onload = () => {
        const maxDim = 800
        let w = img.width, h = img.height
        if (Math.max(w, h) > maxDim) {
          const scale = maxDim / Math.max(w, h)
          w = Math.round(w * scale)
          h = Math.round(h * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8)
      }
      img.onerror = () => resolve(null)
      img.src = `data:image/png;base64,${rawB64}`
    } catch {
      resolve(null)
    }
  })
}

// Upload a compressed image to the feedback-images bucket.
// Returns the public URL on success, null on any failure.
async function _uploadFeedbackImage(rawB64: string, id: string): Promise<string | null> {
  const blob = await _compressForUpload(rawB64)
  if (!blob) return null

  const filename = `${id}.jpg`
  const { error } = await supabase.storage
    .from('feedback-images')
    .upload(filename, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) return null

  const { data } = supabase.storage
    .from('feedback-images')
    .getPublicUrl(filename)
  return data.publicUrl
}

// ── Feedback submission ───────────────────────────────────────────────────────

// Writes to localStorage first (never lost), then best-effort Supabase insert.
// warpedImage: raw base64 PNG from the scan result (no data-URL prefix).
//              If provided, it is compressed and uploaded before the row insert.
//              If upload fails the row is still inserted with image_url = null.
export async function submitFeedback(
  predicted_label: string,
  confidence: number,
  correct_label: string | null,
  warpedImage?: string,
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

    // Upload image first (best-effort — failure does not block the row insert)
    let image_url: string | null = null
    if (warpedImage) {
      try {
        image_url = await _uploadFeedbackImage(warpedImage, id)
      } catch { /* upload failed — row will have image_url = null */ }
    }

    await supabase.from('feedback').insert({
      id,
      predicted_label,
      confidence,
      was_correct,
      correct_label,
      user_id:   user?.id ?? null,
      image_url,
    })
  } catch { /* no internet or Supabase error — local copy already saved */ }
}

export function getFeedbackLog(): FeedbackEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') } catch { return [] }
}
