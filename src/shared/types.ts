export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface Settings {
  dataPath: string
}

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

export interface OpenerGroup {
  id: string
  name: string
}

export interface OpenerItem {
  id: string
  name: string
  path: string
  groupId: string
  useCount: number
}

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

export interface CalendarDay {
  year: number
  month: number
  day: number
  lunarYear: string
  lunarMonth: string
  lunarDay: string
  festival: string
  solarTerm: string
  isToday: boolean
}

export interface EnvEntry {
  name: string
  value: string
  scope: 'user' | 'system'
}

export interface ElectronAPI {
  settings: {
    get: () => Promise<IpcResult<Settings>>
    save: (s: Settings) => Promise<IpcResult<void>>
  }
  fileSearch: {
    search: (req: SearchRequest) => Promise<IpcResult<void>>
    cancel: () => Promise<IpcResult<void>>
    getDrives: () => Promise<IpcResult<string[]>>
    onFound: (cb: (files: FileInfo[]) => void) => () => void
    onComplete: (cb: () => void) => () => void
  }
  opener: {
    getGroups: () => Promise<IpcResult<OpenerGroup[]>>
    addGroup: (name: string) => Promise<IpcResult<OpenerGroup>>
    removeGroup: (id: string) => Promise<IpcResult<void>>
    getItems: () => Promise<IpcResult<OpenerItem[]>>
    addItem: (name: string, path: string, groupId: string) => Promise<IpcResult<OpenerItem>>
    removeItem: (id: string) => Promise<IpcResult<void>>
    useItem: (id: string) => Promise<IpcResult<void>>
  }
  processManager: {
    list: () => Promise<IpcResult<ProcessInfo[]>>
    kill: (pid: number) => Promise<IpcResult<void>>
    autostart: () => Promise<IpcResult<AutoStartEntry[]>>
    removeAutostart: (name: string, source: string) => Promise<IpcResult<void>>
    ports: () => Promise<IpcResult<{ pid: number; port: number }[]>>
  }
  calendar: {
    getMonth: (year: number, month: number) => Promise<IpcResult<CalendarDay[]>>
  }
  clock: {
    getTime: () => Promise<IpcResult<number>>
    getTimezone: () => Promise<IpcResult<string>>
  }
  env: {
    getProcessEnv: () => Promise<IpcResult<EnvEntry[]>>
    getSystemEnv: () => Promise<IpcResult<EnvEntry[]>>
    setVar: (name: string, value: string) => Promise<IpcResult<void>>
    deleteVar: (name: string) => Promise<IpcResult<void>>
    backup: (filePath: string) => Promise<IpcResult<string>>
  }
  shell: {
    openPath: (path: string) => Promise<IpcResult<void>>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
