import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import { ffmpegService } from './services/FFmpegService'
import { recordingService } from './services/RecordingService'
import { aiService } from './services/AIService'
import { projectService } from './services/ProjectService'

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
  // Set app details for macOS permissions
  app.setName('ClipForge')
  app.setAsDefaultProtocolClient('clipforge')
  
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

// Audio processing handlers
ipcMain.handle('importAudio', async (event, { filePath }) => {
  try {
    const metadata = await ffmpegService.getAudioMetadata(filePath)
    
    return { success: true, metadata }
  } catch (error) {
    console.error('Error importing audio:', error)
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

ipcMain.handle('showOpenDialogAudio', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Audio',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg'] },
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

ipcMain.handle('saveRecording', async (event, data) => {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const os = await import('os')
    
    const fileName = data.fileName || `clipforge-record-${Date.now()}.webm`
    const filePath = path.join(os.tmpdir(), fileName)
    
    await fs.writeFile(filePath, Buffer.from(data.buffer))
    
    return filePath
  } catch (error) {
    console.error('Error saving recording:', error)
    throw error
  }
})

ipcMain.handle('restoreWindow', async () => {
  if (mainWindow) {
    mainWindow.restore()
  }
})

// AI Service IPC handlers
ipcMain.handle('checkAIConfiguration', async () => {
  console.log('checkAIConfiguration handler called')
  const isConfigured = aiService.isConfigured()
  console.log('AI configured:', isConfigured)
  return { isConfigured }
})

ipcMain.handle('setAIApiKey', async (event, apiKey: string) => {
  console.log('setAIApiKey handler called, key length:', apiKey.length)
  try {
    aiService.setApiKey(apiKey)
    console.log('API key set successfully')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to set API key:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('testAIConnection', async () => {
  console.log('testAIConnection handler called')
  return await aiService.testConnection()
})

ipcMain.handle('generateCaptions', async (event, audioFilePath: string) => {
  return await aiService.generateCaptions(audioFilePath)
})

ipcMain.handle('analyzeVideoContent', async (event, videoFilePath: string) => {
  return await aiService.analyzeVideoContent(videoFilePath)
})

ipcMain.handle('generateTextOverlays', async (event, description: string, duration: number) => {
  return await aiService.generateTextOverlays(description, duration)
})

ipcMain.handle('suggestColorCorrection', async (event, videoFilePath: string) => {
  return await aiService.suggestColorCorrection(videoFilePath)
})

ipcMain.handle('suggestExportSettings', async (event, videoInfo: any) => {
  return await aiService.suggestExportSettings(videoInfo)
})

ipcMain.handle('generateMusicSuggestions', async (event, description: string, duration: number) => {
  return await aiService.generateMusicSuggestions(description, duration)
})

ipcMain.handle('enhanceAudioCleanup', async (event, audioOrVideoFilePath: string, options: any) => {
  return await aiService.enhanceAudioCleanup(audioOrVideoFilePath, options)
})

ipcMain.handle('automateWorkflow', async (event, videoFilePath: string, tasks: string[]) => {
  return await aiService.automateWorkflow(videoFilePath, tasks)
})

// Project Save/Load handlers
ipcMain.handle('saveProject', async (event, { projectPath, projectData }) => {
  try {
    await projectService.saveProject(projectPath, projectData)
    await projectService.addToRecentProjects(projectPath)
    return { success: true }
  } catch (error: any) {
    console.error('Error saving project:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('loadProject', async (event, projectPath: string) => {
  try {
    const savedProject = await projectService.loadProject(projectPath)
    projectService.setCurrentProjectPath(projectPath)
    await projectService.addToRecentProjects(projectPath)
    return { success: true, project: savedProject }
  } catch (error: any) {
    console.error('Error loading project:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('showSaveProjectDialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Project',
    defaultPath: 'untitled.clipforge',
    filters: [
      { name: 'ClipForge Project', extensions: ['clipforge'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  
  if (!result.canceled && result.filePath) {
    return result.filePath
  }
  return null
})

ipcMain.handle('showOpenProjectDialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Project',
    properties: ['openFile'],
    filters: [
      { name: 'ClipForge Project', extensions: ['clipforge'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('getRecentProjects', async () => {
  return await projectService.getRecentProjects()
})

ipcMain.handle('loadAutoSave', async () => {
  const autoSave = await projectService.loadAutoSave()
  if (autoSave) {
    return { success: true, project: autoSave }
  }
  return { success: false }
})

ipcMain.handle('getCurrentProjectPath', async () => {
  return projectService.getCurrentProjectPath()
})

ipcMain.handle('setCurrentProjectPath', async (event, projectPath: string | null) => {
  projectService.setCurrentProjectPath(projectPath)
})

ipcMain.handle('startAutoSave', async (event, getProjectData: () => any) => {
  // Since we can't pass functions through IPC, we'll handle auto-save differently
  // The renderer will periodically call an auto-save endpoint
  return { success: true }
})

ipcMain.handle('performAutoSave', async (event, projectData) => {
  try {
    await projectService.autoSave(projectData)
    return { success: true }
  } catch (error: any) {
    console.error('Auto-save failed:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('clearAutoSave', async () => {
  await projectService.clearAutoSave()
  return { success: true }
})
