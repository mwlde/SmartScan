// Folder system — organises saved scans into named collections in localStorage.

const FOLDER_KEY = 'ss_folders'

export const FOLDER_COLOR_PAIRS: { color: string; bg: string }[] = [
  { color: '#2D7DD2', bg: '#EBF3FC' },
  { color: '#3BB273', bg: '#E8F4EC' },
  { color: '#F77F00', bg: '#FEF3E2' },
  { color: '#8B5CF6', bg: '#F3EFFE' },
  { color: '#D4183D', bg: '#FDF2F2' },
  { color: '#F5A623', bg: '#FFF8EC' },
]

export interface Folder {
  id: string
  name: string
  color: string   // hex from FOLDER_COLOR_PAIRS[n].color
  bg: string      // hex tint from FOLDER_COLOR_PAIRS[n].bg
  itemIds: string[]
}

export function getFolders(): Folder[] {
  try { return JSON.parse(localStorage.getItem(FOLDER_KEY) ?? '[]') }
  catch { return [] }
}

function persist(folders: Folder[]): void {
  try { localStorage.setItem(FOLDER_KEY, JSON.stringify(folders)) }
  catch { /* quota exceeded */ }
}

export function createFolder(name: string): Folder {
  const folders = getFolders()
  const pair = FOLDER_COLOR_PAIRS[folders.length % FOLDER_COLOR_PAIRS.length]
  const folder: Folder = {
    id: `folder_${Date.now()}`,
    name: name.trim(),
    color: pair.color,
    bg: pair.bg,
    itemIds: [],
  }
  persist([...folders, folder])
  return folder
}

export function deleteFolder(id: string): void {
  persist(getFolders().filter(f => f.id !== id))
}

export function addItemToFolder(folderId: string, itemId: string): void {
  const folders = getFolders()
  const folder = folders.find(f => f.id === folderId)
  if (!folder || folder.itemIds.includes(itemId)) return
  folder.itemIds = [...folder.itemIds, itemId]
  persist(folders)
}

export function removeItemFromFolder(folderId: string, itemId: string): void {
  const folders = getFolders()
  const folder = folders.find(f => f.id === folderId)
  if (!folder) return
  folder.itemIds = folder.itemIds.filter(id => id !== itemId)
  persist(folders)
}

export function clearAllFolders(): void {
  try { localStorage.removeItem(FOLDER_KEY) } catch { /* ignore */ }
}
