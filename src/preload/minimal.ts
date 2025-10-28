console.log('MINIMAL PRELOAD SCRIPT LOADED!')

// Minimal preload script to test if this works
try {
  const { contextBridge, ipcRenderer } = require('electron')
  console.log('Electron modules loaded:', typeof contextBridge, typeof ipcRenderer)
  
  if (contextBridge && ipcRenderer) {
    const electronAPI = {
      ipc: {
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        on: (channel, callback) => {
          ipcRenderer.on(channel, callback)
          return () => ipcRenderer.removeListener(channel, callback)
        }
      },
      // AI Service methods
      checkAIConfiguration: () => ipcRenderer.invoke('checkAIConfiguration'),
      setAIApiKey: (apiKey) => ipcRenderer.invoke('setAIApiKey', apiKey),
      testAIConnection: () => ipcRenderer.invoke('testAIConnection'),
      generateCaptions: (audioFilePath) => ipcRenderer.invoke('generateCaptions', audioFilePath),
      analyzeVideoContent: (videoFilePath) => ipcRenderer.invoke('analyzeVideoContent', videoFilePath),
      generateTextOverlays: (description, duration) => ipcRenderer.invoke('generateTextOverlays', description, duration),
      suggestColorCorrection: (videoFilePath) => ipcRenderer.invoke('suggestColorCorrection', videoFilePath),
      suggestExportSettings: (videoInfo) => ipcRenderer.invoke('suggestExportSettings', videoInfo),
      generateMusicSuggestions: (description, duration) => ipcRenderer.invoke('generateMusicSuggestions', description, duration)
    }
    
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
    console.log('MINIMAL PRELOAD: Successfully exposed electronAPI!')
  } else {
    console.log('MINIMAL PRELOAD: Electron modules not available')
  }
} catch (error) {
  console.log('MINIMAL PRELOAD: Error:', error)
}
