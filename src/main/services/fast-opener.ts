import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getDb } from './db'
import type { OpenerItem, OpenerGroup, OpenerData } from '../../shared/types'

let migrated = false

function uuid(): string {
  return crypto.randomUUID()
}

function now(): number {
  return Math.floor(Date.now() / 1000)
}

function itemRowToObj(row: any): OpenerItem {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    isDir: !!row.is_dir,
    groupId: row.group_id,
    createdAt: row.created_at,
    lastUsed: row.last_used,
    useCount: row.use_count,
    sortOrder: row.sort_order,
  }
}

function groupRowToObj(row: any): OpenerGroup {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

function migrateFromJson(): void {
  if (migrated) return
  migrated = true

  const base = app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath()
  const jsonPath = path.join(base, 'fast_opener.json')
  if (!fs.existsSync(jsonPath)) return

  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8')
    const data = JSON.parse(raw) as OpenerData
    const db = getDb()

    const insertGroup = db.prepare(
      'INSERT OR IGNORE INTO opener_groups (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    const insertItem = db.prepare(
      'INSERT OR IGNORE INTO opener_items (id, name, path, is_dir, group_id, created_at, last_used, use_count, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )

    const tx = db.transaction(() => {
      for (const g of data.groups || []) {
        insertGroup.run(g.id, g.name, g.color, g.sortOrder, g.createdAt)
      }
      for (const i of data.items || []) {
        insertItem.run(i.id, i.name, i.path, i.isDir ? 1 : 0, i.groupId, i.createdAt, i.lastUsed, i.useCount, i.sortOrder)
      }
    })
    tx()

    // Rename old JSON file so it won't be imported again
    fs.renameSync(jsonPath, jsonPath + '.migrated')
  } catch {}
}

export function getAll(): OpenerData {
  migrateFromJson()
  const db = getDb()
  const groups = db
    .prepare('SELECT * FROM opener_groups ORDER BY sort_order')
    .all()
    .map(groupRowToObj as any) as OpenerGroup[]
  const items = db
    .prepare('SELECT * FROM opener_items ORDER BY sort_order')
    .all()
    .map(itemRowToObj as any) as OpenerItem[]
  return { groups, items }
}

export function addItem(filePath: string, groupId: string): OpenerItem {
  migrateFromJson()
  const db = getDb()
  const isDir = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
  const name = path.basename(filePath)
  const maxOrder =
    (db.prepare('SELECT MAX(sort_order) as m FROM opener_items').get() as any)?.m || 0
  const item: OpenerItem = {
    id: uuid(),
    name,
    path: filePath,
    isDir,
    groupId,
    createdAt: now(),
    lastUsed: 0,
    useCount: 0,
    sortOrder: maxOrder + 1,
  }
  db.prepare(
    'INSERT INTO opener_items (id, name, path, is_dir, group_id, created_at, last_used, use_count, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(item.id, item.name, item.path, item.isDir ? 1 : 0, item.groupId, item.createdAt, item.lastUsed, item.useCount, item.sortOrder)
  return item
}

export function removeItem(id: string): void {
  migrateFromJson()
  const db = getDb()
  db.prepare('DELETE FROM opener_items WHERE id = ?').run(id)
}

export function openItem(id: string): void {
  migrateFromJson()
  const db = getDb()
  db.prepare(
    'UPDATE opener_items SET use_count = use_count + 1, last_used = ? WHERE id = ?',
  ).run(now(), id)
}

export function moveItem(itemId: string, groupId: string): void {
  migrateFromJson()
  const db = getDb()
  db.prepare('UPDATE opener_items SET group_id = ? WHERE id = ?').run(groupId, itemId)
}

export function updateSort(ids: string[]): void {
  migrateFromJson()
  const db = getDb()
  const stmt = db.prepare('UPDATE opener_items SET sort_order = ? WHERE id = ?')
  const tx = db.transaction(() => {
    for (let idx = 0; idx < ids.length; idx++) {
      stmt.run(idx, ids[idx])
    }
  })
  tx()
}

export function addGroup(name: string, color: string): OpenerGroup {
  migrateFromJson()
  const db = getDb()
  const maxOrder =
    (db.prepare('SELECT MAX(sort_order) as m FROM opener_groups').get() as any)?.m || 0
  const group: OpenerGroup = {
    id: uuid(),
    name,
    color,
    sortOrder: maxOrder + 1,
    createdAt: now(),
  }
  db.prepare(
    'INSERT INTO opener_groups (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(group.id, group.name, group.color, group.sortOrder, group.createdAt)
  return group
}

export function updateGroup(group: OpenerGroup): void {
  migrateFromJson()
  const db = getDb()
  db.prepare(
    'UPDATE opener_groups SET name = ?, color = ?, sort_order = ? WHERE id = ?',
  ).run(group.name, group.color, group.sortOrder, group.id)
}

export function removeGroup(id: string): void {
  migrateFromJson()
  const db = getDb()
  db.prepare('DELETE FROM opener_items WHERE group_id = ?').run(id)
  db.prepare('DELETE FROM opener_groups WHERE id = ?').run(id)
}

export function validatePath(filePath: string): boolean {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}
