import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execAsync = promisify(exec)

export interface EnvEntry {
  name: string
  value: string
  scope: 'user' | 'system'
}

export function getProcessEnv(): EnvEntry[] {
  const entries: EnvEntry[] = []
  for (const [name, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      entries.push({ name, value, scope: 'user' })
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getSystemEnv(): Promise<EnvEntry[]> {
  const entries: EnvEntry[] = []
  try {
    const { stdout } = await execAsync(
      'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment"',
      { timeout: 5000 }
    )
    const lines = stdout.split('\n')
    for (const line of lines) {
      const match = line.trim().match(/^\s*(.+?)\s+REG_\w+\s+(.+)$/)
      if (match && match[1] !== 'Path') {
        entries.push({ name: match[1], value: match[2], scope: 'system' })
      }
    }
  } catch {}
  return entries
}

export async function setUserEnv(name: string, value: string): Promise<void> {
  await execAsync(`setx "${name}" "${value}"`, { timeout: 5000 })
}

export async function deleteUserEnv(name: string): Promise<void> {
  await execAsync(
    `reg delete "HKCU\\Environment" /v "${name}" /f`,
    { timeout: 5000 }
  )
}

export async function backupEnvToToml(filePath: string): Promise<string> {
  const processEnv = getProcessEnv()
  const systemEnv = await getSystemEnv()

  let toml = '# Environment Variables Backup\n'
  toml += `# Generated: ${new Date().toISOString()}\n\n`

  toml += '[process]\n'
  for (const e of processEnv) {
    toml += `${e.name} = "${e.value.replace(/"/g, '\\"')}"\n`
  }

  toml += '\n[system]\n'
  for (const e of systemEnv) {
    toml += `${e.name} = "${e.value.replace(/"/g, '\\"')}"\n`
  }

  fs.writeFileSync(filePath, toml, 'utf-8')
  return filePath
}
