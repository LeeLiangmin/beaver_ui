import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface OpenerGroup {
  id: string
  name: string
}

export interface OpenerItem {
  id: string
  name: string
  path: string
  groupId: string
  useCount: number
}

interface StoreData {
  groups: OpenerGroup[]
  items: OpenerItem[]
}

const defaultData: StoreData = {
  groups: [{ id: 'default', name: '默认' }],
  items: [],
}

function getStorePath(): string {
  return path.join(app.getPath('userData'), 'opener.json')
}

function loadStore(): StoreData {
  try {
    const p = getStorePath()
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    }
  } catch {}
  return defaultData
}

function saveStore(data: StoreData): void {
  const p = getStorePath()
  const dir = path.dirname(p)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')
}

let idCounter = Date.now()

function nextId(): string {
  return String(++idCounter)
}

export function getGroups(): OpenerGroup[] {
  return loadStore().groups
}

export function addGroup(name: string): OpenerGroup {
  const store = loadStore()
  const group: OpenerGroup = { id: nextId(), name }
  store.groups.push(group)
  saveStore(store)
  return group
}

export function removeGroup(id: string): void {
  const store = loadStore()
  store.groups = store.groups.filter(g => g.id !== id)
  store.items = store.items.filter(i => i.groupId !== id)
  saveStore(store)
}

export function getItems(): OpenerItem[] {
  return loadStore().items
}

export function addItem(name: string, itemPath: string, groupId: string): OpenerItem {
  const store = loadStore()
  const item: OpenerItem = { id: nextId(), name, path: itemPath, groupId, useCount: 0 }
  store.items.push(item)
  saveStore(store)
  return item
}

export function removeItem(id: string): void {
  const store = loadStore()
  store.items = store.items.filter(i => i.id !== id)
  saveStore(store)
}

export function incrementUseCount(id: string): void {
  const store = loadStore()
  const item = store.items.find(i => i.id === id)
  if (item) {
    item.useCount++
    saveStore(store)
  }
}
