# GoUI → Electron Conversion Implementation Plan

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/goui-electron-conversion.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert 6 GoUI feature modules (File Search, Fast Opener, Process Manager, Calendar, Clock Timer, Env Vars) from Wails/Go+Vue3 to a pure Electron app with React+Tailwind+Node.js.

**Architecture:** Single-window Electron app. Main process runs Node.js services exposed via `contextBridge` IPC. Renderer is a React+Tailwind+Vite SPA. Each module has a service file in `src/main/services/` and a component in `src/renderer/components/`.

**Tech Stack:** Electron, React 18, TypeScript, Vite, Tailwind CSS v4, lucide-react, winreg, lunar-javascript, electron-builder

---

### Task 1: Project Scaffolding

**Covers:** [S6, S8]

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `electron-builder.yml`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

Create `package.json`:
```json
{
  "name": "goui-electron",
  "version": "1.0.0",
  "description": "GoUI - Daily Work Assistant (Electron)",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "vite build && tsc -p tsconfig.node.json",
    "build:renderer": "vite build",
    "build:main": "tsc -p tsconfig.node.json",
    "package": "npm run build && electron-builder",
    "typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json"
  },
  "dependencies": {
    "electron": "^35.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.575.0",
    "lunar-javascript": "^1.6.14",
    "winreg": "^1.2.5",
    "@iarna/toml": "^2.2.5"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/winreg": "^1.2.36",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "electron-builder": "^25.0.0",
    "concurrently": "^9.0.0",
    "wait-on": "^8.0.0"
  }
}
```

- [ ] **Step 2: Run npm install**

Run: `npm install`
Expected: all packages install without errors.

- [ ] **Step 3: Create TypeScript configs**

Create `tsconfig.json` (renderer):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist/renderer",
    "rootDir": "src/renderer",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/renderer", "src/shared"]
}
```

Create `tsconfig.node.json` (main process):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist/main",
    "rootDir": "src/main",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/main", "src/shared"]
}
```

- [ ] **Step 4: Create Vite config**

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
  },
})
```

- [ ] **Step 5: Create Tailwind config**

Create `postcss.config.js`:
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

- [ ] **Step 6: Create electron-builder.yml**

Create `electron-builder.yml`:
```yaml
appId: com.goui.electron
productName: GoUI
directories:
  output: release
  buildResources: resources
files:
  - dist/**/*
  - package.json
win:
  target: nsis
  icon: resources/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

- [ ] **Step 7: Create .gitignore**

Create `.gitignore`:
```
node_modules/
dist/
release/
.env
*.exe
```

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts postcss.config.js electron-builder.yml .gitignore
git commit -m "chore: scaffold Electron + React + Vite + Tailwind project"
```

---

### Task 2: Electron Main Process Shell

**Covers:** [S7, S3]

**Files:**
- Create: `src/main/index.ts`
- Create: `src/main/preload.ts`

- [ ] **Step 1: Create main process entry**

Create `src/main/index.ts`:
```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
```

- [ ] **Step 2: Create preload script**

Create `src/main/preload.ts`:
```typescript
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {})
```

- [ ] **Step 3: Create shared types placeholder**

Create `src/shared/types.ts`:
```typescript
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }
```

- [ ] **Step 4: Create renderer entry point**

Create `src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GoUI</title>
</head>
<body class="bg-[#f5f5f5] text-gray-900">
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

Create `src/renderer/main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

Create `src/renderer/styles/index.css`:
```css
@import "tailwindcss";
```

Create `src/renderer/App.tsx`:
```typescript
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Welcome from './components/Welcome'
import FileSearch from './components/FileSearch'
import FastOpener from './components/FastOpener'
import ProcessManager from './components/ProcessManager'
import Calendar from './components/Calendar'
import ClockTimer from './components/ClockTimer'
import EnvManager from './components/EnvManager'

type TabId = 'welcome' | 'filesearch' | 'fastopener' | 'process' | 'calendar' | 'clock' | 'env'

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'filesearch', label: '文件搜索', icon: 'Search' },
  { id: 'fastopener', label: '快速打开', icon: 'Zap' },
  { id: 'process', label: '进程管理', icon: 'Cpu' },
  { id: 'calendar', label: '万年历', icon: 'Calendar' },
  { id: 'clock', label: '时钟计时', icon: 'Clock' },
  { id: 'env', label: '环境变量', icon: 'SlidersHorizontal' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('welcome')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        const idx = parseInt(e.key)
        if (idx >= 1 && idx <= 6) {
          e.preventDefault()
          const realTabs = tabs.map(t => t.id)
          setActiveTab(realTabs[idx - 1])
        }
        if (e.key === '0' || e.key === 'Escape') {
          e.preventDefault()
          setActiveTab('welcome')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar tabs={tabs} activeTab={activeTab} onSelectTab={setActiveTab} />
      <main className="flex-1 overflow-auto p-6">
        {activeTab === 'welcome' && <Welcome tabs={tabs} onSelectTab={setActiveTab} />}
        {activeTab === 'filesearch' && <FileSearch />}
        {activeTab === 'fastopener' && <FastOpener />}
        {activeTab === 'process' && <ProcessManager />}
        {activeTab === 'calendar' && <Calendar />}
        {activeTab === 'clock' && <ClockTimer />}
        {activeTab === 'env' && <EnvManager />}
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Create Sidebar component**

Create `src/renderer/components/Sidebar.tsx`:
```typescript
import { Search, Zap, Cpu, Calendar, Clock, SlidersHorizontal, Home } from 'lucide-react'

type TabId = string

interface Tab {
  id: TabId
  label: string
  icon: string
}

interface SidebarProps {
  tabs: Tab[]
  activeTab: TabId
  onSelectTab: (id: TabId) => void
}

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Search, Zap, Cpu, Calendar, Clock, SlidersHorizontal,
}

export default function Sidebar({ tabs, activeTab, onSelectTab }: SidebarProps) {
  return (
    <nav className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-1 shrink-0">
      <button
        onClick={() => onSelectTab('welcome')}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
          activeTab === 'welcome'
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}
        title="首页"
      >
        <Home size={20} />
      </button>
      <div className="w-8 h-px bg-gray-200 my-2" />
      {tabs.map((tab) => {
        const Icon = iconMap[tab.icon]
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors relative group ${
              isActive
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title={tab.label}
          >
            {Icon && <Icon size={20} />}
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 6: Create Welcome component**

Create `src/renderer/components/Welcome.tsx`:
```typescript
import { Search, Zap, Cpu, Calendar, Clock, SlidersHorizontal } from 'lucide-react'

interface WelcomeProps {
  tabs: { id: string; label: string; icon: string; description?: string }[]
  onSelectTab: (id: string) => void
}

const descriptions: Record<string, string> = {
  filesearch: '实时递归文件搜索，支持磁盘快速选择',
  fastopener: '收藏常用文件和目录，一键快速打开',
  process: '查看和管理 Windows 进程，支持结束与重启',
  calendar: '中国传统万年历，节气与农历信息',
  clock: '服务器时间显示与倒计时功能',
  env: '查看和编辑 Windows 环境变量',
}

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Search, Zap, Cpu, Calendar, Clock, SlidersHorizontal,
}

export default function Welcome({ tabs, onSelectTab }: WelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">GoUI</h1>
      <p className="text-gray-500 mb-8">日常工作助手</p>
      <div className="grid grid-cols-3 gap-4 max-w-2xl">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.icon]
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-center group"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                {Icon && <Icon size={24} />}
              </div>
              <span className="font-medium text-gray-700 text-sm">{tab.label}</span>
              <span className="text-xs text-gray-400">{descriptions[tab.id] || ''}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create stub components**

Create each stub component file (so App.tsx imports don't fail):

`src/renderer/components/FileSearch.tsx`:
```typescript
export default function FileSearch() {
  return <div className="p-4"><h2 className="text-xl font-semibold mb-4">文件搜索</h2><p className="text-gray-500">即将实现...</p></div>
}
```

`src/renderer/components/FastOpener.tsx`:
```typescript
export default function FastOpener() {
  return <div className="p-4"><h2 className="text-xl font-semibold mb-4">快速打开</h2><p className="text-gray-500">即将实现...</p></div>
}
```

`src/renderer/components/ProcessManager.tsx`:
```typescript
export default function ProcessManager() {
  return <div className="p-4"><h2 className="text-xl font-semibold mb-4">进程管理</h2><p className="text-gray-500">即将实现...</p></div>
}
```

`src/renderer/components/Calendar.tsx`:
```typescript
export default function Calendar() {
  return <div className="p-4"><h2 className="text-xl font-semibold mb-4">万年历</h2><p className="text-gray-500">即将实现...</p></div>
}
```

`src/renderer/components/ClockTimer.tsx`:
```typescript
export default function ClockTimer() {
  return <div className="p-4"><h2 className="text-xl font-semibold mb-4">时钟计时</h2><p className="text-gray-500">即将实现...</p></div>
}
```

`src/renderer/components/EnvManager.tsx`:
```typescript
export default function EnvManager() {
  return <div className="p-4"><h2 className="text-xl font-semibold mb-4">环境变量</h2><p className="text-gray-500">即将实现...</p></div>
}
```

- [ ] **Step 8: Verify the shell launches**

Run: `npx concurrently "npx vite" "wait-on http://localhost:5173 && npx electron ."`
Expected: Electron window opens at 1200×800, shows sidebar with icons and Welcome grid. Tabs switch on click. Ctrl+1~6 navigate tabs.

- [ ] **Step 9: Commit**

```bash
git add src/
git commit -m "feat: Electron main process shell with React sidebar, welcome screen, and 6 stub tabs"
```

---

### Task 3: IPC Bridge + Settings Service

**Covers:** [S4, S5 (Settings)]

**Files:**
- Modify: `src/main/preload.ts`
- Modify: `src/main/index.ts`
- Create: `src/main/ipc.ts`
- Create: `src/main/services/settings.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/renderer/types/electron.d.ts`

- [ ] **Step 1: Update shared types**

Replace `src/shared/types.ts`:
```typescript
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface Settings {
  dataPath: string
}

export interface ElectronAPI {
  settings: {
    get: () => Promise<IpcResult<Settings>>
    save: (s: Settings) => Promise<IpcResult<void>>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

- [ ] **Step 2: Create settings service**

Create `src/main/services/settings.ts`:
```typescript
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface Settings {
  dataPath: string
}

const defaultSettings: Settings = {
  dataPath: app.getPath('userData'),
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
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
```

- [ ] **Step 3: Create IPC hub**

Create `src/main/ipc.ts`:
```typescript
import { ipcMain } from 'electron'
import { loadSettings, saveSettings } from './services/settings'
import type { IpcResult } from '../../shared/types'

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
}
```

- [ ] **Step 4: Update preload to expose settings API**

Replace `src/main/preload.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types'

const api: ElectronAPI = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (s) => ipcRenderer.invoke('settings:save', s),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
```

- [ ] **Step 5: Wire IPC into main process**

In `src/main/index.ts`, add after the imports:
```typescript
import { registerIpcHandlers } from './ipc'
```

And add before `createWindow()` in the `app.whenReady()` callback:
```typescript
registerIpcHandlers()
```

The `app.whenReady()` block should now read:
```typescript
app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})
```

- [ ] **Step 6: Verify IPC works**

Run the app, open DevTools (Ctrl+Shift+I), and in console:
```javascript
const result = await window.electronAPI.settings.get()
console.log(result)
```
Expected: `{ ok: true, data: { dataPath: "..." } }`

- [ ] **Step 7: Commit**

```bash
git add src/main/ipc.ts src/main/preload.ts src/main/index.ts src/main/services/settings.ts src/shared/types.ts
git commit -m "feat: IPC bridge with settings service (get/save)"
```

---

### Task 4: File Search Module

**Covers:** [S5 (File Search)]

**Files:**
- Create: `src/main/services/file-search.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/main/preload.ts`
- Modify: `src/shared/types.ts`
- Replace: `src/renderer/components/FileSearch.tsx`

- [ ] **Step 1: Create file-search service**

Create `src/main/services/file-search.ts`:
```typescript
import fs from 'fs'
import path from 'path'
import { BrowserWindow } from 'electron'

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

function matchesKeyword(fileName: string, keyword: string): boolean {
  const lowerName = fileName.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  return lowerName.includes(lowerKeyword)
}

function matchesFileType(fileName: string, fileType?: string): boolean {
  if (!fileType || fileType === 'all') return true
  const ext = path.extname(fileName).toLowerCase().slice(1)
  return ext === fileType.toLowerCase()
}

let abortController: AbortController | null = null

export function searchFiles(
  req: SearchRequest,
  window: BrowserWindow,
): void {
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()
  const signal = abortController.signal

  const results: FileInfo[] = []
  const BATCH_SIZE = 50

  function walk(dir: string) {
    if (signal.aborted) return
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (signal.aborted) return
        const fullPath = path.join(dir, entry.name)
        try {
          if (entry.isDirectory()) {
            if (matchesKeyword(entry.name, req.keyword)) {
              const stat = fs.statSync(fullPath)
              const info: FileInfo = {
                name: entry.name,
                path: fullPath,
                size: stat.size,
                isDir: true,
                modTime: stat.mtimeMs,
              }
              results.push(info)
              if (results.length >= BATCH_SIZE) {
                window.webContents.send('file:found', [...results])
                results.length = 0
              }
            }
            walk(fullPath)
          } else {
            if (
              matchesKeyword(entry.name, req.keyword) &&
              matchesFileType(entry.name, req.fileType)
            ) {
              const stat = fs.statSync(fullPath)
              const info: FileInfo = {
                name: entry.name,
                path: fullPath,
                size: stat.size,
                isDir: false,
                modTime: stat.mtimeMs,
              }
              results.push(info)
              if (results.length >= BATCH_SIZE) {
                window.webContents.send('file:found', [...results])
                results.length = 0
              }
            }
          }
        } catch {
          // skip inaccessible files
        }
      }
    } catch {
      // skip inaccessible directories
    }
  }

  try {
    walk(req.searchPath)
    if (!signal.aborted && results.length > 0) {
      window.webContents.send('file:found', [...results])
    }
    if (!signal.aborted) {
      window.webContents.send('file:complete')
    }
  } catch {
    if (!signal.aborted) {
      window.webContents.send('file:complete')
    }
  }
}

export function cancelSearch(): void {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
}

export function getDrives(): string[] {
  if (process.platform === 'win32') {
    const drives: string[] = []
    for (let code = 65; code <= 90; code++) {
      const letter = String.fromCharCode(code)
      const drivePath = `${letter}:\\`
      try {
        fs.accessSync(drivePath)
        drives.push(drivePath)
      } catch {
        // drive not available
      }
    }
    return drives
  }
  return ['/']
}
```

- [ ] **Step 2: Register file-search IPC handlers**

In `src/main/ipc.ts`, add to top:
```typescript
import { searchFiles, cancelSearch, getDrives } from './services/file-search'
import { BrowserWindow } from 'electron'
```

Add these handlers inside `registerIpcHandlers()`:
```typescript
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
```

- [ ] **Step 3: Add file-search types to ElectronAPI**

In `src/shared/types.ts`, add to the `ElectronAPI` interface (inside the settings block):
```typescript
  fileSearch: {
    search: (req: SearchRequest) => Promise<IpcResult<void>>
    cancel: () => Promise<IpcResult<void>>
    getDrives: () => Promise<IpcResult<string[]>>
    onFound: (cb: (files: FileInfo[]) => void) => () => void
    onComplete: (cb: () => void) => () => void
  }
```

And add the types before the ElectronAPI interface:
```typescript
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
```

- [ ] **Step 4: Add file-search to preload**

In `src/main/preload.ts`, add inside the `api` object after the settings block:
```typescript
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
```

- [ ] **Step 5: Build FileSearch React component**

Replace `src/renderer/components/FileSearch.tsx`:
```typescript
import { useState, useEffect, useCallback } from 'react'
import { Search, Folder, File, HardDrive, X, Loader2 } from 'lucide-react'
import type { FileInfo, SearchRequest } from '../../shared/types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function FileSearch() {
  const [keyword, setKeyword] = useState('')
  const [searchPath, setSearchPath] = useState('C:\\')
  const [drives, setDrives] = useState<string[]>([])
  const [results, setResults] = useState<FileInfo[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    window.electronAPI.fileSearch.getDrives().then((res) => {
      if (res.ok) setDrives(res.data)
    })
  }, [])

  useEffect(() => {
    const unsubFound = window.electronAPI.fileSearch.onFound((files) => {
      setResults((prev) => [...prev, ...files])
    })
    const unsubComplete = window.electronAPI.fileSearch.onComplete(() => {
      setSearching(false)
    })
    return () => {
      unsubFound()
      unsubComplete()
    }
  }, [])

  const handleSearch = useCallback(async () => {
    if (!keyword.trim()) return
    setResults([])
    setSearching(true)
    const req: SearchRequest = { keyword: keyword.trim(), searchPath }
    await window.electronAPI.fileSearch.search(req)
  }, [keyword, searchPath])

  const handleCancel = async () => {
    await window.electronAPI.fileSearch.cancel()
    setSearching(false)
  }

  const handleOpen = (filePath: string) => {
    // Will use shell.openPath via IPC in a later iteration
    console.log('Open:', filePath)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">文件搜索</h2>
      </div>

      <div className="flex gap-2 mb-4">
        <select
          value={searchPath}
          onChange={(e) => setSearchPath(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {drives.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <div className="flex-1 relative">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入关键词搜索..."
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        {searching ? (
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
          >
            <X size={16} />
            取消
          </button>
        ) : (
          <button
            onClick={handleSearch}
            className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
          >
            <Search size={16} />
            搜索
          </button>
        )}
      </div>

      {searching && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Loader2 size={16} className="animate-spin" />
          搜索中...
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">名称</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-32">大小</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-48">路径</th>
            </tr>
          </thead>
          <tbody>
            {results.map((f, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                onDoubleClick={() => handleOpen(f.path)}
              >
                <td className="px-4 py-2 flex items-center gap-2">
                  {f.isDir ? (
                    <Folder size={16} className="text-yellow-500 shrink-0" />
                  ) : (
                    <File size={16} className="text-gray-400 shrink-0" />
                  )}
                  <span className="truncate">{f.name}</span>
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {f.isDir ? '-' : formatSize(f.size)}
                </td>
                <td className="px-4 py-2 text-gray-400 truncate max-w-xs">{f.path}</td>
              </tr>
            ))}
            {!searching && results.length === 0 && keyword && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  无搜索结果
                </td>
              </tr>
            )}
            {!searching && !keyword && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  输入关键词开始搜索
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify file search works**

Run the app, navigate to File Search tab, enter a keyword, click search.
Expected: results stream in, show filenames/sizes/paths, cancel button works.

- [ ] **Step 7: Commit**

```bash
git add src/main/services/file-search.ts src/main/ipc.ts src/main/preload.ts src/shared/types.ts src/renderer/components/FileSearch.tsx
git commit -m "feat: file search module with streaming results"
```

---

### Task 5: Fast Opener Module

**Covers:** [S5 (Fast Opener)]

**Files:**
- Create: `src/main/services/fast-opener.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/main/preload.ts`
- Modify: `src/shared/types.ts`
- Replace: `src/renderer/components/FastOpener.tsx`

- [ ] **Step 1: Create fast-opener service**

Create `src/main/services/fast-opener.ts`:
```typescript
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

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

interface StoreData {
  groups: OpenerGroup[]
  items: OpenerItem[]
}

const defaultData: StoreData = {
  groups: [{ id: 'default', name: '默认' }],
  items: [],
}

function getStorePath(): string {
  return path.join(app.getPath('userData'), 'opener.json')
}

function loadStore(): StoreData {
  try {
    const p = getStorePath()
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    }
  } catch {}
  return defaultData
}

function saveStore(data: StoreData): void {
  const p = getStorePath()
  const dir = path.dirname(p)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')
}

let idCounter = Date.now()

function nextId(): string {
  return String(++idCounter)
}

export function getGroups(): OpenerGroup[] {
  return loadStore().groups
}

export function addGroup(name: string): OpenerGroup {
  const store = loadStore()
  const group: OpenerGroup = { id: nextId(), name }
  store.groups.push(group)
  saveStore(store)
  return group
}

export function removeGroup(id: string): void {
  const store = loadStore()
  store.groups = store.groups.filter(g => g.id !== id)
  store.items = store.items.filter(i => i.groupId !== id)
  saveStore(store)
}

export function getItems(): OpenerItem[] {
  return loadStore().items
}

export function addItem(name: string, itemPath: string, groupId: string): OpenerItem {
  const store = loadStore()
  const item: OpenerItem = { id: nextId(), name, path: itemPath, groupId, useCount: 0 }
  store.items.push(item)
  saveStore(store)
  return item
}

export function removeItem(id: string): void {
  const store = loadStore()
  store.items = store.items.filter(i => i.id !== id)
  saveStore(store)
}

export function incrementUseCount(id: string): void {
  const store = loadStore()
  const item = store.items.find(i => i.id === id)
  if (item) {
    item.useCount++
    saveStore(store)
  }
}
```

- [ ] **Step 2: Register fast-opener IPC handlers**

In `src/main/ipc.ts`, add import:
```typescript
import { getGroups, addGroup, removeGroup, getItems, addItem, removeItem, incrementUseCount } from './services/fast-opener'
```

Add handlers:
```typescript
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
```

- [ ] **Step 3: Add fast-opener types to shared types**

In `src/shared/types.ts`, add before `ElectronAPI`:
```typescript
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
```

Add to `ElectronAPI`:
```typescript
  opener: {
    getGroups: () => Promise<IpcResult<OpenerGroup[]>>
    addGroup: (name: string) => Promise<IpcResult<OpenerGroup>>
    removeGroup: (id: string) => Promise<IpcResult<void>>
    getItems: () => Promise<IpcResult<OpenerItem[]>>
    addItem: (name: string, path: string, groupId: string) => Promise<IpcResult<OpenerItem>>
    removeItem: (id: string) => Promise<IpcResult<void>>
    useItem: (id: string) => Promise<IpcResult<void>>
  }
```

- [ ] **Step 4: Add fast-opener to preload**

In `src/main/preload.ts`, add inside `api`:
```typescript
  opener: {
    getGroups: () => ipcRenderer.invoke('opener:groups'),
    addGroup: (name) => ipcRenderer.invoke('opener:addGroup', name),
    removeGroup: (id) => ipcRenderer.invoke('opener:removeGroup', id),
    getItems: () => ipcRenderer.invoke('opener:items'),
    addItem: (name, itemPath, groupId) => ipcRenderer.invoke('opener:addItem', name, itemPath, groupId),
    removeItem: (id) => ipcRenderer.invoke('opener:removeItem', id),
    useItem: (id) => ipcRenderer.invoke('opener:useItem', id),
  },
```

- [ ] **Step 5: Build FastOpener React component**

Replace `src/renderer/components/FastOpener.tsx`:
```typescript
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, FolderOpen, Folder, Zap } from 'lucide-react'
import type { OpenerGroup, OpenerItem } from '../../shared/types'

export default function FastOpener() {
  const [groups, setGroups] = useState<OpenerGroup[]>([])
  const [items, setItems] = useState<OpenerItem[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('default')
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPath, setNewItemPath] = useState('')

  const loadData = useCallback(async () => {
    const [gRes, iRes] = await Promise.all([
      window.electronAPI.opener.getGroups(),
      window.electronAPI.opener.getItems(),
    ])
    if (gRes.ok) setGroups(gRes.data)
    if (iRes.ok) setItems(iRes.data)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return
    const res = await window.electronAPI.opener.addGroup(newGroupName.trim())
    if (res.ok) {
      setGroups((prev) => [...prev, res.data])
      setNewGroupName('')
      setShowAddGroup(false)
    }
  }

  const handleRemoveGroup = async (id: string) => {
    await window.electronAPI.opener.removeGroup(id)
    setGroups((prev) => prev.filter((g) => g.id !== id))
    setItems((prev) => prev.filter((i) => i.groupId !== id))
    if (selectedGroup === id) setSelectedGroup('default')
  }

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPath.trim()) return
    const res = await window.electronAPI.opener.addItem(newItemName.trim(), newItemPath.trim(), selectedGroup)
    if (res.ok) {
      setItems((prev) => [...prev, res.data])
      setNewItemName('')
      setNewItemPath('')
      setShowAddItem(false)
    }
  }

  const handleRemoveItem = async (id: string) => {
    await window.electronAPI.opener.removeItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const handleOpen = async (item: OpenerItem) => {
    await window.electronAPI.opener.useItem(item.id)
    console.log('Open:', item.path)
  }

  const filteredItems = items.filter((i) => i.groupId === selectedGroup)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">快速打开</h2>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        <div className="w-48 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">分组</span>
            <button
              onClick={() => setShowAddGroup(!showAddGroup)}
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              title="添加分组"
            >
              <Plus size={16} />
            </button>
          </div>
          {showAddGroup && (
            <div className="flex gap-1 mb-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                placeholder="分组名"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                autoFocus
              />
              <button onClick={handleAddGroup} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">确定</button>
            </div>
          )}
          <div className="space-y-1">
            {groups.map((g) => (
              <div
                key={g.id}
                onClick={() => setSelectedGroup(g.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  selectedGroup === g.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="truncate">{g.name}</span>
                {g.id !== 'default' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveGroup(g.id) }}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">项目</span>
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              <Plus size={14} />
              添加
            </button>
          </div>
          {showAddItem && (
            <div className="flex gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="名称"
                className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
                autoFocus
              />
              <input
                type="text"
                value={newItemPath}
                onChange={(e) => setNewItemPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="路径"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <button onClick={handleAddItem} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">确定</button>
            </div>
          )}
          <div className="flex-1 overflow-auto">
            {filteredItems.length === 0 ? (
              <p className="text-center text-gray-400 mt-8">暂无项目，点击"添加"创建</p>
            ) : (
              <div className="space-y-1">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onDoubleClick={() => handleOpen(item)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen size={16} className="text-yellow-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-700 truncate">{item.name}</div>
                        <div className="text-xs text-gray-400 truncate">{item.path}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">使用 {item.useCount} 次</span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify fast opener works**

Run the app, navigate to Fast Opener tab.
Expected: shows default group, can add groups/items, remove them, data persists.

- [ ] **Step 7: Commit**

```bash
git add src/main/services/fast-opener.ts src/main/ipc.ts src/main/preload.ts src/shared/types.ts src/renderer/components/FastOpener.tsx
git commit -m "feat: fast opener module with groups and items CRUD"
```

---

### Task 6: Process Manager Module

**Covers:** [S5 (Process Manager)]

**Files:**
- Create: `src/main/services/process-manager.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/main/preload.ts`
- Modify: `src/shared/types.ts`
- Replace: `src/renderer/components/ProcessManager.tsx`

- [ ] **Step 1: Create process-manager service**

Create `src/main/services/process-manager.ts`:
```typescript
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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

export async function getProcesses(): Promise<ProcessInfo[]> {
  try {
    const { stdout } = await execAsync('tasklist /FO CSV /NH', { timeout: 10000 })
    const lines = stdout.trim().split('\n')
    return lines
      .map((line) => {
        const parts = line.replace(/"/g, '').split(',')
        const name = parts[0]?.trim() || ''
        const pid = parseInt(parts[1]?.trim() || '0', 10)
        const memStr = (parts[4]?.trim() || '0').replace(/[^0-9]/g, '')
        const memKB = parseInt(memStr || '0', 10)
        return { pid, name, memoryKB: memKB, cpu: '' }
      })
      .filter((p) => p.pid > 0)
  } catch {
    return []
  }
}

export async function killProcess(pid: number): Promise<void> {
  await execAsync(`taskkill /PID ${pid} /F`, { timeout: 5000 })
}

export async function getAutoStartEntries(): Promise<AutoStartEntry[]> {
  const entries: AutoStartEntry[] = []
  try {
    const { stdout } = await execAsync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"',
      { timeout: 5000 }
    )
    for (const line of stdout.split('\n')) {
      const match = line.trim().match(/^\s*(.+?)\s+REG_\w+\s+(.+)$/)
      if (match) {
        entries.push({ name: match[1], path: match[2], source: 'HKCU' })
      }
    }
  } catch {}
  return entries
}

export async function removeAutoStart(name: string, source: string): Promise<void> {
  const key = source === 'HKCU'
    ? 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    : 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
  await execAsync(`reg delete "${key}" /v "${name}" /f`, { timeout: 5000 })
}

export async function getProcessPorts(): Promise<{ pid: number; port: number }[]> {
  try {
    const { stdout } = await execAsync('netstat -ano', { timeout: 10000 })
    const results: { pid: number; port: number }[] = []
    for (const line of stdout.split('\n')) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 5 && parts[0] === 'TCP') {
        const localAddr = parts[1]
        const pid = parseInt(parts[4], 10)
        const portMatch = localAddr.match(/:(\d+)$/)
        if (portMatch && !isNaN(pid)) {
          results.push({ pid, port: parseInt(portMatch[1], 10) })
        }
      }
    }
    return results
  } catch {
    return []
  }
}
```

- [ ] **Step 2: Register process-manager IPC handlers**

In `src/main/ipc.ts`, add import:
```typescript
import { getProcesses, killProcess, getAutoStartEntries, removeAutoStart, getProcessPorts } from './services/process-manager'
```

Add handlers:
```typescript
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
```

- [ ] **Step 3: Add process-manager types to shared types**

In `src/shared/types.ts`, add before `ElectronAPI`:
```typescript
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
```

Add to `ElectronAPI`:
```typescript
  processManager: {
    list: () => Promise<IpcResult<ProcessInfo[]>>
    kill: (pid: number) => Promise<IpcResult<void>>
    autostart: () => Promise<IpcResult<AutoStartEntry[]>>
    removeAutostart: (name: string, source: string) => Promise<IpcResult<void>>
    ports: () => Promise<IpcResult<{ pid: number; port: number }[]>>
  }
```

- [ ] **Step 4: Add process-manager to preload**

In `src/main/preload.ts`, add inside `api`:
```typescript
  processManager: {
    list: () => ipcRenderer.invoke('process:list'),
    kill: (pid) => ipcRenderer.invoke('process:kill', pid),
    autostart: () => ipcRenderer.invoke('process:autostart'),
    removeAutostart: (name, source) => ipcRenderer.invoke('process:removeAutostart', name, source),
    ports: () => ipcRenderer.invoke('process:ports'),
  },
```

- [ ] **Step 5: Build ProcessManager React component**

Replace `src/renderer/components/ProcessManager.tsx`:
```typescript
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, XCircle, Loader2 } from 'lucide-react'
import type { ProcessInfo, AutoStartEntry } from '../../shared/types'

function formatMem(kb: number): string {
  if (kb < 1024) return `${kb} KB`
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${(kb / (1024 * 1024)).toFixed(2)} GB`
}

export default function ProcessManager() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [autostarts, setAutostarts] = useState<AutoStartEntry[]>([])
  const [ports, setPorts] = useState<{ pid: number; port: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'processes' | 'autostart'>('processes')

  const refresh = useCallback(async () => {
    setLoading(true)
    const [pRes, aRes, portRes] = await Promise.all([
      window.electronAPI.processManager.list(),
      window.electronAPI.processManager.autostart(),
      window.electronAPI.processManager.ports(),
    ])
    if (pRes.ok) {
      const portMap = new Map<number, number[]>()
      if (portRes.ok) {
        for (const { pid, port } of portRes.data) {
          if (!portMap.has(pid)) portMap.set(pid, [])
          portMap.get(pid)!.push(port)
        }
      }
      setProcesses(
        pRes.data.map((p) => ({
          ...p,
          cpu: (portMap.get(p.pid) || []).join(', '),
        }))
      )
    }
    if (aRes.ok) setAutostarts(aRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleKill = async (pid: number) => {
    await window.electronAPI.processManager.kill(pid)
    setProcesses((prev) => prev.filter((p) => p.pid !== pid))
  }

  const handleRemoveAutostart = async (entry: AutoStartEntry) => {
    await window.electronAPI.processManager.removeAutostart(entry.name, entry.source)
    setAutostarts((prev) => prev.filter((e) => e.name !== entry.name))
  }

  const filtered = processes.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || String(p.pid).includes(search)
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">进程管理</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('processes')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            tab === 'processes' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          进程列表
        </button>
        <button
          onClick={() => setTab('autostart')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            tab === 'autostart' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          开机自启
        </button>
      </div>

      {tab === 'processes' && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索进程名或 PID..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-400 w-64"
          />
          <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">PID</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">名称</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 w-28">内存</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 w-28">端口</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.pid} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500 font-mono">{p.pid}</td>
                    <td className="px-4 py-2 truncate max-w-xs">{p.name}</td>
                    <td className="px-4 py-2 text-gray-500">{formatMem(p.memoryKB)}</td>
                    <td className="px-4 py-2 text-gray-400 font-mono text-xs">{p.cpu || '-'}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleKill(p.pid)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs transition-colors"
                      >
                        <XCircle size={14} />
                        结束
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">无匹配进程</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'autostart' && (
        <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">名称</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">路径</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 w-16">来源</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {autostarts.map((e, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{e.name}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs truncate max-w-md">{e.path}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{e.source}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleRemoveAutostart(e)}
                      className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs transition-colors"
                    >
                      <XCircle size={14} />
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {autostarts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">无开机自启项</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Verify process manager works**

Run the app, navigate to Process Manager tab.
Expected: process list loads, search filters, kill button works, autostart tab shows entries.

- [ ] **Step 7: Commit**

```bash
git add src/main/services/process-manager.ts src/main/ipc.ts src/main/preload.ts src/shared/types.ts src/renderer/components/ProcessManager.tsx
git commit -m "feat: process manager with list, kill, and autostart management"
```

---

### Task 7: Calendar Module

**Covers:** [S5 (Chinese Calendar)]

**Files:**
- Create: `src/main/services/calendar.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/main/preload.ts`
- Modify: `src/shared/types.ts`
- Replace: `src/renderer/components/Calendar.tsx`

- [ ] **Step 1: Create calendar service**

Create `src/main/services/calendar.ts`:
```typescript
// 使用 lunar-javascript 提供农历、节气等
const { Lunar, Solar } = require('lunar-javascript')

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

export function getMonthData(y: number, m: number): CalendarDay[] {
  const days: CalendarDay[] = []
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`

  const firstDay = new Date(y, m - 1, 1)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = new Date(y, m, 0).getDate()

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(y, m - 1, -i)
    days.push(buildDay(d, todayStr))
  }

  for (let d = 1; d <= daysInMonth; d++) {
    days.push(buildDay(new Date(y, m - 1, d), todayStr))
  }

  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push(buildDay(new Date(y, m, d), todayStr))
  }

  return days
}

function buildDay(date: Date, todayStr: string): CalendarDay {
  const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    lunarYear: lunar.getYearInChinese(),
    lunarMonth: lunar.getMonthInChinese(),
    lunarDay: lunar.getDayInChinese(),
    festival: lunar.getFestivals().join('、') || '',
    solarTerm: lunar.getJie() || lunar.getQi() || '',
    isToday: dateStr === todayStr,
  }
}
```

- [ ] **Step 2: Register calendar IPC handlers**

In `src/main/ipc.ts`, add import:
```typescript
import { getMonthData } from './services/calendar'
```

Add handler:
```typescript
ipcMain.handle('calendar:month', (_e, year, month) => {
  try { return ok(getMonthData(year, month)) } catch (e: any) { return err(e.message) }
})
```

- [ ] **Step 3: Add calendar types to shared types**

In `src/shared/types.ts`, add before `ElectronAPI`:
```typescript
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
```

Add to `ElectronAPI`:
```typescript
  calendar: {
    getMonth: (year: number, month: number) => Promise<IpcResult<CalendarDay[]>>
  }
```

- [ ] **Step 4: Add calendar to preload**

In `src/main/preload.ts`, add inside `api`:
```typescript
  calendar: {
    getMonth: (year, month) => ipcRenderer.invoke('calendar:month', year, month),
  },
```

- [ ] **Step 5: Build Calendar React component**

Replace `src/renderer/components/Calendar.tsx`:
```typescript
import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarDay } from '../../shared/types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function Calendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [days, setDays] = useState<CalendarDay[]>([])

  const loadMonth = useCallback(async () => {
    const res = await window.electronAPI.calendar.getMonth(year, month)
    if (res.ok) setDays(res.data)
  }, [year, month])

  useEffect(() => { loadMonth() }, [loadMonth])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">万年历</h2>
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-medium min-w-[100px] text-center">
            {year}年{month}月
          </span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-3 py-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const isOtherMonth = d.month !== month
            return (
              <div
                key={i}
                className={`min-h-[80px] p-2 border-b border-r border-gray-100 text-sm ${
                  isOtherMonth ? 'bg-gray-50/50 text-gray-300' : ''
                } ${d.isToday ? 'bg-blue-50' : ''}`}
              >
                <div className={`flex items-center gap-1 ${d.isToday ? 'text-blue-600 font-bold' : ''}`}>
                  <span>{d.day}</span>
                </div>
                {!isOtherMonth && (
                  <div className="mt-1">
                    <div className={`text-xs ${d.solarTerm ? 'text-orange-500 font-medium' : 'text-gray-500'}`}>
                      {d.solarTerm || d.lunarDay}
                    </div>
                    {d.festival && (
                      <div className="text-xs text-red-500 truncate mt-0.5">{d.festival}</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify calendar works**

Run the app, navigate to Calendar tab.
Expected: month grid shows with lunar dates, today highlighted, navigation works.

- [ ] **Step 7: Commit**

```bash
git add src/main/services/calendar.ts src/main/ipc.ts src/main/preload.ts src/shared/types.ts src/renderer/components/Calendar.tsx
git commit -m "feat: Chinese calendar module with lunar dates and solar terms"
```

---

### Task 8: Clock Timer Module

**Covers:** [S5 (Clock Timer)]

**Files:**
- Create: `src/main/services/clock.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/main/preload.ts`
- Modify: `src/shared/types.ts`
- Replace: `src/renderer/components/ClockTimer.tsx`

- [ ] **Step 1: Create clock service**

Create `src/main/services/clock.ts`:
```typescript
export function getServerTime(): number {
  return Date.now()
}

export function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
```

- [ ] **Step 2: Register clock IPC handlers**

In `src/main/ipc.ts`, add import:
```typescript
import { getServerTime, getTimezone } from './services/clock'
```

Add handlers:
```typescript
ipcMain.handle('clock:time', () => {
  try { return ok(getServerTime()) } catch (e: any) { return err(e.message) }
})
ipcMain.handle('clock:timezone', () => {
  try { return ok(getTimezone()) } catch (e: any) { return err(e.message) }
})
```

- [ ] **Step 3: Add clock types to shared types**

In `src/shared/types.ts`, add to `ElectronAPI`:
```typescript
  clock: {
    getTime: () => Promise<IpcResult<number>>
    getTimezone: () => Promise<IpcResult<string>>
  }
```

- [ ] **Step 4: Add clock to preload**

In `src/main/preload.ts`, add inside `api`:
```typescript
  clock: {
    getTime: () => ipcRenderer.invoke('clock:time'),
    getTimezone: () => ipcRenderer.invoke('clock:timezone'),
  },
```

- [ ] **Step 5: Build ClockTimer React component**

Replace `src/renderer/components/ClockTimer.tsx`:
```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { Clock, Timer, Play, Pause, RotateCcw } from 'lucide-react'

export default function ClockTimer() {
  const [timeStr, setTimeStr] = useState('')
  const [timezone, setTimezone] = useState('')
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [inputSeconds, setInputSeconds] = useState('')
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    window.electronAPI.clock.getTimezone().then((res) => {
      if (res.ok) setTimezone(res.data)
    })
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTimeStr(
        now.toLocaleTimeString('zh-CN', { hour12: false }) +
        ' ' +
        now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' })
      )
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (running && countdownSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            setRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const startCountdown = () => {
    const secs = parseInt(inputSeconds)
    if (secs > 0) {
      setCountdownSeconds(secs)
      setRunning(true)
    }
  }

  const formatCountdown = (totalSecs: number): string => {
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-6">时钟计时</h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-gray-500 mb-4">
            <Clock size={20} />
            <span className="text-sm font-medium">当前时间</span>
          </div>
          <div className="text-3xl font-mono font-bold text-gray-800 mb-2">{timeStr.split(' ')[0] || '--:--:--'}</div>
          <div className="text-sm text-gray-500">{timeStr.split(' ').slice(1).join(' ') || ''}</div>
          <div className="mt-3 text-xs text-gray-400">时区: {timezone || '--'}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-gray-500 mb-4">
            <Timer size={20} />
            <span className="text-sm font-medium">倒计时</span>
          </div>
          <div className="text-4xl font-mono font-bold text-gray-800 mb-4">
            {formatCountdown(countdownSeconds)}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={inputSeconds}
              onChange={(e) => setInputSeconds(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startCountdown()}
              placeholder="秒数"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:border-blue-400"
              disabled={running}
            />
            <button
              onClick={running ? () => setRunning(false) : startCountdown}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-white transition-colors ${
                running ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {running ? <Pause size={14} /> : <Play size={14} />}
              {running ? '暂停' : '开始'}
            </button>
            <button
              onClick={() => { setRunning(false); setCountdownSeconds(0); setInputSeconds('') }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RotateCcw size={14} />
              重置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify clock works**

Run the app, navigate to Clock tab.
Expected: time updates every second, timezone shown, countdown start/pause/reset works.

- [ ] **Step 7: Commit**

```bash
git add src/main/services/clock.ts src/main/ipc.ts src/main/preload.ts src/shared/types.ts src/renderer/components/ClockTimer.tsx
git commit -m "feat: clock timer module with live time, timezone, and countdown"
```

---

### Task 9: Environment Variables Module

**Covers:** [S5 (Environment Variables)]

**Files:**
- Create: `src/main/services/env-manager.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/main/preload.ts`
- Modify: `src/shared/types.ts`
- Replace: `src/renderer/components/EnvManager.tsx`

- [ ] **Step 1: Create env-manager service**

Create `src/main/services/env-manager.ts`:
```typescript
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execAsync = promisify(exec)

export interface EnvEntry {
  name: string
  value: string
  scope: 'user' | 'system'
}

export function getProcessEnv(): EnvEntry[] {
  const entries: EnvEntry[] = []
  for (const [name, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      entries.push({ name, value, scope: 'user' })
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getSystemEnv(): Promise<EnvEntry[]> {
  const entries: EnvEntry[] = []
  try {
    const { stdout } = await execAsync(
      'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment"',
      { timeout: 5000 }
    )
    const lines = stdout.split('\n')
    for (const line of lines) {
      const match = line.trim().match(/^\s*(.+?)\s+REG_\w+\s+(.+)$/)
      if (match && match[1] !== 'Path') {
        entries.push({ name: match[1], value: match[2], scope: 'system' })
      }
    }
  } catch {}
  return entries
}

export async function setUserEnv(name: string, value: string): Promise<void> {
  await execAsync(`setx "${name}" "${value}"`, { timeout: 5000 })
}

export async function deleteUserEnv(name: string): Promise<void> {
  await execAsync(
    `reg delete "HKCU\\Environment" /v "${name}" /f`,
    { timeout: 5000 }
  )
}

export async function backupEnvToToml(filePath: string): Promise<string> {
  const processEnv = getProcessEnv()
  const systemEnv = await getSystemEnv()

  let toml = '# Environment Variables Backup\n'
  toml += `# Generated: ${new Date().toISOString()}\n\n`

  toml += '[process]\n'
  for (const e of processEnv) {
    toml += `${e.name} = "${e.value.replace(/"/g, '\\"')}"\n`
  }

  toml += '\n[system]\n'
  for (const e of systemEnv) {
    toml += `${e.name} = "${e.value.replace(/"/g, '\\"')}"\n`
  }

  fs.writeFileSync(filePath, toml, 'utf-8')
  return filePath
}
```

- [ ] **Step 2: Register env-manager IPC handlers**

In `src/main/ipc.ts`, add import:
```typescript
import { getProcessEnv, getSystemEnv, setUserEnv, deleteUserEnv, backupEnvToToml } from './services/env-manager'
```

Add handlers:
```typescript
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
```

- [ ] **Step 3: Add env-manager types to shared types**

In `src/shared/types.ts`, add before `ElectronAPI`:
```typescript
export interface EnvEntry {
  name: string
  value: string
  scope: 'user' | 'system'
}
```

Add to `ElectronAPI`:
```typescript
  env: {
    getProcessEnv: () => Promise<IpcResult<EnvEntry[]>>
    getSystemEnv: () => Promise<IpcResult<EnvEntry[]>>
    setVar: (name: string, value: string) => Promise<IpcResult<void>>
    deleteVar: (name: string) => Promise<IpcResult<void>>
    backup: (filePath: string) => Promise<IpcResult<string>>
  }
```

- [ ] **Step 4: Add env-manager to preload**

In `src/main/preload.ts`, add inside `api`:
```typescript
  env: {
    getProcessEnv: () => ipcRenderer.invoke('env:process'),
    getSystemEnv: () => ipcRenderer.invoke('env:system'),
    setVar: (name, value) => ipcRenderer.invoke('env:set', name, value),
    deleteVar: (name) => ipcRenderer.invoke('env:delete', name),
    backup: (filePath) => ipcRenderer.invoke('env:backup', filePath),
  },
```

- [ ] **Step 5: Build EnvManager React component**

Replace `src/renderer/components/EnvManager.tsx`:
```typescript
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, RefreshCw, Download } from 'lucide-react'
import type { EnvEntry } from '../../shared/types'

export default function EnvManager() {
  const [processEnv, setProcessEnv] = useState<EnvEntry[]>([])
  const [systemEnv, setSystemEnv] = useState<EnvEntry[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('')

  const refresh = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      window.electronAPI.env.getProcessEnv(),
      window.electronAPI.env.getSystemEnv(),
    ])
    if (pRes.ok) setProcessEnv(pRes.data)
    if (sRes.ok) setSystemEnv(sRes.data)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleAdd = async () => {
    if (!newName.trim() || !newValue.trim()) return
    await window.electronAPI.env.setVar(newName.trim(), newValue.trim())
    setNewName('')
    setNewValue('')
    setShowAdd(false)
    refresh()
  }

  const handleDelete = async (name: string) => {
    await window.electronAPI.env.deleteVar(name)
    refresh()
  }

  const handleBackup = async () => {
    const res = await window.electronAPI.env.backup('env-backup.toml')
    if (res.ok) alert(`已备份到: ${res.data}`)
  }

  const allEnv = [...processEnv, ...systemEnv].filter(
    (e) => e.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">环境变量</h2>
        <button
          onClick={refresh}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          刷新
        </button>
        <button
          onClick={handleBackup}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Download size={14} />
          备份
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索变量名..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          <Plus size={14} />
          添加
        </button>
      </div>

      {showAdd && (
        <div className="flex gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="变量名"
            className="border border-gray-300 rounded px-2 py-1 text-sm w-48"
            autoFocus
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="值"
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <button onClick={handleAdd} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">确定</button>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-56">名称</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">值</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">作用域</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {allEnv.map((e, i) => (
              <tr key={`${e.scope}-${e.name}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs font-medium">{e.name}</td>
                <td className="px-4 py-2 text-gray-600 text-xs truncate max-w-lg" title={e.value}>
                  {e.value}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    e.scope === 'system' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {e.scope === 'system' ? '系统' : '用户'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {e.scope === 'user' && (
                    <button
                      onClick={() => handleDelete(e.name)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify env manager works**

Run the app, navigate to Env Vars tab.
Expected: process env and system env listed, search filters, add/delete user vars work, backup creates TOML file.

- [ ] **Step 7: Commit**

```bash
git add src/main/services/env-manager.ts src/main/ipc.ts src/main/preload.ts src/shared/types.ts src/renderer/components/EnvManager.tsx
git commit -m "feat: environment variables manager with view, edit, and backup"
```

---

### Task 10: Shell Integration (file open, settings UI)

**Covers:** [S5 (File Search, Fast Opener), S9]

**Files:**
- Modify: `src/main/ipc.ts`
- Modify: `src/main/preload.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/renderer/components/FileSearch.tsx`
- Modify: `src/renderer/components/FastOpener.tsx`

- [ ] **Step 1: Add shell.openPath to IPC**

In `src/main/ipc.ts`, add import:
```typescript
import { shell } from 'electron'
```

Add handler:
```typescript
ipcMain.handle('shell:openPath', (_e, filePath) => {
  try { shell.openPath(filePath); return ok(undefined) } catch (e: any) { return err(e.message) }
})
```

- [ ] **Step 2: Add to preload and types**

In `src/shared/types.ts`, add to `ElectronAPI`:
```typescript
  shell: {
    openPath: (path: string) => Promise<IpcResult<void>>
  }
```

In `src/main/preload.ts`, add inside `api`:
```typescript
  shell: {
    openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
  },
```

- [ ] **Step 3: Wire file opening in FileSearch**

In `src/renderer/components/FileSearch.tsx`, replace `handleOpen`:
```typescript
const handleOpen = async (filePath: string) => {
  await window.electronAPI.shell.openPath(filePath)
}
```

- [ ] **Step 4: Wire file opening in FastOpener**

In `src/renderer/components/FastOpener.tsx`, replace `handleOpen`:
```typescript
const handleOpen = async (item: OpenerItem) => {
  await window.electronAPI.opener.useItem(item.id)
  await window.electronAPI.shell.openPath(item.path)
}
```

- [ ] **Step 5: Verify file opening works**

Run the app, search for a file, double-click it.
Expected: file opens in default application. Fast Opener open also works.

- [ ] **Step 6: Commit**

```bash
git add src/main/ipc.ts src/main/preload.ts src/shared/types.ts src/renderer/components/FileSearch.tsx src/renderer/components/FastOpener.tsx
git commit -m "feat: shell.openPath integration for file opening"
```

---

### Task 11: Final Integration and Verification

**Covers:** [S7, S9, S10]

**Files:**
- Verify: all 6 modules functional
- Fix: any import/type issues from shared types refactoring

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.json && npx tsc --noEmit -p tsconfig.node.json`
Expected: no type errors.

- [ ] **Step 2: Manual smoke test — all tabs**

Run the app and verify each tab:
- Welcome: cards grid shows, click navigates to each tab
- File Search: search works, results render, double-click opens file
- Fast Opener: add group/item, remove, open file
- Process Manager: list loads, search, kill, autostart tab
- Calendar: month grid with lunar info, navigation
- Clock Timer: live time display, countdown start/pause/reset
- Env Manager: vars listed, add/delete user vars, backup

- [ ] **Step 3: Verify keyboard shortcuts**

Ctrl+1 through Ctrl+6 switch between all 6 tabs. Ctrl+0 or Escape returns to Welcome.

- [ ] **Step 4: Verify window behavior**

Window opens at 1200×800, cannot resize smaller than 800×600, close quits app.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final integration verification, all 6 modules functional"
```
