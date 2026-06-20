'use client'


import { useEffect, useState } from 'react'
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronRight, FileText, ScanLine, Trash2 } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { clearHistory, deleteItem, getHistory, toggleSaved, type HistoryItem } from '@/lib/history'

// ── Helpers ─────────────────────────────────────────────────────────────────

const LABEL_STYLES: Record<string, { bg: string; color: string }> = {
  handwritten:  { bg: '#F5F5F5', color: '#888888' },
  invoice:      { bg: '#EBF3FC', color: '#2D7DD2' },
  form:         { bg: '#E8F4EC', color: '#3BB273' },
  printed_page: { bg: '#F3EFFE', color: '#8B5CF6' },
}

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

function confidenceColor(c: number) {
  if (c >= 0.9) return '#3BB273'
  if (c >= 0.7) return '#F5A623'
  return '#D4183D'
}

// ── Detail view ──────────────────────────────────────────────────────────────

function DetailView({
  item,
  onBack,
  onToggleSaved,
  onDelete,
}: {
  item: HistoryItem
  onBack: () => void
  onToggleSaved: (id: string) => void
  onDelete: (id: string) => void
}) {
  const style = labelStyle(item.label)
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
          {([
            { label: 'Confidence', value: `${(item.confidence * 100).toFixed(1)}%` },
            { label: 'Doc Found',  value: item.document_found ? 'Yes' : 'No'       },
          ] as const).map(({ label, value }) => (
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

        {/* Save / Unsave */}
        <button
          onClick={() => onToggleSaved(item.id)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm text-white transition-all active:scale-95"
          style={{ backgroundColor: item.saved ? '#3BB273' : '#2D7DD2' }}
        >
          {item.saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          {item.saved ? 'Saved' : 'Save Result'}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

// ── List view ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [filter, setFilter] = useState<'all' | 'saved'>('all')
  const [selected, setSelected] = useState<HistoryItem | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  function load() { setItems(getHistory()) }
  useEffect(() => { load() }, [])

  function handleToggleSaved(id: string) {
    toggleSaved(id)
    load()
    setSelected(prev => {
      if (!prev || prev.id !== id) return prev
      return { ...prev, saved: !prev.saved }
    })
  }

  function handleDelete(id: string) {
    deleteItem(id)
    load()
    if (selected?.id === id) setSelected(null)
  }

  function handleClearAll() {
    clearHistory()
    load()
    setShowConfirm(false)
    setSelected(null)
  }

  const displayed = filter === 'saved' ? items.filter(i => i.saved) : items

  if (selected) {
    return (
      <DetailView
        item={selected}
        onBack={() => setSelected(null)}
        onToggleSaved={handleToggleSaved}
        onDelete={handleDelete}
      />
    )
  }

  return (
    <div className="flex flex-col relative" style={{ minHeight: '100dvh', backgroundColor: '#F5F5F5' }}>
      <div className="h-11 flex-shrink-0" />

      {/* Header */}
      <div className="px-5 pt-4 pb-3 bg-white">
        <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>History</h1>
        <p className="text-xs mt-0.5" style={{ color: '#888' }}>
          {items.length} scan{items.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Filter pills */}
      <div
        className="px-5 py-3 bg-white border-b flex gap-2"
        style={{ borderColor: 'rgba(0,0,0,0.06)' }}
      >
        {(['all', 'saved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              backgroundColor: filter === f ? '#2D7DD2' : '#F0F0F0',
              color:           filter === f ? 'white'   : '#888888',
            }}
          >
            {f === 'all' ? 'All Scans' : 'Saved'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 flex flex-col gap-2">
        {displayed.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#EBEBEB' }}
            >
              <ScanLine size={24} style={{ color: '#CCCCCC' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#888' }}>
              {filter === 'saved' ? 'No saved scans yet' : 'No scans yet'}
            </p>
            <p className="text-xs text-center" style={{ color: '#BBBBBB', maxWidth: 200 }}>
              {filter === 'saved'
                ? 'Tap "Save Result" after scanning to bookmark a scan.'
                : 'Scan a document to see it here.'}
            </p>
          </div>
        ) : (
          <>
            {displayed.map(item => {
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
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                        {formatLabel(item.label)}
                      </span>
                      <span
                        className="text-xs font-bold ml-2 flex-shrink-0"
                        style={{ color: confidenceColor(item.confidence) }}
                      >
                        {(item.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#BBBBBB' }}>{formatDate(item.timestamp)}</p>
                    {item.saved && (
                      <span className="text-xs font-semibold mt-0.5 inline-block" style={{ color: '#3BB273' }}>
                        Saved
                      </span>
                    )}
                  </div>

                  <ChevronRight size={16} style={{ color: '#DDDDDD', flexShrink: 0 }} />
                </button>
              )
            })}

            {/* Clear history */}
            {items.length > 0 && (
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center justify-center gap-2 py-3.5 mt-1 rounded-2xl text-sm font-medium transition-all active:scale-95"
                style={{ color: '#D4183D', backgroundColor: '#FDF2F2' }}
              >
                <Trash2 size={15} /> Clear History
              </button>
            )}
          </>
        )}
        <div className="pb-2" />
      </div>

      {/* Clear-all confirm sheet */}
      {showConfirm && (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-t-3xl px-6 pt-5 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: '#E0E0E0' }} />
            <h3 className="text-base font-bold mb-1" style={{ color: '#1A1A1A' }}>Clear all history?</h3>
            <p className="text-sm mb-5" style={{ color: '#888' }}>
              This will permanently delete all scan history.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 rounded-full font-semibold text-sm border-2"
                style={{ borderColor: '#E0E0E0', color: '#888' }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-3.5 rounded-full font-semibold text-sm text-white"
                style={{ backgroundColor: '#D4183D' }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
