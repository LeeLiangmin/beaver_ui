import { app, BrowserWindow } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc'
import { closeDb } from './services/db'

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')

const iconPath = isDev
  ? path.join(__dirname, '../../../resources/png/icon_256x256.png')
  : path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'png', 'icon_256x256.png')

if (isDev) {
  try { require('electron-reloader')(module, { watchRenderer: false }) } catch {}
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#f5f5f5',
    title: 'Beaver',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  closeDb()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
