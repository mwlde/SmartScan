'use client'


import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Save, FileText, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { scanStore, type ScanResult, type ClassifyResult } from '@/lib/scanStore'
import { toggleSaved, getHistory } from '@/lib/history'

const LABEL_STYLES: Record<string, { bg: string; text: string }> = {
  handwritten:   { bg: '#FEF3E2', text: '#F5A623' },
  invoice:       { bg: '#EBF3FC', text: '#2D7DD2' },
  form:          { bg: '#E8F4EC', text: '#3BB273' },
  printed_page:  { bg: '#F3EFFE', text: '#8B5CF6' },
}

const SLIDES = [
  { key: 'scan',             label: 'Final',     sub: 'Binarized scan'     },
  { key: 'warped',           label: 'Deskewed',  sub: 'Cropped & levelled' },
  { key: 'original',         label: 'Original',  sub: 'Input image'        },
  { key: 'detected_overlay', label: 'Detected',  sub: 'Document edge'      },
  { key: 'region_overlay',   label: 'Regions',   sub: 'Text segments'      },
] as const

function b64Src(b64: string) {
  return `data:image/png;base64,${b64}`
}

function formatLabel(raw: string) {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function ResultsPage() {
  const router = useRouter()
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [classify, setClassify] = useState<ClassifyResult | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  function handleCarouselScroll() {
    const el = carouselRef.current
    if (!el) return
    setActiveSlide(Math.round(el.scrollLeft / el.clientWidth))
  }

  useEffect(() => {
    const result = scanStore.getScan()
    if (!result) { router.replace('/'); return }
    setScan(result)
    const cls = scanStore.getClassify()
    if (cls) setClassify(cls)
    // Reflect saved state if user navigated back to this screen
    const id = scanStore.getCurrentId()
    if (id) {
      const item = getHistory().find(i => i.id === id)
      setIsSaved(item?.saved ?? false)
    }
  }, [router])

  if (!scan) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#2D7DD2', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const labelStyle = classify ? (LABEL_STYLES[classify.label] ?? { bg: '#F5F5F5', text: '#888888' }) : null

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', backgroundColor: '#F5F5F5' }}>
      <div className="h-11 flex-shrink-0" />

      {/* Header */}
      <div className="px-5 pt-3 pb-4 bg-white">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#888' }}>Scan Result</p>
        <h2 className="text-xl font-bold mt-0.5" style={{ color: '#1A1A1A' }}>Document Analysis</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 flex flex-col gap-4">

        {/* No-document warning */}
        {!scan.document_found && (
          <div className="flex gap-3 p-4 rounded-2xl" style={{ backgroundColor: '#FEF3E2' }}>
            <AlertTriangle size={18} style={{ color: '#F5A623', flexShrink: 0, marginTop: 1 }} />
            <p className="text-sm" style={{ color: '#F5A623' }}>
              No document boundary detected — full frame used as fallback.
            </p>
          </div>
        )}

        {/* Swipeable image carousel */}
        <div className="rounded-2xl overflow-hidden shadow-sm bg-white">
          {/* Scroll track */}
          <div
            ref={carouselRef}
            className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', height: '52vh' }}
            onScroll={handleCarouselScroll}
          >
            {SLIDES.map(({ key, label }) => {
              const src = scan[key as keyof ScanResult] as string | undefined
              return (
                <div
                  key={key}
                  className="flex-none w-full h-full flex items-center justify-center"
                  style={{ scrollSnapAlign: 'start', backgroundColor: '#F8F8F8' }}
                >
                  {src ? (
                    <img src={b64Src(src)} alt={label} className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-xs" style={{ color: '#BBBBBB' }}>—</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Slide label + dot indicators */}
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#F0F0F0' }}>
            <div>
              <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>
                {SLIDES[activeSlide].label}
              </p>
              <p className="text-xs" style={{ color: '#888' }}>
                {SLIDES[activeSlide].sub}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 6,
                    width: i === activeSlide ? 18 : 6,
                    borderRadius: 3,
                    backgroundColor: i === activeSlide ? '#2D7DD2' : '#D8D8D8',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Classification badge */}
        {classify && labelStyle && (
          <div
            className="flex items-center justify-between px-5 py-3.5 rounded-full"
            style={{ backgroundColor: '#2D7DD2' }}
          >
            <div className="flex items-center gap-2.5">
              <FileText size={16} color="white" />
              <span className="text-white font-semibold text-sm">{formatLabel(classify.label)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>Confidence</span>
              <span className="text-white font-bold text-sm">{(classify.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* Stat chips */}
        <div className="flex gap-2">
          {[
            { label: 'Latency',  value: `${Math.round(scan.total_ms)} ms` },
            { label: 'Regions',  value: String(scan.regions.length) },
            {
              label: 'Found',
              value: scan.document_found ? 'Yes' : 'No',
              icon: scan.document_found
                ? <CheckCircle2 size={12} style={{ color: '#3BB273' }} />
                : <XCircle size={12} style={{ color: '#D4183D' }} />,
            },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="flex-1 flex flex-col items-center py-3 rounded-2xl"
              style={{ backgroundColor: 'white' }}
            >
              <span className="text-xs" style={{ color: '#888' }}>{label}</span>
              <div className="flex items-center gap-1 mt-0.5">
                {icon}
                <span className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-2">
          <button
            onClick={() => router.push('/')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm transition-all active:scale-95 border-2"
            style={{ borderColor: '#2D7DD2', color: '#2D7DD2' }}
          >
            <RotateCcw size={16} />
            Scan Again
          </button>
          <button
            onClick={() => {
              const id = scanStore.getCurrentId()
              if (!id) return
              const next = toggleSaved(id)
              setIsSaved(next)
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm text-white transition-all active:scale-95"
            style={{ backgroundColor: isSaved ? '#3BB273' : '#2D7DD2' }}
          >
            <Save size={16} />
            {isSaved ? 'Saved!' : 'Save Result'}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
