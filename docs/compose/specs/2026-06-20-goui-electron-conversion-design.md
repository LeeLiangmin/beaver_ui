# GoUI → Electron Conversion Design Spec

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/goui-electron-conversion.md)

## [S1] Problem

Convert the GoUI Wails v2 (Go + Vue 3) desktop application to a pure Electron app with React + Tailwind frontend. The original has 8 feature modules; this conversion covers 6 (excluding Lottery Trends and Packet Capture proxy).

## [S2] Solution Overview

A single-window Electron desktop app. The main process (Node.js/TypeScript) hosts all backend service logic and exposes an IPC bridge via `contextBridge`. The renderer is a React + Tailwind SPA built with Vite, communicating with the main process through typed IPC channels.

**Target modules**: File Search, Fast Opener, Process Manager, Chinese Calendar, Clock Timer, Environment Variables.

## [S3] Architecture

```
Electron Main Process (TypeScript)
  ├── Window Manager (BrowserWindow, 1200×800)
  ├── IPC Hub (ipcMain.handle / webContents.send)
  └── Services
       ├── file-search.ts     (fs streaming search)
       ├── fast-opener.ts     (bookmark JSON CRUD)
       ├── process-manager.ts (child_process + winreg)
       ├── calendar.ts        (lunar-javascript)
       ├── clock.ts           (Date, setInterval)
       ├── env-manager.ts     (process.env + winreg)
       └── settings.ts        (JSON config)
           ↕ contextBridge (preload.ts)
Renderer Process (React + Tailwind + Vite)
  ├── App.tsx (layout shell)
  ├── Sidebar.tsx (vertical nav, Ctrl+1~6 shortcuts)
  ├── Welcome.tsx (feature cards grid)
  └── 6 tab components
```

## [S4] IPC Bridge

All frontend-backend communication passes through `window.electronAPI`, exposed via `contextBridge.exposeInMainWorld`. Pattern:

- **Renderer → Main**: `ipcRenderer.invoke('channel', ...args)` → `ipcMain.handle('channel', handler)`
- **Main → Renderer**: `mainWindow.webContents.send('channel', data)` → `ipcRenderer.on('channel', callback)`
- Streaming (file search): main process sends `file:found` events per batch, renderer accumulates.

Auto-generated `wailsjs/go/` bindings are replaced by a manually maintained `preload.ts` with an `ElectronAPI` TypeScript interface shared between main and renderer.

## [S5] Module Specifications

### File Search
- Recursive directory traversal via `fs.readdir` with `withFileTypes`
- Streaming: emit `file:found` events in batches of 50, final `file:complete` event
- Drive list: use `child_process.exec('wmic logicaldisk get name')` on Windows
- File open: `shell.openPath()`

### Fast Opener
- Bookmark items stored as JSON at `%APPDATA%/GoUI-Electron/opener.json`
- Groups support, item fields: name, path, groupId, useCount
- Open file/location: `shell.openPath()`, `shell.showItemInFolder()`

### Process Manager
- List processes: `child_process.exec('tasklist /FO CSV /NH')` parsed
- Kill: `taskkill /PID <pid> /F`
- Auto-start detection: read `HKLM/HKCU\Software\Microsoft\Windows\CurrentVersion\Run` via `winreg`
- Port listing: `netstat -ano` parsed

### Chinese Calendar
- Use `lunar-javascript` npm package for lunar dates, solar terms, zodiac
- Today-in-history: fetch from `baike.baidu.com` API (same as original)
- Month grid view with Gregorian + lunar date per cell

### Clock Timer
- Server time: `Date.now()` from main process
- Countdown timer: pure renderer-side with `setInterval`
- Timezone display: `Intl.DateTimeFormat().resolvedOptions().timeZone`

### Environment Variables
- Read user + system env vars via `winreg` and `process.env`
- Edit/persist via registry writes
- TOML backup/restore: use `@iarna/toml` for parse/stringify

### Settings
- Persisted JSON at `%APPDATA%/GoUI-Electron/settings.json`
- Options: data path, app theme (future)

## [S6] Project Structure

```
electron_learning/
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main/
│   │   ├── index.ts
│   │   ├── ipc.ts
│   │   ├── preload.ts
│   │   └── services/
│   │       ├── file-search.ts
│   │       ├── fast-opener.ts
│   │       ├── process-manager.ts
│   │       ├── calendar.ts
│   │       ├── clock.ts
│   │       ├── env-manager.ts
│   │       └── settings.ts
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Welcome.tsx
│   │   │   ├── FileSearch.tsx
│   │   │   ├── FastOpener.tsx
│   │   │   ├── ProcessManager.tsx
│   │   │   ├── Calendar.tsx
│   │   │   ├── ClockTimer.tsx
│   │   │   └── EnvManager.tsx
│   │   └── styles/
│   │       └── index.css
│   └── shared/
│       └── types.ts            # Shared IPC channel types
├── resources/                   # App icon, assets
└── docs/
    └── compose/
        └── specs/
            └── 2026-06-20-goui-electron-conversion-design.md
```

## [S7] Window Configuration

- Size: 1200×800 (default), min 800×600
- Background: `#f5f5f5`
- Frame: standard Windows title bar
- Menu: minimal (File > Quit, or hidden)
- Keyboard shortcuts: `Ctrl+1` through `Ctrl+6` switch tabs (registered in renderer with `useEffect` + `keydown`)

## [S8] Dependencies

### Production
- `electron` — app framework
- `react`, `react-dom` — UI
- `tailwindcss`, `@tailwindcss/vite` — styling
- `lucide-react` — icons
- `lunar-javascript` — Chinese calendar
- `winreg` — Windows registry access
- `@iarna/toml` — TOML parsing for env backup

### Dev
- `typescript` — type checking
- `vite`, `@vitejs/plugin-react` — bundler
- `electron-builder` — packaging
- `concurrently`, `wait-on` — dev workflow

## [S9] Error Handling

- All IPC handlers wrapped in try/catch, return `{ ok: true, data } | { ok: false, error: string }`
- Frontend shows toast/alert on error responses
- No silent failures — every error surfaces to the UI

## [S10] Testing Strategy

- Unit tests for each service module (via `vitest`)
- Component tests for React components (via `vitest` + `@testing-library/react`)
- Manual verification of each module against original app behavior
