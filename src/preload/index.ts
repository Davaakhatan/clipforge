console.log('Preload script starting...')

try {
  const { contextBridge, ipcRenderer } = require('electron')
  console.log('contextBridge available:', typeof contextBridge)
  console.log('ipcRenderer available:', typeof ipcRenderer)

  interface ElectronAPI {
    ipc: {
      invoke: (channel: string, ...args: any[]) => Promise<any>
      on: (channel: string, callback: (...args: any[]) => void) => () => void
    }
    // AI Service methods
    checkAIConfiguration: () => Promise<{ isConfigured: boolean }>
    setAIApiKey: (apiKey: string) => Promise<{ success: boolean }>
    testAIConnection: () => Promise<{ success: boolean; error?: string; response?: any }>
    generateCaptions: (audioFilePath: string) => Promise<any[]>
    analyzeVideoContent: (videoFilePath: string) => Promise<any[]>
    generateTextOverlays: (description: string, duration: number) => Promise<any[]>
    suggestColorCorrection: (videoFilePath: string) => Promise<any>
    suggestExportSettings: (videoInfo: any) => Promise<any>
    generateMusicSuggestions: (description: string, duration: number) => Promise<string[]>
    enhanceAudioCleanup: (audioOrVideoFilePath: string, options: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
    automateWorkflow: (videoFilePath: string, tasks: string[]) => Promise<{ success: boolean; results?: any[]; error?: string }>
  }

  const electronAPI: ElectronAPI = {
    ipc: {
      invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
      on: (channel: string, callback: (...args: any[]) => void) => {
        ipcRenderer.on(channel, callback)
        return () => ipcRenderer.removeListener(channel, callback)
      },
    },
    // AI Service methods
    checkAIConfiguration: () => ipcRenderer.invoke('checkAIConfiguration'),
    setAIApiKey: (apiKey: string) => ipcRenderer.invoke('setAIApiKey', apiKey),
    testAIConnection: () => ipcRenderer.invoke('testAIConnection'),
    generateCaptions: (audioFilePath: string) => ipcRenderer.invoke('generateCaptions', audioFilePath),
    analyzeVideoContent: (videoFilePath: string) => ipcRenderer.invoke('analyzeVideoContent', videoFilePath),
    generateTextOverlays: (description: string, duration: number) => ipcRenderer.invoke('generateTextOverlays', description, duration),
    suggestColorCorrection: (videoFilePath: string) => ipcRenderer.invoke('suggestColorCorrection', videoFilePath),
    suggestExportSettings: (videoInfo: any) => ipcRenderer.invoke('suggestExportSettings', videoInfo),
    generateMusicSuggestions: (description: string, duration: number) => ipcRenderer.invoke('generateMusicSuggestions', description, duration),
    enhanceAudioCleanup: (audioOrVideoFilePath: string, options: any) => ipcRenderer.invoke('enhanceAudioCleanup', audioOrVideoFilePath, options),
    automateWorkflow: (videoFilePath: string, tasks: string[]) => ipcRenderer.invoke('automateWorkflow', videoFilePath, tasks),
  }

  console.log('Preload: Exposing electronAPI with methods:', Object.keys(electronAPI))
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
    console.log('Preload: Successfully exposed electronAPI to window')
  } catch (error) {
    console.error('Preload: Failed to expose electronAPI:', error)
  }
} catch (error) {
  console.error('Preload: Critical error in preload script:', error)
}
