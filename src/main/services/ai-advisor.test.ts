import { describe, it, expect } from 'vitest'
import { RULES } from './disk-cleaner'

describe('AI safety — rule ID validation', () => {
  const VALID_RULE_IDS = new Set(RULES.map((r) => r.id))

  // Simulates the hard filter: any IDs not in the white-list are discarded
  function filterAdvice(rawIds: string[]): string[] {
    return rawIds.filter((id) => VALID_RULE_IDS.has(id))
  }

  it('filters out hallucinated rule IDs', () => {
    const raw = ['user-temp', 'win-temp', 'delete-everything', 'system32', 'hack']
    const filtered = filterAdvice(raw)
    expect(filtered).toEqual(['user-temp', 'win-temp'])
  })

  it('allows all valid IDs through', () => {
    const allValid = RULES.map((r) => r.id)
    const filtered = filterAdvice(allValid)
    expect(filtered).toEqual(allValid)
  })

  it('returns empty array for all-invalid input', () => {
    expect(filterAdvice(['fake-1', 'evil-rule'])).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(filterAdvice([])).toEqual([])
  })
})

describe('AI safety — malformed JSON tolerance', () => {
  function parseLlmOutput(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw.trim())
      if (!Array.isArray(parsed.recommended)) return []
      const VALID_RULE_IDS = new Set(RULES.map((r) => r.id))
      return parsed.recommended.filter((id: string) => VALID_RULE_IDS.has(id))
    } catch {
      return []
    }
  }

  it('parses valid JSON with some invalid IDs', () => {
    const out = parseLlmOutput('{"recommended":["user-temp","bad"],"reasons":{"user-temp":"ok"}}')
    expect(out).toEqual(['user-temp'])
  })

  it('handles completely malformed JSON', () => {
    expect(parseLlmOutput('not json at all')).toEqual([])
  })

  it('handles missing recommended field', () => {
    expect(parseLlmOutput('{"other": "data"}')).toEqual([])
  })

  it('handles recommended being a string instead of array', () => {
    expect(parseLlmOutput('{"recommended": "user-temp"}')).toEqual([])
  })
})