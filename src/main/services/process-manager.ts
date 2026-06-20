import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ProcessInfo {
  pid: number
  name: string
  memoryKB: number
  cpu: string
}

export interface AutoStartEntry {
  name: string
  path: string
  source: string
}

export async function getProcesses(): Promise<ProcessInfo[]> {
  try {
    const { stdout } = await execAsync('tasklist /FO CSV /NH', { timeout: 10000 })
    const lines = stdout.trim().split('\n')
    return lines
      .map((line) => {
        const parts = line.replace(/"/g, '').split(',')
        const name = parts[0]?.trim() || ''
        const pid = parseInt(parts[1]?.trim() || '0', 10)
        const memStr = (parts[4]?.trim() || '0').replace(/[^0-9]/g, '')
        const memKB = parseInt(memStr || '0', 10)
        return { pid, name, memoryKB: memKB, cpu: '' }
      })
      .filter((p) => p.pid > 0)
  } catch {
    return []
  }
}

export async function killProcess(pid: number): Promise<void> {
  await execAsync(`taskkill /PID ${pid} /F`, { timeout: 5000 })
}

export async function getAutoStartEntries(): Promise<AutoStartEntry[]> {
  const entries: AutoStartEntry[] = []
  try {
    const { stdout } = await execAsync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"',
      { timeout: 5000 }
    )
    for (const line of stdout.split('\n')) {
      const match = line.trim().match(/^\s*(.+?)\s+REG_\w+\s+(.+)$/)
      if (match) {
        entries.push({ name: match[1], path: match[2], source: 'HKCU' })
      }
    }
  } catch {}
  return entries
}

export async function removeAutoStart(name: string, source: string): Promise<void> {
  const key = source === 'HKCU'
    ? 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    : 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
  await execAsync(`reg delete "${key}" /v "${name}" /f`, { timeout: 5000 })
}

export async function getProcessPorts(): Promise<{ pid: number; port: number }[]> {
  try {
    const { stdout } = await execAsync('netstat -ano', { timeout: 10000 })
    const results: { pid: number; port: number }[] = []
    for (const line of stdout.split('\n')) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 5 && parts[0] === 'TCP') {
        const localAddr = parts[1]
        const pid = parseInt(parts[4], 10)
        const portMatch = localAddr.match(/:(\d+)$/)
        if (portMatch && !isNaN(pid)) {
          results.push({ pid, port: parseInt(portMatch[1], 10) })
        }
      }
    }
    return results
  } catch {
    return []
  }
}
