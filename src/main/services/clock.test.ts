import { describe, it, expect } from 'vitest'
import { getServerTime, getTimezone } from './clock'

describe('getServerTime', () => {
  it('returns a number close to Date.now()', () => {
    const before = Date.now()
    const result = getServerTime()
    const after = Date.now()
    expect(result).toBeGreaterThanOrEqual(before)
    expect(result).toBeLessThanOrEqual(after)
  })

  it('returns a positive integer', () => {
    expect(Number.isInteger(getServerTime())).toBe(true)
    expect(getServerTime()).toBeGreaterThan(1e12)
  })
})

describe('getTimezone', () => {
  it('returns a non-empty string', () => {
    const tz = getTimezone()
    expect(typeof tz).toBe('string')
    expect(tz.length).toBeGreaterThan(0)
  })

  it('matches Intl format', () => {
    const expected = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(getTimezone()).toBe(expected)
  })
})
