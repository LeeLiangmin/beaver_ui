import fs from 'fs'
import path from 'path'
import { BrowserWindow } from 'electron'

export interface SearchRequest {
  keyword: string
  searchPath: string
  fileType?: string
}

export interface FileInfo {
  name: string
  path: string
  size: number
  isDir: boolean
  modTime: number
}

function matchesKeyword(fileName: string, keyword: string): boolean {
  const lowerName = fileName.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  return lowerName.includes(lowerKeyword)
}

function matchesFileType(fileName: string, fileType?: string): boolean {
  if (!fileType || fileType === 'all') return true
  const ext = path.extname(fileName).toLowerCase().slice(1)
  return ext === fileType.toLowerCase()
}

let abortController: AbortController | null = null

export function searchFiles(
  req: SearchRequest,
  window: BrowserWindow,
): void {
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()
  const signal = abortController.signal

  const results: FileInfo[] = []
  const BATCH_SIZE = 50

  function walk(dir: string) {
    if (signal.aborted) return
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (signal.aborted) return
        const fullPath = path.join(dir, entry.name)
        try {
          if (entry.isDirectory()) {
            if (matchesKeyword(entry.name, req.keyword)) {
              const stat = fs.statSync(fullPath)
              const info: FileInfo = {
                name: entry.name,
                path: fullPath,
                size: stat.size,
                isDir: true,
                modTime: stat.mtimeMs,
              }
              results.push(info)
              if (results.length >= BATCH_SIZE) {
                window.webContents.send('file:found', [...results])
                results.length = 0
              }
            }
            walk(fullPath)
          } else {
            if (
              matchesKeyword(entry.name, req.keyword) &&
              matchesFileType(entry.name, req.fileType)
            ) {
              const stat = fs.statSync(fullPath)
              const info: FileInfo = {
                name: entry.name,
                path: fullPath,
                size: stat.size,
                isDir: false,
                modTime: stat.mtimeMs,
              }
              results.push(info)
              if (results.length >= BATCH_SIZE) {
                window.webContents.send('file:found', [...results])
                results.length = 0
              }
            }
          }
        } catch {
          // skip inaccessible files
        }
      }
    } catch {
      // skip inaccessible directories
    }
  }

  try {
    walk(req.searchPath)
    if (!signal.aborted && results.length > 0) {
      window.webContents.send('file:found', [...results])
    }
    if (!signal.aborted) {
      window.webContents.send('file:complete')
    }
  } catch {
    if (!signal.aborted) {
      window.webContents.send('file:complete')
    }
  }
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
      } catch {
        // drive not available
      }
    }
    return drives
  }
  return ['/']
}
