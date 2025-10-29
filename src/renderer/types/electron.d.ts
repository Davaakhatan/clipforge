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

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}