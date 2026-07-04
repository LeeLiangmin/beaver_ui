import { describe, it, expect } from 'vitest'
import { getMonthData } from './calendar'

describe('getMonthData', () => {
  it('returns 42 days (6 weeks grid)', () => {
    const days = getMonthData(2024, 1)
    expect(days).toHaveLength(42)
  })

  it('first day of the month is at the correct position', () => {
    const days = getMonthData(2024, 1) // Jan 2024 starts on Monday (getDay()=1)
    const firstOfMonthIdx = days.findIndex((d) => d.year === 2024 && d.month === 1 && d.day === 1)
    expect(firstOfMonthIdx).toBe(1) // Monday → index 1 (0=Sunday)
  })

  it('marks today correctly', () => {
    const now = new Date()
    const days = getMonthData(now.getFullYear(), now.getMonth() + 1)
    const today = days.find((d) => d.isToday)
    expect(today).toBeDefined()
    expect(today!.year).toBe(now.getFullYear())
    expect(today!.month).toBe(now.getMonth() + 1)
    expect(today!.day).toBe(now.getDate())
  })

  it('includes days from previous month', () => {
    const days = getMonthData(2024, 3) // March 2024 starts on Friday
    const prevMonthDays = days.filter((d) => d.month === 2)
    expect(prevMonthDays.length).toBeGreaterThan(0)
  })

  it('includes days from next month', () => {
    const days = getMonthData(2024, 2) // Feb 2024 has 29 days
    const nextMonthDays = days.filter((d) => d.month === 3)
    expect(nextMonthDays.length).toBeGreaterThan(0)
  })

  it('every day has lunar fields', () => {
    const days = getMonthData(2024, 6)
    for (const day of days) {
      expect(day.lunarYear).toBeTruthy()
      expect(day.lunarMonth).toBeTruthy()
      expect(day.lunarDay).toBeTruthy()
    }
  })

  it('February 2024 has 29 days (leap year)', () => {
    const days = getMonthData(2024, 2)
    const febDays = days.filter((d) => d.month === 2)
    expect(febDays).toHaveLength(29)
  })

  it('February 2025 has 28 days (non-leap)', () => {
    const days = getMonthData(2025, 2)
    const febDays = days.filter((d) => d.month === 2)
    expect(febDays).toHaveLength(28)
  })
})