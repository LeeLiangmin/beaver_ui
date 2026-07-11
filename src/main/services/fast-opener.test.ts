import { describe, it, expect, vi, beforeEach } from 'vitest'

const { existsSync } = vi.hoisted(() => ({
  existsSync: vi.fn(),
}))

vi.mock('fs', () => ({ default: { existsSync }, existsSync }))

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => '/test/app',
    getPath: () => '/test/exe',
  },
}))

const mockDb = vi.hoisted(() => ({
  get: vi.fn(),
  prepare: vi.fn(() => ({
    run: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
  })),
  transaction: vi.fn((fn: () => void) => { fn(); return fn }),
}))

vi.mock('./db', () => ({
  getDb: () => mockDb,
}))

import { validatePath } from './fast-opener'

describe('validatePath', () => {
  beforeEach(() => {
    existsSync.mockReset()
  })

  it('returns true when path exists', () => {
    existsSync.mockReturnValue(true)
    expect(validatePath('/valid/path')).toBe(true)
  })

  it('returns false when path does not exist', () => {
    existsSync.mockReturnValue(false)
    expect(validatePath('/invalid/path')).toBe(false)
  })

  it('returns false on filesystem error', () => {
    existsSync.mockImplementation(() => { throw new Error('access denied') })
    expect(validatePath('/restricted')).toBe(false)
  })
})
