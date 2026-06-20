import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types'

const api: ElectronAPI = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (s) => ipcRenderer.invoke('settings:save', s),
  },
  fileSearch: {
    search: (req) => ipcRenderer.invoke('file:search', req),
    cancel: () => ipcRenderer.invoke('file:searchCancel'),
    getDrives: () => ipcRenderer.invoke('file:drives'),
    onFound: (cb) => {
      const listener = (_event: any, files: any) => cb(files)
      ipcRenderer.on('file:found', listener)
      return () => ipcRenderer.removeListener('file:found', listener)
    },
    onComplete: (cb) => {
      const listener = () => cb()
      ipcRenderer.on('file:complete', listener)
      return () => ipcRenderer.removeListener('file:complete', listener)
    },
  },
  opener: {
    getGroups: () => ipcRenderer.invoke('opener:groups'),
    addGroup: (name) => ipcRenderer.invoke('opener:addGroup', name),
    removeGroup: (id) => ipcRenderer.invoke('opener:removeGroup', id),
    getItems: () => ipcRenderer.invoke('opener:items'),
    addItem: (name, itemPath, groupId) => ipcRenderer.invoke('opener:addItem', name, itemPath, groupId),
    removeItem: (id) => ipcRenderer.invoke('opener:removeItem', id),
    useItem: (id) => ipcRenderer.invoke('opener:useItem', id),
  },
  processManager: {
    list: () => ipcRenderer.invoke('process:list'),
    kill: (pid) => ipcRenderer.invoke('process:kill', pid),
    autostart: () => ipcRenderer.invoke('process:autostart'),
    removeAutostart: (name, source) => ipcRenderer.invoke('process:removeAutostart', name, source),
    ports: () => ipcRenderer.invoke('process:ports'),
  },
  calendar: {
    getMonth: (year, month) => ipcRenderer.invoke('calendar:month', year, month),
  },
  clock: {
    getTime: () => ipcRenderer.invoke('clock:time'),
    getTimezone: () => ipcRenderer.invoke('clock:timezone'),
  },
  env: {
    getProcessEnv: () => ipcRenderer.invoke('env:process'),
    getSystemEnv: () => ipcRenderer.invoke('env:system'),
    setVar: (name, value) => ipcRenderer.invoke('env:set', name, value),
    deleteVar: (name) => ipcRenderer.invoke('env:delete', name),
    backup: (filePath) => ipcRenderer.invoke('env:backup', filePath),
  },
  shell: {
    openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
