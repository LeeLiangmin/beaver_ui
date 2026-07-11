import { ipcMain, BrowserWindow } from 'electron'
import type { IpcResult } from '../shared/types'
import { loadSettings, saveSettings } from './services/settings'
import { searchFiles, cancelSearch, getDrives } from './services/file-search'
import {
  getAll,
  addItem,
  removeItem,
  openItem,
  moveItem,
  updateSort,
  addGroup,
  updateGroup as updateOpenerGroup,
  removeGroup,
  validatePath,
} from './services/fast-opener'
import {
  getProcesses,
  createProcessStreamVersion,
  cancelProcessStreaming,
  getProcessesStreaming,
  killProcess,
  restartProcess,
  getAutoStartEntries,
  disableAutoStart,
} from './services/process-manager'
import { getMonthData, getHistoryEvents } from './services/calendar'
import { getServerTime, getTimezone } from './services/clock'
import {
  getEnvVars,
  setEnvVar,
  deleteEnvVar,
  setEnvVars,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  moveToGroup,
  removeFromGroup,
  backupGroup,
  backupGroupItem,
  restoreGroup,
  restoreGroupItem,
  getGroupEntries,
} from './services/env-manager'
import { shell, dialog } from 'electron'
import { allowFile } from './protocol'
import { execFile } from 'child_process'
import fs from 'fs'
import { RULES, scanCleanup, cancelScan, createScanVersion, cleanupItems, scanLargeFiles, cancelLargeFileScan, createLargeFileScanVersion } from './services/disk-cleaner'
import { getCleanupAdvice, analyzeLargeFiles, parseIntent, cleanupChat, classifyLargeFiles, testConnection, generateInsights, planScan, narrateScanProgress, clearNarratedRules } from './services/ai-advisor'

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}

function err(error: string): IpcResult<never> {
  return { ok: false, error }
}

function wrapHandler<T>(fn: (...args: any[]) => T) {
  return async (_event: Electron.IpcMainInvokeEvent, ...args: any[]): Promise<IpcResult<Awaited<T>>> => {
    try {
      const result = await fn(...args)
      return ok(result)
    } catch (e: any) {
      return err(e.message ?? String(e))
    }
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('file:allow', wrapHandler((absPath: string) => {
    allowFile(absPath)
  }))

  ipcMain.handle('settings:get', wrapHandler(() => loadSettings()))
  ipcMain.handle('settings:save', wrapHandler((s: any) => { saveSettings(s) }))

  ipcMain.handle('file:search', (event, req) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) {
        searchFiles(req, win)
      }
      return ok(undefined)
    } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('file:searchCancel', () => {
    cancelSearch()
    return ok(undefined)
  })

  ipcMain.handle('file:drives', wrapHandler(() => getDrives()))
  ipcMain.handle('opener:all', wrapHandler(() => getAll()))
  ipcMain.handle('opener:addItem', wrapHandler((filePath: string, groupId: string) => addItem(filePath, groupId)))
  ipcMain.handle('opener:removeItem', wrapHandler((id: string) => { removeItem(id) }))
  ipcMain.handle('opener:openItem', wrapHandler((id: string) => { openItem(id) }))
  ipcMain.handle('opener:moveItem', wrapHandler((itemId: string, groupId: string) => { moveItem(itemId, groupId) }))
  ipcMain.handle('opener:updateSort', wrapHandler((ids: string[]) => { updateSort(ids) }))
  ipcMain.handle('opener:addGroup', wrapHandler((name: string, color: string) => addGroup(name, color)))
  ipcMain.handle('opener:updateGroup', wrapHandler((group: any) => { updateOpenerGroup(group) }))
  ipcMain.handle('opener:removeGroup', wrapHandler((id: string) => { removeGroup(id) }))
  ipcMain.handle('opener:validatePath', wrapHandler((filePath: string) => validatePath(filePath)))

  ipcMain.handle('process:list', async (_event) => {
    try {
      const win = BrowserWindow.fromWebContents(_event.sender)
      if (!win) return err('Window is unavailable')

      const version = createProcessStreamVersion()
      setImmediate(() => {
        getProcessesStreaming(win, version)
      })
      return ok(version)
    } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('process:cancelList', () => {
    cancelProcessStreaming()
    return ok(undefined)
  })

  ipcMain.handle('process:refresh', wrapHandler(() => getProcesses()))
  ipcMain.handle('process:kill', wrapHandler((pid: number) => killProcess(pid)))
  ipcMain.handle('process:restart', wrapHandler((pid: number, exePath: string) => restartProcess(pid, exePath)))
  ipcMain.handle('process:autostart', wrapHandler((exePath: string) => getAutoStartEntries(exePath)))
  ipcMain.handle('process:disableAutostart', wrapHandler((entryType: string, entryName: string) => disableAutoStart(entryType, entryName)))

  ipcMain.handle('calendar:month', wrapHandler((year: number, month: number) => getMonthData(year, month)))
  ipcMain.handle('calendar:history', wrapHandler((month: number, day: number) => getHistoryEvents(month, day)))

  ipcMain.handle('clock:time', wrapHandler(() => getServerTime()))
  ipcMain.handle('clock:timezone', wrapHandler(() => getTimezone()))

  ipcMain.handle('env:list', wrapHandler(() => getEnvVars()))
  ipcMain.handle('env:set', wrapHandler((name: string, value: string) => setEnvVar(name, value)))
  ipcMain.handle('env:delete', wrapHandler((name: string) => deleteEnvVar(name)))
  ipcMain.handle('env:setBatch', wrapHandler((items: any) => setEnvVars(items)))
  ipcMain.handle('env:groups', wrapHandler(() => getGroups()))
  ipcMain.handle('env:createGroup', wrapHandler((name: string, color: string) => createGroup(name, color)))
  ipcMain.handle('env:updateGroup', wrapHandler((group: any) => { updateGroup(group) }))
  ipcMain.handle('env:deleteGroup', wrapHandler((id: string) => { deleteGroup(id) }))
  ipcMain.handle('env:moveToGroup', wrapHandler((key: string, groupId: string) => { moveToGroup(key, groupId) }))
  ipcMain.handle('env:removeFromGroup', wrapHandler((key: string, groupId: string) => { removeFromGroup(key, groupId) }))
  ipcMain.handle('env:backupGroup', wrapHandler((groupId: string) => backupGroup(groupId)))
  ipcMain.handle('env:backupGroupItem', wrapHandler((groupId: string, key: string) => backupGroupItem(groupId, key)))
  ipcMain.handle('env:restoreGroup', wrapHandler((groupId: string) => restoreGroup(groupId)))
  ipcMain.handle('env:restoreGroupItem', wrapHandler((groupId: string, key: string) => restoreGroupItem(groupId, key)))
  ipcMain.handle('env:groupEntries', wrapHandler((groupId: string) => getGroupEntries(groupId)))

  ipcMain.handle('shell:openPath', (_e, filePath) => {
    try {
      const isDir = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
      if (!isDir) {
        const settings = loadSettings()
        const editor = settings.editorCommand
        if (editor) {
          execFile(editor, [filePath], (err) => {
            if (err) shell.openPath(filePath)
          })
        } else {
          shell.openPath(filePath)
        }
      } else {
        shell.openPath(filePath)
      }
      return ok(undefined)
    } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('shell:openLocation', (_e, filePath) => {
    try {
      shell.showItemInFolder(filePath)
      return ok(undefined)
    } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('dialog:selectDirectory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: '选择目录',
      })
      return ok(result.canceled ? '' : result.filePaths[0] || '')
    } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('dialog:selectFile', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        title: '选择文件',
      })
      return ok(result.canceled ? '' : result.filePaths[0] || '')
    } catch (e: any) { return err(e.message) }
  })

  // ── Cleaner ──────────────────────────────────────────────────
  ipcMain.handle('cleaner:getRules', wrapHandler(() => RULES))

  ipcMain.handle('cleaner:scan', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return err('Window is unavailable')
      const version = createScanVersion()
      setImmediate(() => { scanCleanup(win, version) })
      return ok(undefined)
    } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('cleaner:cancelScan', () => {
    cancelScan()
    return ok(undefined)
  })

  ipcMain.handle('cleaner:clean', wrapHandler((ruleIds: string[], permanent: boolean) => cleanupItems(ruleIds, permanent)))

  ipcMain.handle('cleaner:scanLargeFiles', async (event, req) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return err('Window is unavailable')
      const version = createLargeFileScanVersion()
      setImmediate(() => { scanLargeFiles(req, win, version) })
      return ok(undefined)
    } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('cleaner:cancelLargeFileScan', () => {
    cancelLargeFileScan()
    return ok(undefined)
  })

  ipcMain.handle('cleaner:trashFile', wrapHandler((filePath: string) => shell.trashItem(filePath)))

  // ── AI ───────────────────────────────────────────────────────
  ipcMain.handle('ai:cleanupAdvice', wrapHandler((stats: any) => getCleanupAdvice(stats)))
  ipcMain.handle('ai:analyzeLargeFiles', wrapHandler((files: any) => analyzeLargeFiles(files)))
  ipcMain.handle('ai:parseIntent', wrapHandler((text: string) => parseIntent(text)))
  ipcMain.handle('ai:chat', wrapHandler((history: any, scanResults: any) => cleanupChat(history, scanResults)))
  ipcMain.handle('ai:classifyLargeFiles', wrapHandler((files: any) => classifyLargeFiles(files)))
  ipcMain.handle('ai:testConnection', wrapHandler((baseUrl: string, apiKey: string, model: string, proxyUrl?: string, ignoreCert?: boolean) => testConnection(baseUrl, apiKey, model, proxyUrl, ignoreCert)))
  ipcMain.handle('ai:generateInsights', wrapHandler((stats: any) => generateInsights(stats)))
  ipcMain.handle('ai:planScan', async () => {
    try {
      clearNarratedRules()
      return ok(await planScan())
    } catch (e: any) { return err(e.message) }
  })
  ipcMain.handle('ai:narrateScanProgress', wrapHandler((results: any, alreadyNarrated: string[]) => narrateScanProgress(results, alreadyNarrated)))
}
