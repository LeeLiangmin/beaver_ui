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

  ipcMain.handle('opener:all', () => {
    try {
      return ok(getAll())
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('opener:addItem', (_e, filePath, groupId) => {
    try {
      return ok(addItem(filePath, groupId))
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('opener:removeItem', (_e, id) => {
    try {
      removeItem(id)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('opener:openItem', (_e, id) => {
    try {
      openItem(id)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('opener:moveItem', (_e, itemId, groupId) => {
    try {
      moveItem(itemId, groupId)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('opener:updateSort', (_e, ids) => {
    try {
      updateSort(ids)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('opener:addGroup', (_e, name, color) => {
    try {
      return ok(addGroup(name, color))
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('opener:updateGroup', (_e, group) => {
    try {
      updateOpenerGroup(group)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('opener:removeGroup', (_e, id) => {
    try {
      removeGroup(id)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('opener:validatePath', (_e, filePath) => {
    try {
      return ok(validatePath(filePath))
    } catch (e: any) {
      return err(e.message)
    }
  })

  ipcMain.handle('process:list', async (_event) => {
    try {
      const win = BrowserWindow.fromWebContents(_event.sender)
      if (!win) return err('Window is unavailable')

      const version = createProcessStreamVersion()
      setImmediate(() => {
        getProcessesStreaming(win, version)
      })
      return ok(version)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('process:cancelList', () => {
    cancelProcessStreaming()
    return ok(undefined)
  })
  ipcMain.handle('process:refresh', async () => {
    try {
      return ok(await getProcesses())
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('process:kill', async (_e, pid) => {
    try {
      await killProcess(pid)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('process:restart', async (_e, pid, exePath) => {
    try {
      await restartProcess(pid, exePath)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('process:autostart', async (_e, exePath) => {
    try {
      return ok(await getAutoStartEntries(exePath))
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('process:disableAutostart', async (_e, entryType, entryName) => {
    try {
      await disableAutoStart(entryType, entryName)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })

  ipcMain.handle('calendar:month', (_e, year, month) => {
    try {
      return ok(getMonthData(year, month))
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('calendar:history', async (_e, month, day) => {
    try {
      return ok(await getHistoryEvents(month, day))
    } catch (e: any) {
      return err(e.message + '')
    }
  })

  ipcMain.handle('clock:time', () => {
    try {
      return ok(getServerTime())
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('clock:timezone', () => {
    try {
      return ok(getTimezone())
    } catch (e: any) {
      return err(e.message)
    }
  })

  ipcMain.handle('env:list', async () => {
    try {
      return ok(await getEnvVars())
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('env:set', async (_e, name, value) => {
    try {
      await setEnvVar(name, value)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('env:delete', async (_e, name) => {
    try {
      await deleteEnvVar(name)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('env:setBatch', async (_e, items) => {
    try {
      return ok(await setEnvVars(items))
    } catch (e: any) {
      return err(e.message)
    }
  })

  ipcMain.handle('env:groups', () => {
    try {
      return ok(getGroups())
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('env:createGroup', (_e, name, color) => {
    try {
      return ok(createGroup(name, color))
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('env:updateGroup', (_e, group) => {
    try {
      updateGroup(group)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('env:deleteGroup', (_e, id) => {
    try {
      deleteGroup(id)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('env:moveToGroup', (_e, key, groupId) => {
    try {
      moveToGroup(key, groupId)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('env:removeFromGroup', (_e, key, groupId) => {
    try {
      removeFromGroup(key, groupId)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('env:backupGroup', async (_e, groupId) => {
    try {
      return ok(await backupGroup(groupId))
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('env:backupGroupItem', async (_e, groupId, key) => {
    try {
      await backupGroupItem(groupId, key)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })

  ipcMain.handle('env:restoreGroup', async (_e, groupId) => {
    try {
      return ok(await restoreGroup(groupId))
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('env:restoreGroupItem', async (_e, groupId, key) => {
    try {
      await restoreGroupItem(groupId, key)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })
  ipcMain.handle('env:groupEntries', (_e, groupId) => {
    try {
      return ok(getGroupEntries(groupId))
    } catch (e: any) {
      return err(e.message)
    }
  })

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
    } catch (e: any) {
      return err(e.message)
    }
  })

  ipcMain.handle('shell:openLocation', (_e, filePath) => {
    try {
      shell.showItemInFolder(filePath)
      return ok(undefined)
    } catch (e: any) {
      return err(e.message)
    }
  })

  ipcMain.handle('dialog:selectDirectory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: '选择目录',
      })
      return ok(result.canceled ? '' : result.filePaths[0] || '')
    } catch (e: any) {
      return err(e.message)
    }
  })

  ipcMain.handle('dialog:selectFile', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        title: '选择文件',
      })
      return ok(result.canceled ? '' : result.filePaths[0] || '')
    } catch (e: any) {
      return err(e.message)
    }
  })

  // ── Cleaner ──────────────────────────────────────────────────
  ipcMain.handle('cleaner:getRules', () => {
    try { return ok(RULES) } catch (e: any) { return err(e.message) }
  })

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

  ipcMain.handle('cleaner:clean', async (_e, ruleIds, permanent) => {
    try {
      return ok(await cleanupItems(ruleIds, permanent))
    } catch (e: any) { return err(e.message) }
  })

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

  ipcMain.handle('cleaner:trashFile', async (_e, filePath) => {
    try {
      shell.trashItem(filePath)
      return ok(undefined)
    } catch (e: any) { return err(e.message) }
  })

  // ── AI ───────────────────────────────────────────────────────
  ipcMain.handle('ai:cleanupAdvice', async (_e, stats) => {
    try { return ok(await getCleanupAdvice(stats)) } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('ai:analyzeLargeFiles', async (_e, files) => {
    try { return ok(await analyzeLargeFiles(files)) } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('ai:parseIntent', async (_e, text) => {
    try { return ok(await parseIntent(text)) } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('ai:chat', async (_e, history, scanResults) => {
    try { return ok(await cleanupChat(history, scanResults)) } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('ai:classifyLargeFiles', async (_e, files) => {
    try { return ok(await classifyLargeFiles(files)) } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('ai:testConnection', async (_e, baseUrl, apiKey, model, proxyUrl, ignoreCert) => {
    try { return ok(await testConnection(baseUrl, apiKey, model, proxyUrl, ignoreCert)) } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('ai:generateInsights', async (_e, stats) => {
    try { return ok(await generateInsights(stats)) } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('ai:planScan', async () => {
    try {
      clearNarratedRules()
      return ok(await planScan())
    } catch (e: any) { return err(e.message) }
  })

  ipcMain.handle('ai:narrateScanProgress', async (_e, results, alreadyNarrated) => {
    try { return ok(await narrateScanProgress(results, alreadyNarrated)) } catch (e: any) { return err(e.message) }
  })
}
