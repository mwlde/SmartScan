// Lightweight scan history stored in localStorage.
// Only the warped image (resized to ≤200 px) is kept — storing all 6 stage images
// would exceed the ~5 MB localStorage quota on the first few scans.

export interface HistoryItem {
  id: string
  timestamp: number
  label: string
  confidence: number
  document_found: boolean
  thumbnail: string   // data:image/jpeg;base64,... at ≤200 px, '' on failure
  saved: boolean
  quality?: string    // 'low' | 'medium' | 'high'; undefined for entries saved before v0.8
}

const KEY = 'ss_history'
const MAX_ITEMS = 50

// ── Thumbnail generator (browser-only, call only inside useEffect) ─────────────

export async function createThumbnail(b64: string, maxDim = 200): Promise<string> {
  if (typeof window === 'undefined') return ''
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.onerror = () => resolve('')
    img.src = `data:image/png;base64,${b64}`
  })
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

export function getHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function persist(items: HistoryItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // localStorage full — drop oldest half and retry
    const trimmed = items.slice(0, Math.floor(items.length / 2))
    try { localStorage.setItem(KEY, JSON.stringify(trimmed)) } catch { /* give up */ }
  }
}

export function addHistoryItem(item: HistoryItem): void {
  persist([item, ...getHistory()].slice(0, MAX_ITEMS))
}

export function toggleSaved(id: string): boolean {
  const items = getHistory()
  const idx = items.findIndex(i => i.id === id)
  if (idx < 0) return false
  items[idx].saved = !items[idx].saved
  persist(items)
  return items[idx].saved
}

export function deleteItem(id: string): void {
  persist(getHistory().filter(i => i.id !== id))
}

export function clearHistory(): void {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
