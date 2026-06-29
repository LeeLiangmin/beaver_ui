# Beaver

Daily Work Assistant — Electron desktop app.

## Dev

### Prerequisites

`better-sqlite3` is a native module — it needs to compile on install. Make sure your platform has the required build tools:

| Platform | Requirements |
|----------|-------------|
| **Windows** | `windows-build-tools` (`npm i -g windows-build-tools`) or Visual Studio Build Tools |
| **macOS** | Xcode Command Line Tools (`xcode-select --install`) |
| **Linux** | `build-essential` + `python3` (`apt install build-essential python3`) |

Node.js **20.x – 26.x** recommended.

```bash
npm install
npm run dev
```

> **Troubleshooting:** If `npm install` fails on non-Windows platforms with `node-gyp` / `glob` / `tar` errors, ensure `node-gyp` is available:
> ```bash
> npm install -g node-gyp
> ```

## Package

打包需要 Electron 二进制文件（electron-builder 用它来构建 exe）。支持两种方式：

### 在线打包（自动下载）

```bash
npm run package
```

### 离线打包（使用本地缓存）

先将 Electron 二进制 zip 下载到 `resources/` 目录，然后离线打包：

```bash
# 下载（选一个源）
# 官方源：
#   https://github.com/electron/electron/releases/download/v35.7.5/electron-v35.7.5-win32-x64.zip
# 国内镜像：
#   https://npmmirror.com/mirrors/electron/v35.7.5/electron-v35.7.5-win32-x64.zip

# 放入 resources/ 目录后执行
just package-local
```

You can also run individual packaging commands via `just` — see [justfile](justfile) for all targets.

### Download Electron binary

Download from either source:

| Source | URL |
|--------|-----|
| Official | `https://github.com/electron/electron/releases/download/v35.7.5/electron-v35.7.5-win32-x64.zip` |
| Mirror (CN) | `https://npmmirror.com/mirrors/electron/v35.7.5/electron-v35.7.5-win32-x64.zip` |

Place it under `resources/`:

```
resources/electron-v35.7.5-win32-x64.zip
```

This file is git-ignored — keep it locally for offline packaging.
