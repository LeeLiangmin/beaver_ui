import { describe, it, expect } from 'vitest'
import { escapeToml, unescapeToml, buildBackupToml, parseBackupToml } from './env-manager'
import type { EnvVar } from '../../shared/types'

describe('escapeToml / unescapeToml', () => {
  it('round-trips special characters', () => {
    const original = 'hello\nworld\t"quoted"\\path'
    expect(unescapeToml(escapeToml(original))).toBe(original)
  })

  it('escapeToml escapes backslash and double-quote', () => {
    const result = escapeToml('a\\b"c')
    expect(result).toBe('a\\\\b\\"c')
  })

  it('escapeToml escapes newlines and tabs', () => {
    const result = escapeToml('line1\nline2\tend')
    expect(result).toBe('line1\\nline2\\tend')
  })

  it('unescapeToml restores escaped sequences', () => {
    const result = unescapeToml('hello\\nworld\\t\\"test\\"\\\\')
    expect(result).toBe('hello\nworld\t"test"\\')
  })

  it('plain string passes through unchanged', () => {
    expect(escapeToml('hello')).toBe('hello')
    expect(unescapeToml('hello')).toBe('hello')
  })
})

describe('buildBackupToml / parseBackupToml', () => {
  it('round-trips env vars', () => {
    const items: EnvVar[] = [
      { key: 'PATH', value: 'C:\\Windows', groupId: '' },
      { key: 'JAVA_HOME', value: 'C:\\Program Files\\Java\\jdk-17', groupId: '' },
      { key: 'EMPTY', value: '', groupId: '' },
    ]
    const toml = buildBackupToml(items)
    const parsed = parseBackupToml(toml)
    expect(parsed).toHaveLength(3)
    expect(parsed[0].key).toBe('PATH')
    expect(parsed[0].value).toBe('C:\\Windows')
    expect(parsed[1].key).toBe('JAVA_HOME')
    expect(parsed[2].key).toBe('EMPTY')
    expect(parsed[2].value).toBe('')
  })

  it('handles empty input', () => {
    const toml = buildBackupToml([])
    const parsed = parseBackupToml(toml)
    expect(parsed).toHaveLength(0)
  })

  it('ignores comments', () => {
    const toml = '# this is a comment\n[[items]]\nkey = "FOO"\nvalue = "bar"\n'
    const parsed = parseBackupToml(toml)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].key).toBe('FOO')
  })

  it('handles values with semicolons', () => {
    const items: EnvVar[] = [{ key: 'PATHS', value: 'A;B;C;D', groupId: '' }]
    const toml = buildBackupToml(items)
    const parsed = parseBackupToml(toml)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].value).toBe('A;B;C;D')
  })
})