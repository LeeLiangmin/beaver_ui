import fs from 'fs'
import path from 'path'
import os from 'os'
import { BrowserWindow, shell } from 'electron'
import type { CleanupRule, CleanupScanResult, CleanupResult, LargeFile, LargeFileScanRequest } from '../../shared/types'

export { type CleanupRule, type CleanupScanResult, type CleanupResult, type LargeFile, type LargeFileScanRequest }

// ── White-listed cleanup rules ──────────────────────────────────
export const RULES: CleanupRule[] = [
  {
    id: 'user-temp',
    label: '用户临时文件',
    description: '%TEMP% 目录下的临时文件',
    risk: 'low',
    needsAdmin: false,
    category: 'temp',
  },
  {
    id: 'win-temp',
    label: '系统临时文件',
    description: 'C:\\Windows\\Temp 目录',
    risk: 'low',
    needsAdmin: true,
    category: 'temp',
  },
  {
    id: 'thumbcache',
    label: '缩略图缓存',
    description: 'Windows 资源管理器缩略图缓存',
    risk: 'low',
    needsAdmin: false,
    category: 'cache',
  },
  {
    id: 'd3dscache',
    label: 'DirectX 着色器缓存',
    description: 'GPU 着色器编译缓存，游戏/图形程序会自动重建',
    risk: 'low',
    needsAdmin: false,
    category: 'cache',
  },
  {
    id: 'font-cache',
    label: '字体缓存',
    description: 'Windows 字体缓存文件',
    risk: 'low',
    needsAdmin: false,
    category: 'cache',
  },
  {
    id: 'crash-dumps',
    label: '崩溃转储',
    description: '程序崩溃时生成的 .dmp 文件',
    risk: 'low',
    needsAdmin: false,
    category: 'dumps',
  },
  {
    id: 'wer-reports',
    label: 'Windows 错误报告',
    description: 'Windows 错误报告临时文件(WER)',
    risk: 'low',
    needsAdmin: false,
    category: 'dumps',
  },
  {
    id: 'win-update',
    label: 'Windows 更新缓存',
    description: 'Windows Update 下载的更新文件',
    risk: 'medium',
    needsAdmin: true,
    category: 'cache',
  },
  {
    id: 'delivery-opt',
    label: '传递优化文件',
    description: 'Windows 更新传递优化缓存',
    risk: 'low',
    needsAdmin: true,
    category: 'cache',
  },
  {
    id: 'chrome-cache',
    label: 'Chrome 浏览器缓存',
    description: 'Google Chrome 浏览器缓存',
    risk: 'low',
    needsAdmin: false,
    category: 'browser',
  },
  {
    id: 'edge-cache',
    label: 'Edge 浏览器缓存',
    description: 'Microsoft Edge 浏览器缓存',
    risk: 'low',
    needsAdmin: false,
    category: 'browser',
  },
  {
    id: 'firefox-cache',
    label: 'Firefox 浏览器缓存',
    description: 'Mozilla Firefox 浏览器缓存',
    risk: 'low',
    needsAdmin: false,
    category: 'browser',
  },
  {
    id: 'ie-cache',
    label: 'IE / 旧版缓存',
    description: 'Internet Explorer 及旧版 Windows 缓存',
    risk: 'low',
    needsAdmin: false,
    category: 'browser',
  },
  {
    id: 'npm-cache',
    label: 'npm 缓存',
    description: 'npm 包管理器缓存',
    risk: 'low',
    needsAdmin: false,
    category: 'dev',
  },
  {
    id: 'yarn-cache',
    label: 'Yarn 缓存',
    description: 'Yarn 包管理器缓存',
    risk: 'low',
    needsAdmin: false,
    category: 'dev',
  },
  {
    id: 'pnpm-cache',
    label: 'pnpm 缓存',
    description: 'pnpm store 缓存目录',
    risk: 'low',
    needsAdmin: false,
    category: 'dev',
  },
  {
    id: 'pip-cache',
    label: 'pip 缓存',
    description: 'Python pip 包管理器缓存',
    risk: 'low',
    needsAdmin: false,
    category: 'dev',
  },
  {
    id: 'vscode-cache',
    label: 'VS Code 缓存',
    description: 'Visual Studio Code 缓存和 CachedData',
    risk: 'low',
    needsAdmin: false,
    category: 'dev',
  },
  {
    id: 'recycle-bin',
    label: '回收站',
    description: '清空 Windows 回收站',
    risk: 'medium',
    needsAdmin: false,
    category: 'recycle',
  },
]

// ── Path resolution ─────────────────────────────────────────────
function globDirs(baseDir: string, pattern: RegExp): string[] {
  if (!fs.existsSync(baseDir)) return [baseDir]
  const result: string[] = []
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory() && pattern.test(e.name)) {
        result.push(path.join(baseDir, e.name))
      }
    }
  } catch {}
  return result.length > 0 ? result : [baseDir]
}

export function resolveRulePaths(ruleId: string): string[] {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
  const temp = process.env.TEMP || process.env.TMP || path.join(os.homedir(), 'AppData', 'Local', 'Temp')

  switch (ruleId) {
    case 'user-temp':
      return [temp]
    case 'win-temp':
      return ['C:\\Windows\\Temp']
    case 'thumbcache':
      return [path.join(localAppData, 'Microsoft', 'Windows', 'Explorer')]
    case 'd3dscache':
      return [path.join(localAppData, 'D3DSCache')]
    case 'font-cache':
      return [
        path.join(localAppData, 'Microsoft', 'Windows', 'FontCache'),
        path.join(localAppData, 'FontCache'),
      ]
    case 'crash-dumps':
      return [path.join(localAppData, 'CrashDumps')]
    case 'wer-reports':
      return [path.join(localAppData, 'Microsoft', 'Windows', 'WER')]
    case 'win-update':
      return ['C:\\Windows\\SoftwareDistribution\\Download']
    case 'delivery-opt':
      return ['C:\\Windows\\SoftwareDistribution\\DeliveryOptimization']
    case 'chrome-cache':
      return [
        path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
        path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
      ]
    case 'edge-cache':
      return [
        path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
        path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache'),
      ]
    case 'firefox-cache': {
      const profilesDir = path.join(appData, 'Mozilla', 'Firefox', 'Profiles')
      return globDirs(profilesDir, /^[\w-]+\./).map((p) => path.join(p, 'cache2'))
    }
    case 'ie-cache':
      return [path.join(localAppData, 'Microsoft', 'Windows', 'INetCache')]
    case 'npm-cache':
      return [path.join(appData, 'npm-cache')]
    case 'yarn-cache':
      return [path.join(localAppData, 'Yarn', 'Cache')]
    case 'pnpm-cache': {
      const pnpmHome = process.env.PNPM_HOME || path.join(localAppData, 'pnpm')
      return [path.join(pnpmHome, 'store')]
    }
    case 'pip-cache':
      return [path.join(localAppData, 'pip', 'cache')]
    case 'vscode-cache':
      return [
        path.join(appData, 'Code', 'Cache'),
        path.join(appData, 'Code', 'CachedData'),
        path.join(appData, 'Code', 'CachedExtensions'),
      ]
    case 'recycle-bin':
      return []
    default:
      return []
  }
}

// ── Scanning ─────────────────────────────────────────────────────
const SKIP_NAMES = new Set(['node_modules', '.git', '.svn', '.hg'])

function scanDir(dirPath: string, collect: { count: number; bytes: number }): void {
  if (!fs.existsSync(dirPath)) return
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name)
    if (SKIP_NAMES.has(entry.name)) continue
    try {
      if (entry.isDirectory()) {
        scanDir(full, collect)
      } else if (entry.isFile()) {
        const stat = fs.statSync(full)
        collect.bytes += stat.size
        collect.count++
      }
    } catch {
      // permission / locked — skip silently
    }
  }
}

function scanRecycleBin(): CleanupScanResult {
  const drives: string[] = []
  for (let code = 65; code <= 90; code++) {
    const letter = String.fromCharCode(code)
    const rp = path.join(`${letter}:\\`, '$Recycle.Bin')
    if (fs.existsSync(rp)) drives.push(rp)
  }
  const collect = { count: 0, bytes: 0 }
  for (const d of drives) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true })
      for (const e of entries) {
        try {
          const full = path.join(d, e.name)
          scanDir(full, collect)
        } catch {}
      }
    } catch {}
  }
  return { ruleId: 'recycle-bin', sizeBytes: collect.bytes, fileCount: collect.count, accessible: true }
}

export function scanRule(ruleId: string): CleanupScanResult {
  if (ruleId === 'recycle-bin') return scanRecycleBin()

  const roots = resolveRulePaths(ruleId)
  const collect = { count: 0, bytes: 0 }
  let accessible = true
  let skippedReason: string | undefined

  for (const r of roots) {
    if (!fs.existsSync(r)) {
      accessible = false
      skippedReason = `路径不存在: ${r}`
      continue
    }
    try {
      fs.accessSync(r, fs.constants.R_OK | fs.constants.W_OK)
    } catch (e: any) {
      accessible = false
      if (e.code === 'EPERM' || e.code === 'EACCES') {
        skippedReason = '需要管理员权限'
      } else {
        skippedReason = `无法访问: ${e.message}`
      }
      continue
    }
    scanDir(r, collect)
  }

  return {
    ruleId,
    sizeBytes: collect.bytes,
    fileCount: collect.count,
    accessible,
    skippedReason: collect.count === 0 && !accessible ? skippedReason : undefined,
  }
}

// ── Streaming scan ───────────────────────────────────────────────
let scanVersion = 0

export function cancelScan(): void {
  scanVersion += 1
}

export function createScanVersion(): number {
  scanVersion += 1
  return scanVersion
}

export function isScanActive(version: number): boolean {
  return version === scanVersion
}

export async function scanCleanup(win: BrowserWindow, version: number): Promise<void> {
  const results: CleanupScanResult[] = []
  for (const rule of RULES) {
    if (!isScanActive(version)) return
    const result = scanRule(rule.id)
    results.push(result)
    try {
      win.webContents.send('cleaner:scanProgress', result)
    } catch {}
  }
  try {
    win.webContents.send('cleaner:scanComplete', results)
  } catch {}
}

// ── Cleanup ──────────────────────────────────────────────────────

function deleteRecursive(dirPath: string, permanent: boolean): { deleted: number; skipped: number; errors: string[] } {
  const result = { deleted: 0, skipped: 0, errors: [] as string[] }
  if (!fs.existsSync(dirPath)) return result

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch (e: any) {
    result.errors.push(e.message)
    return result
  }

  for (const entry of entries) {
    const full = path.join(dirPath, entry.name)
    try {
      if (entry.isDirectory()) {
        const sub = deleteRecursive(full, permanent)
        result.deleted += sub.deleted
        result.skipped += sub.skipped
        result.errors.push(...sub.errors)
        try { fs.rmdirSync(full) } catch {}
      } else {
        if (permanent) {
          fs.unlinkSync(full)
        } else {
          shell.trashItem(full)
        }
        result.deleted++
      }
    } catch (e: any) {
      if (e.code === 'EBUSY' || e.code === 'EPERM') {
        result.skipped++
      } else {
        result.errors.push(e.message)
      }
    }
  }
  return result
}

export async function cleanupItems(ruleIds: string[], permanent: boolean): Promise<CleanupResult[]> {
  const results: CleanupResult[] = []

  for (const ruleId of ruleIds) {
    const result: CleanupResult = { ruleId, freedBytes: 0, deletedCount: 0, skippedCount: 0, errors: [] }

    if (ruleId === 'recycle-bin') {
      try {
        // Move recycle bin contents to... recycle bin would be redundant.
        // Instead permanently delete recycle bin contents.
        const drives: string[] = []
        for (let code = 65; code <= 90; code++) {
          const d = `${String.fromCharCode(code)}:\\`
          if (fs.existsSync(d)) drives.push(d)
        }
        for (const d of drives) {
          const rb = path.join(d, '$Recycle.Bin')
          if (fs.existsSync(rb)) {
            const sub = deleteRecursive(rb, true)
            result.deletedCount += sub.deleted
            result.skippedCount += sub.skipped
            result.errors.push(...sub.errors)
          }
        }
      } catch (e: any) {
        result.errors.push(e.message)
      }
      results.push(result)
      continue
    }

    const roots = resolveRulePaths(ruleId)
    if (roots.length === 0) {
      result.errors.push('未知清理规则')
      results.push(result)
      continue
    }

    for (const root of roots) {
      if (!fs.existsSync(root)) continue
      const sub = deleteRecursive(root, permanent)
      result.deletedCount += sub.deleted
      result.skippedCount += sub.skipped
      result.errors.push(...sub.errors)
    }

    results.push(result)
  }

  return results
}

// ── Large file scanning ──────────────────────────────────────────
let largeFileVersion = 0

export function cancelLargeFileScan(): void {
  largeFileVersion += 1
}

export function createLargeFileScanVersion(): number {
  largeFileVersion += 1
  return largeFileVersion
}

export function scanLargeFiles(req: LargeFileScanRequest, win: BrowserWindow, version: number): void {
  const BATCH_SIZE = 40
  const MAX_DEPTH = 15
  const batch: LargeFile[] = []
  const minBytes = req.minSizeMB * 1024 * 1024
  const seen = new Set<string>()

  function flush() {
    if (batch.length > 0) {
      try { win.webContents.send('cleaner:largeFileFound', [...batch]) } catch {}
      batch.length = 0
    }
  }

  function walk(dirPath: string, depth: number) {
    if (version !== largeFileVersion || depth > MAX_DEPTH) return
    let entries: fs.Dirent[]
    try { entries = fs.readdirSync(dirPath, { withFileTypes: true }) } catch { return }

    for (const entry of entries) {
      if (version !== largeFileVersion) return
      const full = path.join(dirPath, entry.name)
      if (seen.has(full) || SKIP_NAMES.has(entry.name)) continue
      seen.add(full)

      try {
        if (entry.isDirectory()) {
          walk(full, depth + 1)
        } else if (entry.isFile()) {
          const stat = fs.statSync(full)
          if (stat.size >= minBytes) {
            batch.push({ path: full, name: entry.name, sizeBytes: stat.size, modTime: stat.mtimeMs })
            if (batch.length >= BATCH_SIZE) flush()
          }
        }
      } catch {}
    }
  }

  setImmediate(() => {
    walk(req.searchPath, 0)
    flush()
    try { win.webContents.send('cleaner:largeFileComplete') } catch {}
  })
}

// ── Local large file classification ───────────────────────────────
export interface LargeFileCategory {
  category: string
  cleanability: '通常可删' | '可能重要' | '需判断'
  reason: string
}

export function classifyLargeFileLocally(file: LargeFile): LargeFileCategory {
  const name = file.name.toLowerCase()
  const ext = path.extname(name)

  const extMap: Record<string, LargeFileCategory> = {
    '.msi': { category: '安装包', cleanability: '通常可删', reason: '安装包通常在安装后可删除' },
    '.exe': { category: '安装包', cleanability: '可能重要', reason: '可执行文件，可能是安装程序或重要程序' },
    '.iso': { category: '镜像文件', cleanability: '通常可删', reason: '光盘镜像，安装后通常可删除' },
    '.vmdk': { category: '虚拟机镜像', cleanability: '可能重要', reason: '虚拟机磁盘文件，删除前请确认未使用' },
    '.vdi': { category: '虚拟机镜像', cleanability: '可能重要', reason: '虚拟机磁盘文件' },
    '.vhd': { category: '虚拟机镜像', cleanability: '可能重要', reason: '虚拟机磁盘文件' },
    '.vbox': { category: '虚拟机镜像', cleanability: '可能重要', reason: '虚拟机磁盘文件' },
    '.zip': { category: '压缩包', cleanability: '需判断', reason: '压缩包，可能是备份或下载文件' },
    '.rar': { category: '压缩包', cleanability: '需判断', reason: '压缩包' },
    '.7z': { category: '压缩包', cleanability: '需判断', reason: '压缩包' },
    '.tar': { category: '压缩包', cleanability: '需判断', reason: '压缩包' },
    '.gz': { category: '压缩包', cleanability: '需判断', reason: '压缩包' },
    '.log': { category: '日志文件', cleanability: '通常可删', reason: '日志文件，通常可安全删除' },
    '.mp4': { category: '视频文件', cleanability: '需判断', reason: '视频文件，可能是录制内容' },
    '.avi': { category: '视频文件', cleanability: '需判断', reason: '视频文件' },
    '.mkv': { category: '视频文件', cleanability: '需判断', reason: '视频文件' },
    '.mov': { category: '视频文件', cleanability: '需判断', reason: '视频文件' },
    '.dmp': { category: '崩溃转储', cleanability: '通常可删', reason: '程序崩溃转储文件，调试后可删除' },
    '.pdb': { category: '调试符号', cleanability: '通常可删', reason: '调试符号文件，非开发环境可删除' },
    '.tmp': { category: '临时文件', cleanability: '通常可删', reason: '临时文件' },
    '.bak': { category: '备份文件', cleanability: '需判断', reason: '备份文件，确认不需要后可删除' },
    '.old': { category: '旧文件', cleanability: '需判断', reason: '旧版本文件，确认不需要后可删除' },
  }

  if (extMap[ext]) return extMap[ext]

  // Path patterns
  if (name.includes('node_modules')) return { category: '依赖目录', cleanability: '可能重要', reason: 'node_modules 可重新安装，但删除后需重新 npm install' }
  if (name.includes('cache') || name.includes('.cache')) return { category: '缓存', cleanability: '通常可删', reason: '缓存文件，会自动重建' }
  if (name.startsWith('~') || name.endsWith('~')) return { category: '临时文件', cleanability: '通常可删', reason: '编辑器自动备份文件' }

  return { category: '其他', cleanability: '需判断', reason: '无法自动识别，请手动判断' }
}

export function groupLargeFiles(files: LargeFile[]): { category: string; cleanability: string; reason: string; files: LargeFile[]; totalSize: number }[] {
  const groups = new Map<string, { category: string; cleanability: string; reason: string; files: LargeFile[]; totalSize: number }>()

  for (const f of files) {
    const c = classifyLargeFileLocally(f)
    const key = c.category
    const existing = groups.get(key)
    if (existing) {
      existing.files.push(f)
      existing.totalSize += f.sizeBytes
    } else {
      groups.set(key, { category: c.category, cleanability: c.cleanability, reason: c.reason, files: [f], totalSize: f.sizeBytes })
    }
  }

  return [...groups.values()].sort((a, b) => b.totalSize - a.totalSize)
}

// ── Built-in cleanup presets ─────────────────────────────────────
import type { CleanupPreset, HealthScore } from '../../shared/types'

export const PRESETS: CleanupPreset[] = [
  {
    id: 'safe',
    label: '安全清理',
    emoji: '✨',
    description: '仅清理确定可以安全删除的临时文件和缓存',
    ruleIds: ['user-temp', 'thumbcache', 'crash-dumps', 'wer-reports', 'font-cache', 'd3dscache'],
  },
  {
    id: 'browser',
    label: '浏览器加速',
    emoji: '🌐',
    description: '清空所有浏览器缓存，让浏览器焕然一新',
    ruleIds: ['chrome-cache', 'edge-cache', 'firefox-cache', 'ie-cache'],
  },
  {
    id: 'dev',
    label: '开发环境',
    emoji: '⚡',
    description: '清理各类包管理器缓存和 IDE 缓存',
    ruleIds: ['npm-cache', 'yarn-cache', 'pnpm-cache', 'pip-cache', 'vscode-cache'],
  },
  {
    id: 'deep',
    label: '深度清理',
    emoji: '🔥',
    description: '包含系统临时、Windows 更新缓存等（需管理员）',
    ruleIds: [
      'user-temp',
      'win-temp',
      'thumbcache',
      'crash-dumps',
      'wer-reports',
      'win-update',
      'delivery-opt',
      'd3dscache',
      'font-cache',
    ],
  },
]

// ── Health score computation ─────────────────────────────────────
export function computeHealthScore(results: CleanupScanResult[]): HealthScore {
  const rulesMap = new Map(RULES.map((r) => [r.id, r]))
  const total = results.reduce((s, r) => s + (r.accessible ? r.sizeBytes : 0), 0)
  const totalMB = total / 1024 / 1024

  const categoryTotals: Record<string, { bytes: number; count: number }> = {}
  for (const r of results) {
    if (!r.accessible) continue
    const rule = rulesMap.get(r.ruleId)
    const cat = rule?.category || 'other'
    if (!categoryTotals[cat]) categoryTotals[cat] = { bytes: 0, count: 0 }
    categoryTotals[cat].bytes += r.sizeBytes
    categoryTotals[cat].count += r.fileCount
  }

  // Score: 100 = pristine, deduct based on total reclaimable space
  // <500MB=100, 500MB-2GB=90-70, 2-10GB=70-40, >10GB=40-10
  let score = 100
  let level: HealthScore['level'] = 'excellent'
  let summary = '磁盘状态良好'

  if (totalMB > 10 * 1024) {
    score = Math.max(10, 40 - Math.log2(totalMB / 1024 - 9) * 5)
    level = 'poor'
    summary = `发现大量可清理空间（${(total / 1024 / 1024 / 1024).toFixed(1)}GB），建议尽快清理`
  } else if (totalMB > 2 * 1024) {
    score = Math.max(40, 70 - (totalMB / 1024 - 2) * 4)
    level = 'fair'
    summary = `发现可观的可清理空间（${(total / 1024 / 1024 / 1024).toFixed(1)}GB），建议清理`
  } else if (totalMB > 500) {
    score = Math.max(70, 90 - (totalMB - 500) / 50)
    level = 'good'
    summary = `有一些可清理空间（${totalMB.toFixed(0)}MB），可选择清理`
  } else if (totalMB > 100) {
    score = 90
    level = 'good'
    summary = `少量可清理空间（${totalMB.toFixed(0)}MB）`
  } else {
    score = 100
    level = 'excellent'
    summary = '磁盘非常干净'
  }

  return {
    score: Math.round(score),
    level,
    summary,
    totalReclaimableBytes: total,
    categoryTotals,
  }
}

export function buildFallbackInsights(results: CleanupScanResult[]) {
  const rulesMap = new Map(RULES.map((r) => [r.id, r]))
  const health = computeHealthScore(results)

  // Sort accessible items by size desc
  const sorted = results
    .filter((r) => r.accessible && r.sizeBytes > 0)
    .sort((a, b) => b.sizeBytes - a.sizeBytes)

  const cards = []
  const emojiMap: Record<string, string> = {
    temp: '🗑️',
    cache: '💾',
    browser: '🌐',
    dev: '⚡',
    dumps: '💥',
    recycle: '♻️',
  }

  // Group top items by category
  const catGroups = new Map<string, CleanupScanResult[]>()
  for (const r of sorted) {
    const rule = rulesMap.get(r.ruleId)
    if (!rule) continue
    if (!catGroups.has(rule.category)) catGroups.set(rule.category, [])
    catGroups.get(rule.category)!.push(r)
  }

  const catNameMap: Record<string, string> = {
    temp: '临时文件',
    cache: '系统缓存',
    browser: '浏览器缓存',
    dev: '开发工具缓存',
    dumps: '崩溃报告',
    recycle: '回收站',
  }

  let idx = 0
  for (const [cat, items] of catGroups) {
    if (items.length === 0) continue
    const totalBytes = items.reduce((s, r) => s + r.sizeBytes, 0)
    const totalCount = items.reduce((s, r) => s + r.fileCount, 0)
    const totalMB = totalBytes / 1024 / 1024
    if (totalMB < 10) continue // skip trivial

    const urgency: 'high' | 'medium' | 'low' = totalMB > 1024 ? 'high' : totalMB > 200 ? 'medium' : 'low'

    cards.push({
      id: `local-${idx++}`,
      title: catNameMap[cat] || cat,
      narrative: `发现 ${items.length} 项${catNameMap[cat] || cat}，占用 ${(totalBytes / 1024 / 1024).toFixed(0)}MB，共 ${totalCount.toLocaleString()} 个文件`,
      ruleIds: items.map((r) => r.ruleId),
      actionLabel: '一键清理',
      reclaimableBytes: totalBytes,
      fileCount: totalCount,
      urgency,
      emoji: emojiMap[cat] || '📦',
    })
  }

  cards.sort((a, b) => b.reclaimableBytes - a.reclaimableBytes)

  return {
    healthScore: health.score,
    headline: health.summary,
    summary: `扫描到 ${cards.length} 类可清理内容，总共可释放 ${(health.totalReclaimableBytes / 1024 / 1024).toFixed(0)}MB`,
    cards,
    quickActions: PRESETS.map((p) => ({ label: p.label, ruleIds: p.ruleIds, emoji: p.emoji })),
  }
}
