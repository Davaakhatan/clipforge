import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import { ffmpegService } from './services/FFmpegService'
import { recordingService } from './services/RecordingService'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Allow loading local file:// resources
      enableBlinkFeatures: 'ScreenCapture', // Enable screen capture API
      permissions: ['accessibility-events', 'clipboard-read'], // Request necessary permissions
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0a',
  })

  // Load from Vite dev server in development
  if (process.env.NODE_ENV === 'development') {
    // electron-vite sets this environment variable
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devServerUrl)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('did-finish-load', () => {
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers
ipcMain.handle('getAppVersion', () => {
  return app.getVersion()
})

ipcMain.handle('minimizeWindow', () => {
  if (mainWindow) {
    mainWindow.minimize()
  }
})

ipcMain.handle('maximizeWindow', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.handle('closeWindow', () => {
  if (mainWindow) {
    mainWindow.close()
  }
})

// Video processing handlers
ipcMain.handle('importVideo', async (event, { filePath }) => {
  try {
    const metadata = await ffmpegService.getMetadata(filePath)
    const thumbnailPath = path.join(app.getPath('temp'), `${path.basename(filePath)}.jpg`)
    await ffmpegService.generateThumbnail(filePath, thumbnailPath)
    
    return { success: true, metadata, thumbnailPath }
  } catch (error) {
    console.error('Error importing video:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('exportVideo', async (event, { clips, outputPath }) => {
  try {
    await ffmpegService.exportProject(clips, outputPath, (progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('exportProgress', progress)
      }
    })
    
    return { success: true, outputPath }
  } catch (error) {
    console.error('Error exporting video:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('showSaveDialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Video',
    defaultPath: 'export.mp4',
    filters: [
      { name: 'Video Files', extensions: ['mp4'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  
  if (!result.canceled) {
    return result.filePath
  }
  return null
})

ipcMain.handle('showOpenDialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Video',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  
  if (!result.canceled) {
    return result.filePaths
  }
  return []
})

// Recording handlers
ipcMain.handle('getScreenSources', async () => {
  try {
    const sources = await recordingService.getScreenSources()
    
    if (sources.length === 0) {
      console.warn('No screen sources available. User may need to grant permissions.')
    }
    
    return sources
  } catch (error) {
    console.error('Error in getScreenSources handler:', error)
    return []
  }
})

ipcMain.handle('openScreenRecordingSettings', async () => {
  // Open System Settings to Screen Recording section
  shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
})
