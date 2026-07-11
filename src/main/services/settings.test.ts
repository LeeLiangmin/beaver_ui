import { describe, it, expect, vi, beforeEach } from 'vitest'

const { existsSync, readFileSync, writeFileSync, mkdirSync } = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

vi.mock('fs', () => ({ default: { existsSync, readFileSync, writeFileSync, mkdirSync }, existsSync, readFileSync, writeFileSync, mkdirSync }))

const mockApp = vi.hoisted(() => ({
  isPackaged: false,
  getAppPath: vi.fn(() => '/test/app'),
  getPath: vi.fn(() => '/test/exe'),
}))

vi.mock('electron', () => ({ app: mockApp }))

import { loadSettings, saveSettings } from './settings'
import type { Settings } from '../../shared/types'

describe('loadSettings', () => {
  beforeEach(() => {
    existsSync.mockReset()
    readFileSync.mockReset()
    mockApp.isPackaged = false
    mockApp.getAppPath.mockReturnValue('/test/app')
  })

  it('returns defaults when settings file does not exist', () => {
    existsSync.mockReturnValue(false)
    expect(loadSettings()).toEqual({ dataPath: '/test/app' })
  })

  it('returns defaults when settings file read fails', () => {
    existsSync.mockReturnValue(true)
    readFileSync.mockImplementation(() => { throw new Error('read error') })
    expect(loadSettings()).toEqual({ dataPath: '/test/app' })
  })

  it('returns defaults on corrupt JSON', () => {
    existsSync.mockReturnValue(true)
    readFileSync.mockReturnValue('not valid json')
    expect(loadSettings()).toEqual({ dataPath: '/test/app' })
  })

  it('merges saved values with defaults', () => {
    existsSync.mockReturnValue(true)
    readFileSync.mockReturnValue(JSON.stringify({ aiEnabled: true, aiModel: 'gpt-4' }))
    const result = loadSettings()
    expect(result.dataPath).toBe('/test/app')
    expect(result.aiEnabled).toBe(true)
    expect(result.aiModel).toBe('gpt-4')
  })

  it('uses app.getPath when packaged', () => {
    mockApp.isPackaged = true
    mockApp.getPath.mockReturnValue('/packaged/app.exe')
    existsSync.mockReturnValue(false)
    expect(loadSettings().dataPath).toBe('/packaged')
  })
})

describe('saveSettings', () => {
  beforeEach(() => {
    writeFileSync.mockReset()
    mkdirSync.mockReset()
    existsSync.mockReset()
    existsSync.mockReturnValue(true)
  })

  it('writes settings as JSON', () => {
    const settings: Settings = { dataPath: '/test/app', aiEnabled: true }
    saveSettings(settings)
    expect(writeFileSync).toHaveBeenCalledTimes(1)
    const [path, content] = writeFileSync.mock.calls[0]
    expect(path).toContain('settings.json')
    expect(JSON.parse(content as string)).toEqual(settings)
  })

  it('creates directory if it does not exist', () => {
    existsSync.mockReturnValue(false)
    saveSettings({ dataPath: '/new/path' })
    expect(mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true })
  })
})
