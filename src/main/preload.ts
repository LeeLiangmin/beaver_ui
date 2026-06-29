import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "../shared/types";

const api: ElectronAPI = {
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    save: (s) => ipcRenderer.invoke("settings:save", s),
  },
  fileSearch: {
    search: (req) => ipcRenderer.invoke("file:search", req),
    cancel: () => ipcRenderer.invoke("file:searchCancel"),
    getDrives: () => ipcRenderer.invoke("file:drives"),
    onFound: (cb) => {
      const listener = (_event: any, files: any) => cb(files);
      ipcRenderer.on("file:found", listener);
      return () => ipcRenderer.removeListener("file:found", listener);
    },
    onComplete: (cb) => {
      const listener = () => cb();
      ipcRenderer.on("file:complete", listener);
      return () => ipcRenderer.removeListener("file:complete", listener);
    },
  },
  opener: {
    getAll: () => ipcRenderer.invoke("opener:all"),
    addItem: (filePath, groupId) =>
      ipcRenderer.invoke("opener:addItem", filePath, groupId),
    removeItem: (id) => ipcRenderer.invoke("opener:removeItem", id),
    openItem: (id) => ipcRenderer.invoke("opener:openItem", id),
    moveItem: (itemId, groupId) =>
      ipcRenderer.invoke("opener:moveItem", itemId, groupId),
    updateSort: (ids) => ipcRenderer.invoke("opener:updateSort", ids),
    addGroup: (name, color) =>
      ipcRenderer.invoke("opener:addGroup", name, color),
    updateGroup: (group) => ipcRenderer.invoke("opener:updateGroup", group),
    removeGroup: (id) => ipcRenderer.invoke("opener:removeGroup", id),
    validatePath: (filePath) =>
      ipcRenderer.invoke("opener:validatePath", filePath),
  },
  processManager: {
    list: () => ipcRenderer.invoke("process:list"),
    cancelList: () => ipcRenderer.invoke("process:cancelList"),
    refresh: () => ipcRenderer.invoke("process:refresh"),
    kill: (pid) => ipcRenderer.invoke("process:kill", pid),
    restart: (pid, exePath) =>
      ipcRenderer.invoke("process:restart", pid, exePath),
    autostart: (exePath) => ipcRenderer.invoke("process:autostart", exePath),
    disableAutostart: (entryType, entryName) =>
      ipcRenderer.invoke("process:disableAutostart", entryType, entryName),
    onBatch: (cb) => {
      const listener = (_event: any, version: any, procs: any) =>
        cb(version, procs);
      ipcRenderer.on("process:batch", listener);
      return () => ipcRenderer.removeListener("process:batch", listener);
    },
    onComplete: (cb) => {
      const listener = (_event: any, version: any) => cb(version);
      ipcRenderer.on("process:complete", listener);
      return () => ipcRenderer.removeListener("process:complete", listener);
    },
    onError: (cb) => {
      const listener = (_event: any, version: any, errorMsg: any) =>
        cb(version, errorMsg);
      ipcRenderer.on("process:error", listener);
      return () => ipcRenderer.removeListener("process:error", listener);
    },
  },
  calendar: {
    getMonth: (year, month) =>
      ipcRenderer.invoke("calendar:month", year, month),
    getHistory: (month, day) =>
      ipcRenderer.invoke("calendar:history", month, day),
  },
  clock: {
    getTime: () => ipcRenderer.invoke("clock:time"),
    getTimezone: () => ipcRenderer.invoke("clock:timezone"),
  },
  env: {
    list: () => ipcRenderer.invoke("env:list"),
    setVar: (key, value) => ipcRenderer.invoke("env:set", key, value),
    deleteVar: (key) => ipcRenderer.invoke("env:delete", key),
    setBatch: (items) => ipcRenderer.invoke("env:setBatch", items),
    groups: () => ipcRenderer.invoke("env:groups"),
    createGroup: (name, color) =>
      ipcRenderer.invoke("env:createGroup", name, color),
    updateGroup: (group) => ipcRenderer.invoke("env:updateGroup", group),
    deleteGroup: (id) => ipcRenderer.invoke("env:deleteGroup", id),
    moveToGroup: (key, groupId) =>
      ipcRenderer.invoke("env:moveToGroup", key, groupId),
    removeFromGroup: (key, groupId) => ipcRenderer.invoke("env:removeFromGroup", key, groupId),
    restoreGroup: (groupId) => ipcRenderer.invoke("env:restoreGroup", groupId),
    restoreGroupItem: (groupId, key) =>
      ipcRenderer.invoke("env:restoreGroupItem", groupId, key),
    backupGroup: (groupId) => ipcRenderer.invoke("env:backupGroup", groupId),
    backupGroupItem: (groupId, key) =>
      ipcRenderer.invoke("env:backupGroupItem", groupId, key),
    getGroupEntries: (groupId) =>
      ipcRenderer.invoke("env:groupEntries", groupId),
  },
  shell: {
    openPath: (filePath) => ipcRenderer.invoke("shell:openPath", filePath),
    openLocation: (filePath) =>
      ipcRenderer.invoke("shell:openLocation", filePath),
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke("dialog:selectDirectory"),
    selectFile: () => ipcRenderer.invoke("dialog:selectFile"),
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
