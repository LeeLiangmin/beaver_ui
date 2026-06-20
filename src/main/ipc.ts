import { ipcMain, BrowserWindow } from 'electron'
import type { IpcResult } from '../shared/types'
import { loadSettings, saveSettings } from './services/settings'
import { searchFiles, cancelSearch, getDrives } from './services/file-search'
import { getGroups, addGroup, removeGroup, getItems, addItem, removeItem, incrementUseCount } from './services/fast-opener'
import { getProcesses, killProcess, getAutoStartEntries, removeAutoStart, getProcessPorts } from './services/process-manager'
import { getMonthData } from './services/calendar'
import { getServerTime, getTimezone } from './services/clock'
import { getProcessEnv, getSystemEnv, setUserEnv, deleteUserEnv, backupEnvToToml } from './services/env-manager'
import { shell } from 'electron'

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}

function err(error: string): IpcResult<never> {
  return { ok: false, error }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', () => {
    try {
      return ok(loadSettings())
    } catch (e: any) {
      return err(e.message)
    }
  })

  ipcMain.handle('settings:save', (_event, s) => {
    try {
      saveSettings(s)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })

  ipcMain.handle('file:search', (event, req) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) {
        searchFiles(req, win)
      }
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })

  ipcMain.handle('file:searchCancel', () => {
    cancelSearch()
    return ok(undefined)
  })

  ipcMain.handle('file:drives', () => {
    try {
      return ok(getDrives())
    } catch (e: any) {
      return err(e.message)
    }
  })

  ipcMain.handle('opener:groups', () => {
    try { return ok(getGroups()) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('opener:addGroup', (_e, name) => {
    try { return ok(addGroup(name)) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('opener:removeGroup', (_e, id) => {
    try { removeGroup(id); return ok(undefined) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('opener:items', () => {
    try { return ok(getItems()) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('opener:addItem', (_e, name, itemPath, groupId) => {
    try { return ok(addItem(name, itemPath, groupId)) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('opener:removeItem', (_e, id) => {
    try { removeItem(id); return ok(undefined) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('opener:useItem', (_e, id) => {
    try { incrementUseCount(id); return ok(undefined) } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('process:list', async () => {
    try { return ok(await getProcesses()) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('process:kill', async (_e, pid) => {
    try { await killProcess(pid); return ok(undefined) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('process:autostart', async () => {
    try { return ok(await getAutoStartEntries()) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('process:removeAutostart', async (_e, name, source) => {
    try { await removeAutoStart(name, source); return ok(undefined) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('process:ports', async () => {
    try { return ok(await getProcessPorts()) } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('calendar:month', (_e, year, month) => {
    try { return ok(getMonthData(year, month)) } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('clock:time', () => {
    try { return ok(getServerTime()) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('clock:timezone', () => {
    try { return ok(getTimezone()) } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('env:process', () => {
    try { return ok(getProcessEnv()) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('env:system', async () => {
    try { return ok(await getSystemEnv()) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('env:set', async (_e, name, value) => {
    try { await setUserEnv(name, value); return ok(undefined) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('env:delete', async (_e, name) => {
    try { await deleteUserEnv(name); return ok(undefined) } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('env:backup', async (_e, filePath) => {
    try { return ok(await backupEnvToToml(filePath)) } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('shell:openPath', (_e, filePath) => {
    try { shell.openPath(filePath); return ok(undefined) } catch (e: any) { return err(e.message) }
  })
}
