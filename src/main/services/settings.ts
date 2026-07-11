import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { Settings } from '../../shared/types'

function getDataPath(): string {
  return app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath()
}

function getSettingsPath(): string {
  return path.join(getDataPath(), 'settings.json')
}

export function loadSettings(): Settings {
  const defaults: Settings = { dataPath: getDataPath() }
  try {
    const filePath = getSettingsPath()
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return { ...defaults, ...JSON.parse(raw) }
    }
  } catch {
    // fall through to defaults
  }
  return defaults
}

export function saveSettings(s: Settings): void {
  const filePath = getSettingsPath()
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(s, null, 2), 'utf-8')
}
