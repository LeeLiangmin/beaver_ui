import { session } from 'electron'
import { getDb } from './db'
import type { CalendarDay, HistoryEvent } from '../../shared/types'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require('lunar-javascript')

function getCachedEvents(month: number): Map<string, HistoryEvent[]> | null {
  const db = getDb()
  const stmt = db.prepare(
    'SELECT month, day, year, title, type, desc FROM history_events WHERE month = ?',
  )
  const rows = stmt.all(month) as any[]
  if (rows.length === 0) return null
  const data = new Map<string, HistoryEvent[]>()
  for (const row of rows) {
    const dayKey = `${String(row.month).padStart(2, '0')}${String(row.day).padStart(2, '0')}`
    if (!data.has(dayKey)) data.set(dayKey, [])
    data.get(dayKey)!.push({ year: row.year, title: row.title, type: row.type, desc: row.desc })
  }
  return data
}

function saveEvents(month: number, data: Map<string, HistoryEvent[]>) {
  const db = getDb()
  const insert = db.prepare(
    'INSERT OR IGNORE INTO history_events (month, day, year, title, type, desc) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const tx = db.transaction(() => {
    for (const [dayKey, events] of data) {
      const day = parseInt(dayKey.slice(2), 10)
      for (const e of events) {
        insert.run(month, day, e.year, e.title, e.type, e.desc)
      }
    }
  })
  tx()
}

function parseResponse(json: any, monthKey: string): Map<string, HistoryEvent[]> {
  const data = new Map<string, HistoryEvent[]>()
  const dayMap = json[monthKey]
  if (dayMap) {
    for (const [dayKey, items] of Object.entries(dayMap) as [string, any[]][]) {
      data.set(
        dayKey,
        (items || []).map((item: any) => ({
          year: parseInt(item.year, 10) || 0,
          title: (item.title || '').replace(/<[^>]*>/g, ''),
          type: item.type || 'event',
          desc: (item.desc || '').replace(/<[^>]*>/g, ''),
        })),
      )
    }
  }
  return data
}

async function fetchBaikeMonth(month: number): Promise<Map<string, HistoryEvent[]>> {
  const cached = getCachedEvents(month)
  if (cached) return cached

  const monthKey = String(month).padStart(2, '0')
  const url = `https://baike.baidu.com/cms/home/eventsOnHistory/${monthKey}.json`

  try {
    const ses = session.defaultSession
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    const res = await ses.fetch(url, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) return new Map<string, HistoryEvent[]>()

    const json = await res.json()
    const data = parseResponse(json, monthKey)

    if (data.size > 0) saveEvents(month, data)
    return data
  } catch {
    return new Map<string, HistoryEvent[]>()
  }
}

export async function getHistoryEvents(month: number, day: number): Promise<HistoryEvent[]> {
  try {
    const monthData = await fetchBaikeMonth(month)
    const dayKey = `${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
    return monthData.get(dayKey) || []
  } catch (e: any) {
    throw new Error(`获取失败: ${e?.message || '网络错误'}`)
  }
}

export function getMonthData(y: number, m: number): CalendarDay[] {
  const days: CalendarDay[] = []
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`

  const firstDay = new Date(y, m - 1, 1)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = new Date(y, m, 0).getDate()

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(y, m - 1, -i)
    days.push(buildDay(d, todayStr))
  }

  for (let d = 1; d <= daysInMonth; d++) {
    days.push(buildDay(new Date(y, m - 1, d), todayStr))
  }

  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push(buildDay(new Date(y, m, d), todayStr))
  }

  return days
}

function buildDay(date: Date, todayStr: string): CalendarDay {
  const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    lunarYear: lunar.getYearInChinese(),
    lunarMonth: lunar.getMonthInChinese(),
    lunarDay: lunar.getDayInChinese(),
    festival: lunar.getFestivals().join('、') || '',
    solarTerm: lunar.getJie() || lunar.getQi() || '',
    isToday: dateStr === todayStr,
  }
}
