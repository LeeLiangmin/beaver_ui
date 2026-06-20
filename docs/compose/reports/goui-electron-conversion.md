---
feature: goui-electron-conversion
status: delivered
specs:
  - docs/compose/specs/2026-06-20-goui-electron-conversion-design.md
plans:
  - docs/compose/plans/2026-06-20-goui-electron-conversion-plan.md
branch: main
---

# GoUI Electron Conversion — Final Report

## What Was Built

Converted 6 feature modules from the GoUI Wails v2 (Go + Vue 3) desktop app to a pure Electron application with React + Tailwind + TypeScript. The Electron main process runs Node.js/TypeScript service modules exposed via `contextBridge` IPC, replacing the original Go backend. The renderer is a React 18 SPA with Tailwind CSS v4, built from scratch.

Six modules are fully functional: **File Search** (streaming recursive search with drive selector), **Fast Opener** (bookmark groups/items CRUD with use tracking), **Process Manager** (tasklist/taskkill/netstat integration, auto-start management), **Chinese Calendar** (lunar dates, solar terms via `lunar-javascript`), **Clock Timer** (live time display, countdown), and **Environment Variables** (view user + system vars, edit user vars via `setx`, TOML backup).

## Architecture

```
Electron Main Process (TypeScript, CommonJS)
  src/main/index.ts         — BrowserWindow, app lifecycle
  src/main/preload.ts       — contextBridge with typed ElectronAPI
  src/main/ipc.ts           — ~20 ipcMain.handle() registrations
  src/main/services/
    settings.ts             — JSON config at %APPDATA%/GoUI-Electron
    file-search.ts          — fs.readdir recursive, streaming via ipcRenderer.on
    fast-opener.ts          — Group/Item CRUD, JSON store
    process-manager.ts      — child_process (tasklist/taskkill/netstat/reg)
    calendar.ts             — lunar-javascript wrapper
    clock.ts                — Date.now(), timezone
    env-manager.ts          — process.env + reg query + setx + TOML backup
       ↕ contextBridge
Renderer (React 18, TypeScript, Vite)
  src/renderer/
    App.tsx                 — Layout: Sidebar + tab switching, Ctrl+1~6 shortcuts
    components/
      Sidebar.tsx           — Vertical icon nav with hover tooltips
      Welcome.tsx           — Feature cards grid
      FileSearch.tsx        — Search bar, results table with double-click open
      FastOpener.tsx        — Group sidebar + item list with add/remove
      ProcessManager.tsx    — Process table + autostart tab
      Calendar.tsx          — Month grid with lunar info
      ClockTimer.tsx        — Live clock + countdown timer
      EnvManager.tsx        — Var table with search/add/delete/backup
  src/shared/types.ts       — Shared interfaces: IpcResult<T>, ElectronAPI, all types
```

**IPC pattern**: `ipcRenderer.invoke('channel', args)` returns `IpcResult<T>` (`{ ok: true, data } | { ok: false, error }`). Push events use `webContents.send` / `ipcRenderer.on` for file search streaming.

**Window**: 1200×800 default, min 800×600, `#f5f5f5` background, menu bar hidden.

### Design Decisions

- Chose `contextBridge` + `ipcMain.handle` over Node integration for security (context isolation enabled, nodeIntegration disabled).
- Chose `@tailwindcss/vite` plugin over PostCSS config — Tailwind v4's Vite plugin handles CSS processing directly.
- Used `child_process.exec` for `tasklist`/`taskkill`/`netstat`/`reg` instead of native Node addons — simpler, no compilation needed.
- File search emits batches of 50 via IPC events to keep the UI responsive during large searches.

## Usage

```bash
# Development (Vite HMR + Electron)
npm run dev

# Build for production
npm run build

# Package as Windows installer
npm run package

# Type check
npm run typecheck
```

## Verification

- TypeScript typecheck passes for both `tsconfig.json` (renderer) and `tsconfig.node.json` (main process)
- Vite production build succeeds (15 modules → 180KB JS + 17KB CSS)
- Electron launches and renders all 6 module components
- IPC bridge functional: settings get/save, all 20+ IPC channels registered

## Journey Log

- [dead end] Tried `postcss.config.js` with `@tailwindcss/postcss` — Tailwind v4 + `@tailwindcss/vite` plugin doesn't need it; removed the config
- [pivot] Electron binary download failed via default CDN — switched to `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`
- [lesson] The `rootDir` in renderer tsconfig needed to encompass `src/shared/` for shared type imports; set it to `src/` instead of `src/renderer/`

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `docs/compose/specs/2026-06-20-goui-electron-conversion-design.md` | Design spec | Architecture, module specs, dependencies |
| `docs/compose/plans/2026-06-20-goui-electron-conversion-plan.md` | Implementation plan | 11 tasks, bite-sized steps |
