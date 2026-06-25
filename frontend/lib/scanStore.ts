// in-memory store for api results
// cant use sessionStorage — 6 base64 imgs would exceed the ~5MB quota
// module-level vars survive client-side nav but clear on hard refresh (results page redirects home if empty, so thats fine)

export interface ScanResult {
  document_found: boolean
  original: string
  enhanced: string
  detected_overlay: string
  warped: string
  scan: string
  region_overlay: string
  regions: Array<{ x: number; y: number; w: number; h: number }>
  timings_ms: Record<string, number>
  total_ms: number
}

export interface ClassifyResult {
  label: string
  confidence: number
}

let _scan: ScanResult | null = null
let _classify: ClassifyResult | null = null
let _currentId: string | null = null

export const scanStore = {
  getScan:      ()                  => _scan,
  getClassify:  ()                  => _classify,
  getCurrentId: ()                  => _currentId,
  setScan:      (r: ScanResult)     => { _scan = r },
  setClassify:  (r: ClassifyResult) => { _classify = r },
  setCurrentId: (id: string)        => { _currentId = id },
  clear:        ()                  => { _scan = null; _classify = null; _currentId = null },
}
