export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface Settings {
  dataPath: string;
}

export interface SearchRequest {
  keyword: string;
  searchPath: string;
  fileType?: string;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  modTime: number;
}

export interface OpenerGroup {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: number;
}

export interface OpenerItem {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  groupId: string;
  createdAt: number;
  lastUsed: number;
  useCount: number;
  sortOrder: number;
}

export interface OpenerData {
  groups: OpenerGroup[];
  items: OpenerItem[];
}

export interface ProcessInfo {
  pid: number;
  name: string;
  exePath: string;
  cpuPercent: number;
  memoryMB: number;
  memoryPercent: number;
  status: string;
  ports: number[];
}

export interface AutoStartEntry {
  type: string;
  name: string;
  path: string;
}

export interface CalendarDay {
  year: number;
  month: number;
  day: number;
  lunarYear: string;
  lunarMonth: string;
  lunarDay: string;
  festival: string;
  solarTerm: string;
  isToday: boolean;
}

export interface HistoryEvent {
  year: number;
  title: string;
  type: string;
  desc: string;
}

export interface EnvVar {
  key: string;
  value: string;
  groupId: string;
}

export interface EnvGroup {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: number;
}

export interface EnvBackupMeta {
  fileName: string;
  filePath: string;
  modTime: number;
  size: number;
  itemCount: number;
}

export interface RestoreEnvRequest {
  filePath: string;
  keys: string[];
}

export interface RestoreEnvResult {
  restored: number;
  skipped: number;
}

export interface ElectronAPI {
  settings: {
    get: () => Promise<IpcResult<Settings>>;
    save: (s: Settings) => Promise<IpcResult<void>>;
  };
  fileSearch: {
    search: (req: SearchRequest) => Promise<IpcResult<void>>;
    cancel: () => Promise<IpcResult<void>>;
    getDrives: () => Promise<IpcResult<string[]>>;
    onFound: (cb: (files: FileInfo[]) => void) => () => void;
    onComplete: (cb: () => void) => () => void;
  };
  opener: {
    getAll: () => Promise<IpcResult<OpenerData>>;
    addItem: (
      filePath: string,
      groupId: string,
    ) => Promise<IpcResult<OpenerItem>>;
    removeItem: (id: string) => Promise<IpcResult<void>>;
    openItem: (id: string) => Promise<IpcResult<void>>;
    moveItem: (itemId: string, groupId: string) => Promise<IpcResult<void>>;
    updateSort: (ids: string[]) => Promise<IpcResult<void>>;
    addGroup: (name: string, color: string) => Promise<IpcResult<OpenerGroup>>;
    updateGroup: (group: OpenerGroup) => Promise<IpcResult<void>>;
    removeGroup: (id: string) => Promise<IpcResult<void>>;
    validatePath: (filePath: string) => Promise<IpcResult<boolean>>;
  };
  processManager: {
    list: () => Promise<IpcResult<number>>;
    cancelList: () => Promise<IpcResult<void>>;
    refresh: () => Promise<IpcResult<ProcessInfo[]>>;
    kill: (pid: number) => Promise<IpcResult<void>>;
    restart: (pid: number, exePath: string) => Promise<IpcResult<void>>;
    autostart: (exePath: string) => Promise<IpcResult<AutoStartEntry[]>>;
    disableAutostart: (
      entryType: string,
      entryName: string,
    ) => Promise<IpcResult<void>>;
    onBatch: (cb: (version: number, procs: ProcessInfo[]) => void) => () => void;
    onComplete: (cb: (version: number) => void) => () => void;
    onError: (cb: (version: number, errorMsg: string) => void) => () => void;
  };
  calendar: {
    getMonth: (
      year: number,
      month: number,
    ) => Promise<IpcResult<CalendarDay[]>>;
    getHistory: (
      month: number,
      day: number,
    ) => Promise<IpcResult<HistoryEvent[]>>;
  };
  clock: {
    getTime: () => Promise<IpcResult<number>>;
    getTimezone: () => Promise<IpcResult<string>>;
  };
  env: {
    list: () => Promise<IpcResult<EnvVar[]>>;
    setVar: (key: string, value: string) => Promise<IpcResult<void>>;
    deleteVar: (key: string) => Promise<IpcResult<void>>;
    setBatch: (
      items: EnvVar[],
    ) => Promise<IpcResult<{ success: number; failed: number }>>;
    groups: () => Promise<IpcResult<EnvGroup[]>>;
    createGroup: (name: string, color: string) => Promise<IpcResult<EnvGroup>>;
    updateGroup: (group: EnvGroup) => Promise<IpcResult<void>>;
    deleteGroup: (id: string) => Promise<IpcResult<void>>;
    moveToGroup: (key: string, groupId: string) => Promise<IpcResult<void>>;
    removeFromGroup: (key: string, groupId: string) => Promise<IpcResult<void>>;
    backupGroup: (groupId: string) => Promise<IpcResult<{ backedUp: number }>>;
    backupGroupItem: (groupId: string, key: string) => Promise<IpcResult<void>>;
    restoreGroup: (groupId: string) => Promise<IpcResult<{ restored: number }>>;
    restoreGroupItem: (
      groupId: string,
      key: string,
    ) => Promise<IpcResult<void>>;
    getGroupEntries: (groupId: string) => Promise<IpcResult<EnvVar[]>>;
  };
  shell: {
    openPath: (path: string) => Promise<IpcResult<void>>;
    openLocation: (path: string) => Promise<IpcResult<void>>;
  };
  dialog: {
    selectDirectory: () => Promise<IpcResult<string>>;
    selectFile: () => Promise<IpcResult<string>>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
