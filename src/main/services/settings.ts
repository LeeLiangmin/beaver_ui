import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface Settings {
  dataPath: string
}

const defaultSettings: Settings = {
  dataPath: app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath(),
}

function getSettingsPath(): string {
  return path.join(defaultSettings.dataPath, 'settings.json')
}

export function loadSettings(): Settings {
  try {
    const filePath = getSettingsPath()
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return { ...defaultSettings, ...JSON.parse(raw) }
    }
  } catch {
    // fall through to defaults
  }
  return { ...defaultSettings }
}

export function saveSettings(s: Settings): void {
  const filePath = getSettingsPath()
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(s, null, 2), 'utf-8')
}
