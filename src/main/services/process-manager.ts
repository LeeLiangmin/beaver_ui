import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import { BrowserWindow } from 'electron'
import type { ProcessInfo, AutoStartEntry } from '../../shared/types'

const execFileAsync = promisify(execFile)
const MAX_BUFFER = 10 * 1024 * 1024
let activeStreamVersion = 0

interface RawPsProcess {
  ProcessId: number
  Name: string
  ExecutablePath: string | null
  WorkingSetSize: number
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result.map((v) => v.trim())
}

function parseTasklist(stdout: string): ProcessInfo[] {
  const processes: ProcessInfo[] = []
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const parts = parseCsvLine(trimmed)
    const pid = parseInt(parts[1] || '0', 10)
    if (pid <= 0) continue

    const memKB = parseFloat((parts[4] || '0').replace(/[^0-9.]/g, ''))
    processes.push({
      pid,
      name: parts[0] || '',
      exePath: '',
      cpuPercent: 0,
      memoryMB: Math.round(((memKB || 0) / 1024) * 10) / 10,
      memoryPercent: 0,
      status: 'Running',
      ports: [],
    })
  }
  return processes
}

function parsePowerShellProcesses(stdout: string): RawPsProcess[] {
  const txt = stdout.trim()
  if (!txt) return []
  try {
    const parsed = JSON.parse(txt)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

function parseNetstat(stdout: string): Map<number, number[]> {
  const portMap = new Map<number, number[]>()
  for (const line of stdout.split('\n')) {
    const p = line.trim().split(/\s+/)
    if (p.length >= 5 && p[0] === 'TCP') {
      const portMatch = p[1].match(/:(\d+)$/)
      const pid = parseInt(p[4], 10)
      if (portMatch && !isNaN(pid) && pid > 0) {
        if (!portMap.has(pid)) portMap.set(pid, [])
        portMap.get(pid)!.push(parseInt(portMatch[1], 10))
      }
    }
  }
  return portMap
}

async function collectProcesses(): Promise<ProcessInfo[]> {
  const [tasklistResult, psResult, netstatResult] = await Promise.allSettled([
    execFileAsync('tasklist', ['/FO', 'CSV', '/NH'], { timeout: 5000, maxBuffer: MAX_BUFFER }),
    execFileAsync(
      'powershell',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Get-CimInstance Win32_Process | Select-Object ProcessId, Name, ExecutablePath, WorkingSetSize | ConvertTo-Json -Compress',
      ],
      { timeout: 4000, maxBuffer: MAX_BUFFER },
    ),
    execFileAsync('netstat', ['-ano'], { timeout: 4000, maxBuffer: MAX_BUFFER }),
  ])

  if (tasklistResult.status === 'rejected') {
    console.warn('[process-manager] tasklist failed:', tasklistResult.reason)
  }
  if (psResult.status === 'rejected') {
    console.warn('[process-manager] powershell failed:', psResult.reason)
  }
  if (netstatResult.status === 'rejected') {
    console.warn('[process-manager] netstat failed:', netstatResult.reason)
  }

  const processes =
    tasklistResult.status === 'fulfilled' ? parseTasklist(tasklistResult.value.stdout) : []

  const rawProcs =
    psResult.status === 'fulfilled' ? parsePowerShellProcesses(psResult.value.stdout) : []
  const psMap = new Map<number, RawPsProcess>()
  for (const p of rawProcs) {
    if (p.ProcessId > 0) psMap.set(p.ProcessId, p)
  }

  const portMap =
    netstatResult.status === 'fulfilled'
      ? parseNetstat(netstatResult.value.stdout)
      : new Map<number, number[]>()

  if (processes.length > 0) {
    for (const p of processes) {
      const ps = psMap.get(p.pid)
      if (ps) {
        p.exePath = ps.ExecutablePath || ''
        if (ps.WorkingSetSize > 0) {
          p.memoryMB = Math.round((ps.WorkingSetSize / 1024 / 1024) * 10) / 10
        }
      }
      p.ports = portMap.get(p.pid) || []
    }
    return processes
  }

  // Fallback: if tasklist is unavailable but PowerShell succeeded, still return data.
  for (const ps of rawProcs) {
    if (!ps.ProcessId || ps.ProcessId <= 0) continue
    processes.push({
      pid: ps.ProcessId,
      name: ps.Name || '',
      exePath: ps.ExecutablePath || '',
      cpuPercent: 0,
      memoryMB: Math.round((ps.WorkingSetSize / 1024 / 1024) * 10) / 10,
      memoryPercent: 0,
      status: 'Running',
      ports: portMap.get(ps.ProcessId) || [],
    })
  }

  return processes
}

export async function getProcesses(): Promise<ProcessInfo[]> {
  return collectProcesses()
}

function isWindowAvailable(window: BrowserWindow): boolean {
  return !window.isDestroyed() && !window.webContents.isDestroyed()
}

function isStreamActive(version: number): boolean {
  return version === activeStreamVersion
}

function sendStreamEvent(window: BrowserWindow, channel: string, ...args: unknown[]): boolean {
  if (!isWindowAvailable(window)) return false
  try {
    window.webContents.send(channel, ...args)
    return true
  } catch (e) {
    console.error(`[process-manager] send ${channel} failed:`, e)
    return false
  }
}

export function createProcessStreamVersion(): number {
  activeStreamVersion += 1
  return activeStreamVersion
}

export function cancelProcessStreaming(): void {
  activeStreamVersion += 1
}

export function getProcessesStreaming(
  window: BrowserWindow,
  version: number,
  batchSize = 50,
): void {
  ;(async () => {
    console.log(`[process-manager] stream #${version} started`)
    try {
      const processes = await collectProcesses()

      if (!isStreamActive(version)) {
        console.log(`[process-manager] stream #${version} cancelled before emit`)
        return
      }

      console.log(`[process-manager] stream #${version} collected ${processes.length} processes`)

      for (let i = 0; i < processes.length; i += batchSize) {
        if (!isStreamActive(version)) {
          console.log(`[process-manager] stream #${version} cancelled while sending`)
          return
        }
        const sent = sendStreamEvent(
          window,
          'process:batch',
          version,
          processes.slice(i, i + batchSize),
        )
        if (!sent) return
      }

      sendStreamEvent(window, 'process:complete', version)
    } catch (e) {
      if (!isStreamActive(version)) return

      const message = e instanceof Error ? e.message : String(e)
      console.error(`[process-manager] stream #${version} failed:`, e)
      sendStreamEvent(window, 'process:error', version, message)
      sendStreamEvent(window, 'process:complete', version)
    }
  })()
}

export async function killProcess(pid: number): Promise<void> {
  await execFileAsync('taskkill', ['/PID', String(pid), '/F'], { timeout: 5000 })
}

export async function restartProcess(pid: number, exePath: string): Promise<void> {
  try {
    await execFileAsync('taskkill', ['/PID', String(pid), '/F'], { timeout: 5000 })
  } catch {}
  spawn(exePath, [], { detached: true, stdio: 'ignore', shell: false }).unref()
}

export async function getAutoStartEntries(exePath: string): Promise<AutoStartEntry[]> {
  const entries: AutoStartEntry[] = []
  const lower = exePath.toLowerCase()

  for (const hive of ['HKCU', 'HKLM'] as const) {
    const keyPath =
      hive === 'HKCU'
        ? 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
        : 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    try {
      const { stdout } = await execFileAsync('reg', ['query', keyPath], { timeout: 5000 })
      for (const line of stdout.split('\n')) {
        const match = line.trim().match(/^\s*(.+?)\s+REG_\w+\s+(.+)$/)
        if (match && match[2].toLowerCase().includes(lower)) {
          entries.push({
            type: hive === 'HKCU' ? 'registry_run_hkcu' : 'registry_run_hklm',
            name: match[1],
            path: match[2],
          })
        }
      }
    } catch {}
  }
  return entries
}

export async function disableAutoStart(entryType: string, entryName: string): Promise<void> {
  const key =
    entryType === 'registry_run_hkcu'
      ? 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
      : 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
  await execFileAsync('reg', ['delete', key, '/v', entryName, '/f'], { timeout: 5000 })
}
