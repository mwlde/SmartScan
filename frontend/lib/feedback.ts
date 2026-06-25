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

// 𓆝 𓆟 𓆞 𓆟 𓆝 image upload

// compress a raw base64 PNG (no data-url prefix) down to a JPEG blob before uploading
// uses canvas so we can resize and re-encode without a server round-trip
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

// upload to supabase feedback-images bucket using the uuid as filename, returns public url or null
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

// 𓆝 𓆟 𓆞 𓆟 𓆝 submission

// localStorage write always happens first so the entry is never lost even if supabase fails
// warpedImage is the raw base64 PNG from the scan — compressed + uploaded before the row insert
// if the upload fails we still insert the row, just with image_url = null
// warpedImage: raw base64 PNG from scan result — compressed + uploaded before insert
// if upload fails, row still goes in with image_url = null
export async function submitFeedback(
  predicted_label: string,
  confidence: number,
  correct_label: string | null,
  warpedImage?: string,
): Promise<void> {
  const was_correct = correct_label === null
  const id          = crypto.randomUUID()
  const timestamp   = Date.now()

  const entry: FeedbackEntry = { id, timestamp, predicted_label, confidence, was_correct, correct_label }
  try {
    const log: FeedbackEntry[] = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]')
    log.unshift(entry)
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 200)))
  } catch { /* storage full — continue anyway */ }

  try {
    const { data: { user } } = await supabase.auth.getUser()

    // upload is best-effort — failure doesnt block the row insert
    let image_url: string | null = null
    if (warpedImage) {
      try {
        image_url = await _uploadFeedbackImage(warpedImage, id)
      } catch { /* upload failed, image_url stays null */ }
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
  } catch { /* no internet or supabase down — local copy already saved */ }
}

export function getFeedbackLog(): FeedbackEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') } catch { return [] }
}
