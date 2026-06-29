import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface FastOpenerItem {
  id: string
  name: string
  path: string
  isDir: boolean
  groupId: string
  createdAt: number
  lastUsed: number
  useCount: number
  sortOrder: number
}

export interface FastOpenerGroup {
  id: string
  name: string
  color: string
  sortOrder: number
  createdAt: number
}

export interface FastOpenerData {
  groups: FastOpenerGroup[]
  items: FastOpenerItem[]
}

const defaultGroups: FastOpenerGroup[] = []
let sortCounter = 0

function getStorePath(): string {
  const base = app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath()
  return path.join(base, 'fast_opener.json')
}

function loadStore(): FastOpenerData {
  try {
    const p = getStorePath()
    if (fs.existsSync(p)) {
      const d = JSON.parse(fs.readFileSync(p, 'utf-8'))
      if (d.items && d.items.length > 0) sortCounter = Math.max(...d.items.map((i: any) => i.sortOrder || 0))
      return d
    }
  } catch {}
  return { groups: [...defaultGroups], items: [] }
}

function saveStore(data: FastOpenerData): void {
  const p = getStorePath()
  const dir = path.dirname(p)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')
}

function uuid(): string {
  return crypto.randomUUID()
}

function now(): number {
  return Math.floor(Date.now() / 1000)
}

export function getAll(): FastOpenerData {
  return loadStore()
}

export function addItem(filePath: string, groupId: string): FastOpenerItem {
  const store = loadStore()
  const isDir = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
  const name = path.basename(filePath)
  sortCounter++
  const item: FastOpenerItem = {
    id: uuid(),
    name,
    path: filePath,
    isDir,
    groupId,
    createdAt: now(),
    lastUsed: 0,
    useCount: 0,
    sortOrder: sortCounter,
  }
  store.items.push(item)
  saveStore(store)
  return item
}

export function removeItem(id: string): void {
  const store = loadStore()
  store.items = store.items.filter(i => i.id !== id)
  saveStore(store)
}

export function openItem(id: string): void {
  const store = loadStore()
  const item = store.items.find(i => i.id === id)
  if (item) {
    item.useCount++
    item.lastUsed = now()
    saveStore(store)
  }
}

export function moveItem(itemId: string, groupId: string): void {
  const store = loadStore()
  const item = store.items.find(i => i.id === itemId)
  if (item) {
    item.groupId = groupId
    saveStore(store)
  }
}

export function updateSort(ids: string[]): void {
  const store = loadStore()
  for (let idx = 0; idx < ids.length; idx++) {
    const item = store.items.find(i => i.id === ids[idx])
    if (item) item.sortOrder = idx
  }
  saveStore(store)
}

export function addGroup(name: string, color: string): FastOpenerGroup {
  const store = loadStore()
  const maxOrder = store.groups.reduce((max, g) => Math.max(max, g.sortOrder), 0)
  const group: FastOpenerGroup = {
    id: uuid(),
    name,
    color,
    sortOrder: maxOrder + 1,
    createdAt: now(),
  }
  store.groups.push(group)
  saveStore(store)
  return group
}

export function updateGroup(group: FastOpenerGroup): void {
  const store = loadStore()
  const idx = store.groups.findIndex(g => g.id === group.id)
  if (idx >= 0) {
    store.groups[idx] = group
    saveStore(store)
  }
}

export function removeGroup(id: string): void {
  const store = loadStore()
  store.groups = store.groups.filter(g => g.id !== id)
  store.items = store.items.filter(i => i.groupId !== id)
  saveStore(store)
}

export function validatePath(filePath: string): boolean {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}
