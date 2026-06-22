'use client'


import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronRight, Download, FileText, ScanLine, Trash2 } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { deleteItem, getHistory, toggleSaved, type HistoryItem } from '@/lib/history'

// ── Helpers ───────────────────────────────────────────────────────────────────

const LABEL_STYLES: Record<string, { bg: string; color: string }> = {
  handwritten:  { bg: '#F5F5F5', color: '#888888' },
  invoice:      { bg: '#EBF3FC', color: '#2D7DD2' },
  form:         { bg: '#E8F4EC', color: '#3BB273' },
  printed_page: { bg: '#F3EFFE', color: '#8B5CF6' },
}

const CATEGORY_PILLS = [
  { key: 'all',          label: 'All'         },
  { key: 'invoice',      label: 'Invoices'    },
  { key: 'handwritten',  label: 'Handwritten' },
  { key: 'form',         label: 'Forms'       },
  { key: 'printed_page', label: 'Documents'   },
] as const

type CategoryKey = typeof CATEGORY_PILLS[number]['key']

function labelStyle(label: string) {
  return LABEL_STYLES[label] ?? { bg: '#F5F5F5', color: '#888888' }
}

function formatLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 0) return `Today, ${time}`
  if (diffDays === 1) return `Yesterday, ${time}`
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`
}

const QUALITY_STYLES: Record<string, { bg: string; color: string }> = {
  low:    { bg: '#F5F5F5', color: '#888888' },
  medium: { bg: '#EBF3FC', color: '#2D7DD2' },
  high:   { bg: '#E8F4EC', color: '#3BB273' },
}

function qualityStyle(q?: string) {
  return QUALITY_STYLES[q ?? 'medium'] ?? QUALITY_STYLES.medium
}

function formatQuality(q?: string) {
  const s = q ?? 'medium'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function saveToDevice(thumbnail: string, label: string, timestamp: number) {
  const a = document.createElement('a')
  a.href = thumbnail
  a.download = `smartscan_${label}_${timestamp}.jpg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 2500)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div
        className="px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2"
        style={{ backgroundColor: '#1A1A1A', color: 'white' }}
      >
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  )
}

// ── Detail view ──────────────────────────────────────────────────────────────

function DetailView({
  item,
  onBack,
  onUnsave,
  onDelete,
  onToast,
}: {
  item: HistoryItem
  onBack: () => void
  onUnsave: (id: string) => void
  onDelete: (id: string) => void
  onToast: (msg: string) => void
}) {
  return (
    <div className="flex flex-col bg-white" style={{ minHeight: '100dvh' }}>
      <div className="h-11 flex-shrink-0" />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <ArrowLeft size={18} style={{ color: '#1A1A1A' }} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold truncate" style={{ color: '#1A1A1A' }}>
            {formatLabel(item.label)}
          </h2>
          <p className="text-xs" style={{ color: '#888' }}>{formatDate(item.timestamp)}</p>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#FDF2F2' }}
        >
          <Trash2 size={16} style={{ color: '#D4183D' }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
        {/* Thumbnail */}
        <div
          className="w-full rounded-2xl overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: '#F8F8F8', aspectRatio: '4/3' }}
        >
          {item.thumbnail ? (
            <img src={item.thumbnail} alt="Scan" className="w-full h-full object-contain" />
          ) : (
            <ScanLine size={36} style={{ color: '#CCCCCC' }} />
          )}
        </div>

        {/* Classification badge */}
        <div
          className="flex items-center justify-between px-5 py-3.5 rounded-full"
          style={{ backgroundColor: '#2D7DD2' }}
        >
          <div className="flex items-center gap-2.5">
            <FileText size={16} color="white" />
            <span className="text-white font-semibold text-sm">{formatLabel(item.label)}</span>
          </div>
          <span className="text-white font-bold text-sm">
            {(item.confidence * 100).toFixed(1)}%
          </span>
        </div>

        {/* Stats */}
        <div className="flex gap-2">
          {[
            { label: 'Confidence', value: `${(item.confidence * 100).toFixed(1)}%` },
            { label: 'Doc Found',  value: item.document_found ? 'Yes' : 'No'       },
            { label: 'Quality',    value: formatQuality(item.quality)               },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex-1 flex flex-col items-center py-3.5 rounded-2xl"
              style={{ backgroundColor: '#F8F8F8' }}
            >
              <span className="text-xs" style={{ color: '#888' }}>{label}</span>
              <span className="text-sm font-bold mt-0.5" style={{ color: '#1A1A1A' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Unsave */}
        <button
          onClick={() => onUnsave(item.id)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm border-2 transition-all active:scale-95"
          style={{ borderColor: '#3BB273', color: '#3BB273' }}
        >
          <BookmarkCheck size={16} />
          Remove from Saved
        </button>

        {/* Save to device */}
        <button
          onClick={() => {
            if (!item.thumbnail) return
            saveToDevice(item.thumbnail, item.label, item.timestamp)
            onToast('Saved to device')
          }}
          disabled={!item.thumbnail}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm transition-all active:scale-95 border-2"
          style={{ borderColor: '#E0E0E0', color: item.thumbnail ? '#1A1A1A' : '#BBBBBB' }}
        >
          <Download size={16} />
          Save to Device
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

// ── List view ────────────────────────────────────────────────────────────────

export default function SavedPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [catFilter, setCatFilter] = useState<CategoryKey>('all')
  const [selected, setSelected] = useState<HistoryItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function load() { setItems(getHistory().filter(i => i.saved)) }
  useEffect(() => { load() }, [])

  function handleUnsave(id: string) {
    toggleSaved(id)
    load()
    if (selected?.id === id) setSelected(null)
  }

  function handleDelete(id: string) {
    deleteItem(id)
    load()
    if (selected?.id === id) setSelected(null)
  }

  const displayed = items.filter(i => catFilter === 'all' ? true : i.label === catFilter)

  if (selected) {
    return (
      <>
        <DetailView
          item={selected}
          onBack={() => setSelected(null)}
          onUnsave={handleUnsave}
          onDelete={handleDelete}
          onToast={msg => setToast(msg)}
        />
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </>
    )
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', backgroundColor: '#F5F5F5' }}>
      <div className="h-11 flex-shrink-0" />

      {/* Header */}
      <div className="px-5 pt-4 pb-3 bg-white">
        <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Saved</h1>
        <p className="text-xs mt-0.5" style={{ color: '#888' }}>
          {items.length} saved scan{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Category filter pills */}
      {items.length > 0 && (
        <div
          className="px-5 pt-3 pb-3 bg-white border-b flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ borderColor: 'rgba(0,0,0,0.06)', scrollbarWidth: 'none' }}
        >
          {CATEGORY_PILLS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCatFilter(key)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: catFilter === key ? '#1A1A1A' : '#F0F0F0',
                color:           catFilter === key ? 'white'   : '#888888',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 flex flex-col gap-2">
        {displayed.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#EBEBEB' }}
            >
              <Bookmark size={24} style={{ color: '#CCCCCC' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#888' }}>
              {catFilter !== 'all' ? 'No saved scans in this category' : 'No saved scans yet'}
            </p>
            <p className="text-xs text-center" style={{ color: '#BBBBBB', maxWidth: 220 }}>
              {catFilter !== 'all'
                ? 'Try selecting a different category.'
                : 'Tap "Save to App" on the results screen to bookmark a scan here.'}
            </p>
          </div>
        ) : (
          displayed.map(item => {
            const style = labelStyle(item.label)
            return (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                style={{ backgroundColor: 'white' }}
              >
                {/* Thumbnail */}
                <div
                  className="flex-shrink-0 w-12 h-14 rounded-xl overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: style.bg }}
                >
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FileText size={20} style={{ color: style.color }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                      {formatLabel(item.label)}
                    </span>
                    <BookmarkCheck size={13} style={{ color: '#3BB273', flexShrink: 0 }} />
                  </div>
                  <p className="text-xs" style={{ color: '#888' }}>
                    {(item.confidence * 100).toFixed(1)}% confidence
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs" style={{ color: '#BBBBBB' }}>{formatDate(item.timestamp)}</p>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={qualityStyle(item.quality)}
                    >
                      {formatQuality(item.quality)}
                    </span>
                  </div>
                </div>

                <ChevronRight size={16} style={{ color: '#DDDDDD', flexShrink: 0 }} />
              </button>
            )
          })
        )}
        <div className="pb-2" />
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <BottomNav />
    </div>
  )
}
