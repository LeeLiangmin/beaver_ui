# AGENTS.md

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (or `just dev`) |
| Typecheck | `npm run typecheck` (or `just typecheck`) — runs **both** tsconfigs |
| Lint | `npm run lint` — ESLint |
| Format | `npm run format` — Prettier (no semicolons, single quotes) |
| Test | `npm run test` — vitest |
| Build all | `npm run build` — vite build (renderer) then tsc (main) |
| Package exe | `npm run package` |
| Kill stale processes | `just kill` |

## Architecture

Electron desktop app (Windows-focused). Two compilation targets:

- **Main process** (`src/main/`) — compiled by `tsc -p tsconfig.node.json` → `dist/main/`. Uses CommonJS. Entry: `src/main/index.ts`.
- **Renderer** (`src/renderer/`) — compiled by Vite → `dist/renderer/`. Uses ESNext modules + React 18. Entry: `src/renderer/main.tsx`. Vite root is `src/renderer`.
- **Shared** (`src/shared/`) — included by both tsconfigs. Path alias: `@shared/*` → `src/shared/*`.

### IPC pattern

All main↔renderer communication goes through a single typed bridge:

1. `src/main/ipc.ts` registers `ipcMain.handle()` handlers (channel names like `"settings:get"`).
2. `src/main/preload.ts` exposes them via `contextBridge` as `window.electronAPI`.
3. `src/shared/types.ts` defines `ElectronAPI` interface and `IpcResult<T>` wrapper.

All IPC handlers return `IpcResult<T>` — either `{ ok: true, data }` or `{ ok: false, error }`. To add a feature: add handler in `ipc.ts`, expose in `preload.ts`, type in `types.ts`.

### Services (main process)

`src/main/services/` — each file is a domain module (db, settings, file-search, fast-opener, process-manager, calendar, clock, env-manager). All use SQLite via `better-sqlite3` (native module, requires build tools on install).

### Renderer

Tab-based SPA. Each tab is a lazy-loaded component in `src/renderer/components/`. Uses Tailwind CSS v4 (via `@tailwindcss/vite` plugin, no config file needed). Icons from `lucide-react`.

## Key gotchas

- **Two tsconfigs**: `tsconfig.json` covers renderer+shared; `tsconfig.node.json` covers main+shared. `npm run typecheck` runs both. A change in `src/shared/` may need both to pass.
- **`better-sqlite3`** is a native C++ module. `npm install` requires platform build tools (see README).
- **Packaging is Windows-only** (NSIS installer + portable exe). `electron-builder.yml` outputs to `release/`.
- **No `.env` loading** — settings are stored in SQLite, not env vars.
- **`docs/`, `*.db`, `release/`, `dist/`** are git-ignored.
