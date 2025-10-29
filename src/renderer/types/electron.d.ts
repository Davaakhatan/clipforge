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
  // Project Save/Load methods
  saveProject: (projectPath: string, projectData: any) => Promise<{ success: boolean; error?: string }>
  loadProject: (projectPath: string) => Promise<{ success: boolean; project?: any; error?: string }>
  showSaveProjectDialog: () => Promise<string | null>
  showOpenProjectDialog: () => Promise<string | null>
  getRecentProjects: () => Promise<Array<{ path: string; name: string; modified: string }>>
  loadAutoSave: () => Promise<{ success: boolean; project?: any }>
  getCurrentProjectPath: () => Promise<string | null>
  setCurrentProjectPath: (projectPath: string | null) => Promise<void>
  performAutoSave: (projectData: any) => Promise<{ success: boolean; error?: string }>
  clearAutoSave: () => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}