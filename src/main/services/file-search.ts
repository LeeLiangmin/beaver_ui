import fs from 'fs'
import path from 'path'
import { BrowserWindow } from 'electron'
import type { SearchRequest, FileInfo } from '../../shared/types'

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '$Recycle.Bin',
  'System Volume Information',
  'Windows',
  'Program Files',
  'Program Files (x86)',
  'ProgramData',
  'Recovery',
  'MSOCache',
  'Config.Msi',
])

function matchesKeyword(fileName: string, lowerKeyword: string): boolean {
  return fileName.toLowerCase().includes(lowerKeyword)
}

function matchesFileType(fileName: string, isDir: boolean, fileType?: string): boolean {
  if (!fileType || fileType === 'all') return true
  if (fileType === 'dir') return isDir
  if (fileType === 'file') return !isDir
  const ext = path.extname(fileName).toLowerCase().slice(1)
  return ext === fileType.toLowerCase()
}

let abortController: AbortController | null = null

export function searchFiles(req: SearchRequest, window: BrowserWindow): void {
  if (abortController) abortController.abort()
  abortController = new AbortController()
  const signal = abortController.signal

  const results: FileInfo[] = []
  const BATCH_SIZE = 50
  const dirQueue: string[] = [req.searchPath]
  const seen = new Set<string>()
  const MAX_CONCURRENT = 32
  const lowerKeyword = req.keyword.toLowerCase()

  function flush() {
    if (results.length > 0) {
      window.webContents.send('file:found', [...results])
      results.length = 0
    }
  }

  async function processDir(dir: string): Promise<void> {
    let entries: fs.Dirent[]
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    const statJobs: Promise<void>[] = []

    for (const entry of entries) {
      if (signal.aborted) return
      const isDir = entry.isDirectory()

      if (!matchesKeyword(entry.name, lowerKeyword)) {
        if (isDir && !SKIP_DIRS.has(entry.name)) {
          const fullPath = path.join(dir, entry.name)
          if (!seen.has(fullPath)) {
            seen.add(fullPath)
            dirQueue.push(fullPath)
          }
        }
        continue
      }

      const fullPath = path.join(dir, entry.name)
      if (seen.has(fullPath)) continue
      seen.add(fullPath)

      if (isDir) {
        if (matchesFileType(entry.name, true, req.fileType)) {
          results.push({
            name: entry.name,
            path: fullPath,
            size: 0,
            isDir: true,
            modTime: 0,
          })
          if (results.length >= BATCH_SIZE) flush()
        }
        if (!SKIP_DIRS.has(entry.name)) {
          dirQueue.push(fullPath)
        }
      } else if (matchesFileType(entry.name, false, req.fileType)) {
        statJobs.push(
          fs.promises.lstat(fullPath).then(
            (stat) => {
              if (signal.aborted) return
              results.push({
                name: entry.name,
                path: fullPath,
                size: stat.size,
                isDir: false,
                modTime: stat.mtimeMs,
              })
              if (results.length >= BATCH_SIZE) flush()
            },
            () => {},
          ),
        )
      }
    }

    if (statJobs.length > 0) {
      await Promise.allSettled(statJobs)
    }
  }

  async function processChunk(): Promise<void> {
    if (signal.aborted) {
      window.webContents.send('file:complete')
      return
    }

    if (dirQueue.length === 0) {
      flush()
      window.webContents.send('file:complete')
      return
    }

    const batch = dirQueue.splice(0, MAX_CONCURRENT)
    await Promise.allSettled(batch.map((dir) => processDir(dir)))
    setImmediate(processChunk)
  }

  setImmediate(processChunk)
}

export function cancelSearch(): void {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
}

export function getDrives(): string[] {
  if (process.platform === 'win32') {
    const drives: string[] = []
    for (let code = 65; code <= 90; code++) {
      const letter = String.fromCharCode(code)
      const drivePath = `${letter}:\\`
      try {
        fs.accessSync(drivePath)
        drives.push(drivePath)
      } catch {}
    }
    return drives
  }
  return ['/']
}
