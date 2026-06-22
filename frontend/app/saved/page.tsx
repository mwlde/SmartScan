'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FolderOpen, Image as ImageIcon, Plus, Trash2 } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { getHistory, type HistoryItem } from '@/lib/history'
import {
  getFolders, createFolder, deleteFolder,
  removeItemFromFolder, type Folder,
} from '@/lib/folders'

// ── Folder card ───────────────────────────────────────────────────────────────

function FolderCard({
  folder, items, onClick,
}: { folder: Folder; items: HistoryItem[]; onClick: () => void }) {
  const MAX_THUMBS = 3
  const visible = items.slice(0, MAX_THUMBS)
  const overflow = Math.max(0, items.length - MAX_THUMBS)

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 text-left transition-all active:scale-[0.97]"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: folder.bg }}
      >
        <FolderOpen size={24} style={{ color: folder.color }} />
      </div>

      {/* Name + count */}
      <p className="font-bold text-sm leading-snug" style={{ color: '#1A1A1A' }}>{folder.name}</p>
      <p className="text-xs mt-0.5 mb-3" style={{ color: '#888' }}>
        {items.length} scan{items.length !== 1 ? 's' : ''}
      </p>

      {/* Thumbnail strip */}
      <div className="flex gap-1.5">
        {visible.map(item => (
          <div
            key={item.id}
            className="h-7 rounded-lg overflow-hidden flex-1"
            style={{ backgroundColor: folder.bg }}
          >
            {item.thumbnail && (
              <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        ))}
        {/* Fill at least one placeholder when empty */}
        {visible.length === 0 && (
          <div className="h-7 rounded-lg flex-1" style={{ backgroundColor: folder.bg }} />
        )}
        {overflow > 0 && (
          <div
            className="h-7 px-2 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ backgroundColor: '#F0F0F0', color: '#888' }}
          >
            +{overflow}
          </div>
        )}
      </div>
    </button>
  )
}

// ── New folder card ───────────────────────────────────────────────────────────

function NewFolderCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.97]"
      style={{ border: '2px dashed #D0D0D0', minHeight: 168 }}
    >
      <Plus size={22} style={{ color: '#BBBBBB' }} />
      <p className="text-sm font-medium" style={{ color: '#BBBBBB' }}>New Folder</p>
    </button>
  )
}

// ── New folder sheet ──────────────────────────────────────────────────────────

function NewFolderSheet({
  onCancel, onCreate,
}: { onCancel: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState('')
  const ready = name.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-t-3xl px-5 pt-4 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: '#E0E0E0' }} />
        <h3 className="text-lg font-bold mb-5" style={{ color: '#1A1A1A' }}>New Folder</h3>

        {/* Input */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-5"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <FolderOpen size={18} style={{ color: '#BBBBBB' }} />
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: '#1A1A1A' }}
            placeholder="Folder name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && ready) onCreate(name) }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-full font-semibold text-sm border-2"
            style={{ borderColor: '#E0E0E0', color: '#888' }}
          >
            Cancel
          </button>
          <button
            onClick={() => ready && onCreate(name)}
            className="flex-1 py-3.5 rounded-full font-semibold text-sm text-white transition-all"
            style={{ backgroundColor: ready ? '#2D7DD2' : '#BBBBBB' }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Folder detail view ────────────────────────────────────────────────────────

function FolderDetailView({
  folder, allHistory, onBack, onDelete, onRemoveItem,
}: {
  folder: Folder
  allHistory: HistoryItem[]
  onBack: () => void
  onDelete: () => void
  onRemoveItem: (itemId: string) => void
}) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const items = allHistory.filter(h => folder.itemIds.includes(h.id))

  return (
    <div className="flex flex-col bg-white" style={{ minHeight: '100dvh' }}>
      <div className="h-11 flex-shrink-0" />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-4 border-b" style={{ borderColor: '#F0F0F0' }}>
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <ArrowLeft size={18} style={{ color: '#1A1A1A' }} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold truncate" style={{ color: '#1A1A1A' }}>{folder.name}</h2>
          <p className="text-xs" style={{ color: '#888' }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#FDF2F2' }}
        >
          <Trash2 size={16} style={{ color: '#D4183D' }} />
        </button>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: '#F5F5F5' }}
          >
            <ImageIcon size={32} style={{ color: '#CCCCCC' }} />
          </div>
          <div className="text-center">
            <p className="font-bold text-base mb-1" style={{ color: '#1A1A1A' }}>No scans yet</p>
            <p className="text-sm" style={{ color: '#888', lineHeight: 1.6 }}>
              Scan a document and save it here from the Results screen.
            </p>
          </div>
          <button
            onClick={() => router.push('/camera')}
            className="px-8 py-3.5 rounded-full font-bold text-sm text-white"
            style={{ backgroundColor: '#2D7DD2' }}
          >
            Scan Now
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 flex flex-col gap-2">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3.5 rounded-2xl"
              style={{ backgroundColor: '#FAFAFA', border: '1px solid #F0F0F0' }}
            >
              <div
                className="flex-shrink-0 w-12 h-14 rounded-xl overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: '#F0F0F0' }}
              >
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={18} style={{ color: '#CCCCCC' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                  {item.label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                  {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => onRemoveItem(item.id)}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#F5F5F5' }}
              >
                <Trash2 size={14} style={{ color: '#AAAAAA' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete folder confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-white rounded-t-3xl px-6 pt-5 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: '#E0E0E0' }} />
            <h3 className="text-base font-bold mb-1" style={{ color: '#1A1A1A' }}>Delete folder?</h3>
            <p className="text-sm mb-5" style={{ color: '#888' }}>
              The folder will be deleted. Scans inside will remain in your history.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3.5 rounded-full font-semibold text-sm border-2"
                style={{ borderColor: '#E0E0E0', color: '#888' }}
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="flex-1 py-3.5 rounded-full font-semibold text-sm text-white"
                style={{ backgroundColor: '#D4183D' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SavedPage() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null)
  const [showSheet, setShowSheet] = useState(false)

  function load() {
    const f = getFolders()
    setFolders(f)
    setHistory(getHistory())
    // Keep activeFolder in sync if it's open
    if (activeFolder) {
      setActiveFolder(f.find(x => x.id === activeFolder.id) ?? null)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleCreate(name: string) {
    createFolder(name.trim())
    setShowSheet(false)
    load()
  }

  function handleDeleteFolder(id: string) {
    deleteFolder(id)
    setActiveFolder(null)
    load()
  }

  function handleRemoveItem(folderId: string, itemId: string) {
    removeItemFromFolder(folderId, itemId)
    const updated = getFolders()
    setFolders(updated)
    setActiveFolder(updated.find(f => f.id === folderId) ?? null)
  }

  const totalScans = folders.reduce((s, f) => s + f.itemIds.length, 0)

  if (activeFolder) {
    return (
      <FolderDetailView
        folder={activeFolder}
        allHistory={history}
        onBack={() => setActiveFolder(null)}
        onDelete={() => handleDeleteFolder(activeFolder.id)}
        onRemoveItem={itemId => handleRemoveItem(activeFolder.id, itemId)}
      />
    )
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', backgroundColor: '#F5F5F5' }}>
      <div className="h-11 flex-shrink-0" />

      {/* Header */}
      <div className="flex items-end justify-between px-5 pt-4 pb-4 bg-white">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Saved</h1>
          <p className="text-xs mt-0.5" style={{ color: '#888' }}>
            {folders.length} folder{folders.length !== 1 ? 's' : ''} · {totalScans} scan{totalScans !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowSheet(true)}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-all active:scale-95"
          style={{ backgroundColor: '#2D7DD2' }}
        >
          <Plus size={22} />
        </button>
      </div>

      {/* Folder grid */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          {folders.map(folder => {
            const items = history.filter(h => folder.itemIds.includes(h.id))
            return (
              <FolderCard
                key={folder.id}
                folder={folder}
                items={items}
                onClick={() => setActiveFolder(folder)}
              />
            )
          })}
          <NewFolderCard onClick={() => setShowSheet(true)} />
        </div>
      </div>

      {showSheet && (
        <NewFolderSheet onCancel={() => setShowSheet(false)} onCreate={handleCreate} />
      )}

      <BottomNav />
    </div>
  )
}
