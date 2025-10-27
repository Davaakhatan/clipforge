import { desktopCapturer, DesktopCapturerSource } from 'electron'

export interface RecordingOptions {
  sourceId: string
  audio: boolean
  savePath: string
}

class RecordingService {
  /**
   * Get available screen sources for desktop capturing
   */
  async getScreenSources() {
    try {
      console.log('Getting screen sources...')
      
      // Try to get sources - macOS will show permission dialog if needed
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'], // Screen first
        thumbnailSize: { width: 320, height: 240 },
      })
      
      console.log('Screen sources retrieved:', sources.length)
      
      // Log each source for debugging
      sources.forEach(source => {
        console.log(`Source: ${source.name}, ID: ${source.id}, DisplayID: ${source.display_id}`)
      })
      
      return sources
    } catch (error: any) {
      console.error('Failed to get screen sources:', error)
      
      // Check if it's a permission issue
      if (error.message && error.message.includes('Failed to get sources')) {
        console.error('Permission denied. User needs to grant screen recording permission.')
        console.error('To fix: Open System Settings > Privacy & Security > Screen Recording')
        console.error('Enable "ClipForge" or "Electron" (development mode)')
      }
      
      return []
    }
  }
}

export const recordingService = new RecordingService()

