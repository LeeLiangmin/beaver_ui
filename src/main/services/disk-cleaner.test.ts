import { describe, it, expect } from 'vitest'
import { RULES, resolveRulePaths, scanRule, classifyLargeFileLocally, groupLargeFiles } from './disk-cleaner'
import path from 'path'

describe('RULES', () => {
  it('all rules have required fields', () => {
    for (const rule of RULES) {
      expect(rule.id).toBeTruthy()
      expect(rule.label).toBeTruthy()
      expect(rule.description).toBeTruthy()
      expect(['low', 'medium']).toContain(rule.risk)
      expect(typeof rule.needsAdmin).toBe('boolean')
      expect(['temp', 'cache', 'dumps', 'browser', 'dev', 'recycle']).toContain(rule.category)
    }
  })

  it('all rule IDs are unique', () => {
    const ids = RULES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has at least 18 rules', () => {
    expect(RULES.length).toBeGreaterThanOrEqual(18)
  })
})

describe('resolveRulePaths', () => {
  it('returns paths for user-temp', () => {
    const paths = resolveRulePaths('user-temp')
    expect(paths).toHaveLength(1)
    expect(paths[0]).toContain('Temp')
  })

  it('returns paths for win-temp', () => {
    const paths = resolveRulePaths('win-temp')
    expect(paths).toHaveLength(1)
    expect(paths[0]).toBe('C:\\Windows\\Temp')
  })

  it('returns paths for new rules', () => {
    expect(resolveRulePaths('d3dscache').length).toBeGreaterThanOrEqual(1)
    expect(resolveRulePaths('font-cache').length).toBeGreaterThanOrEqual(1)
    expect(resolveRulePaths('wer-reports').length).toBeGreaterThanOrEqual(1)
    expect(resolveRulePaths('ie-cache').length).toBeGreaterThanOrEqual(1)
    expect(resolveRulePaths('yarn-cache').length).toBeGreaterThanOrEqual(1)
    expect(resolveRulePaths('vscode-cache').length).toBeGreaterThanOrEqual(1)
  })

  it('returns empty for recycle-bin (shell API)', () => {
    expect(resolveRulePaths('recycle-bin')).toHaveLength(0)
  })

  it('returns empty for unknown rule', () => {
    expect(resolveRulePaths('nonexistent')).toHaveLength(0)
  })
})

describe('scanRule', () => {
  it('returns a result for a valid rule', () => {
    const result = scanRule('user-temp')
    expect(result.ruleId).toBe('user-temp')
    expect(typeof result.sizeBytes).toBe('number')
    expect(typeof result.fileCount).toBe('number')
    expect(result.accessible).toBeDefined()
  })

  it('handles unknown rule gracefully', () => {
    const result = scanRule('nonexistent')
    expect(result.ruleId).toBe('nonexistent')
    expect(result.sizeBytes).toBe(0)
  })
})

describe('classifyLargeFileLocally', () => {
  it('classifies .msi as 安装包/通常可删', () => {
    const r = classifyLargeFileLocally({ path: 'C:\\tmp\\setup.msi', name: 'setup.msi', sizeBytes: 10e6, modTime: 0 })
    expect(r.category).toBe('安装包')
    expect(r.cleanability).toBe('通常可删')
  })

  it('classifies .log as 日志/通常可删', () => {
    const r = classifyLargeFileLocally({ path: 'C:\\tmp\\app.log', name: 'app.log', sizeBytes: 500, modTime: 0 })
    expect(r.category).toBe('日志文件')
    expect(r.cleanability).toBe('通常可删')
  })

  it('classifies .iso as 镜像/通常可删', () => {
    const r = classifyLargeFileLocally({ path: 'C:\\tmp\\ubuntu.iso', name: 'ubuntu.iso', sizeBytes: 4e9, modTime: 0 })
    expect(r.category).toBe('镜像文件')
  })

  it('classifies .mp4 as 视频/需判断', () => {
    const r = classifyLargeFileLocally({ path: 'C:\\tmp\\movie.mp4', name: 'movie.mp4', sizeBytes: 1e9, modTime: 0 })
    expect(r.category).toBe('视频文件')
    expect(r.cleanability).toBe('需判断')
  })

  it('classifies unknown extension as 其他/需判断', () => {
    const r = classifyLargeFileLocally({ path: 'C:\\tmp\\data.xyz', name: 'data.xyz', sizeBytes: 100, modTime: 0 })
    expect(r.category).toBe('其他')
    expect(r.cleanability).toBe('需判断')
  })

  it('detects node_modules in name', () => {
    const r = classifyLargeFileLocally({ path: path.join('a', 'b', 'node_modules'), name: 'node_modules', sizeBytes: 100, modTime: 0 })
    expect(r.category).toBe('依赖目录')
  })

  it('detects cache in name', () => {
    const r = classifyLargeFileLocally({ path: 'C:\\tmp\\cache', name: '.cache', sizeBytes: 100, modTime: 0 })
    expect(r.category).toBe('缓存')
    expect(r.cleanability).toBe('通常可删')
  })
})

describe('groupLargeFiles', () => {
  it('groups files by category', () => {
    const files = [
      { path: 'a.msi', name: 'a.msi', sizeBytes: 100, modTime: 0 },
      { path: 'b.msi', name: 'b.msi', sizeBytes: 200, modTime: 0 },
      { path: 'c.log', name: 'c.log', sizeBytes: 50, modTime: 0 },
    ]
    const groups = groupLargeFiles(files)
    expect(groups).toHaveLength(2)
    const installGroup = groups.find((g) => g.category === '安装包')!
    expect(installGroup.files).toHaveLength(2)
    expect(installGroup.totalSize).toBe(300)
  })
})