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
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 320, height: 240 },
      })
      return sources
    } catch (error) {
      console.error('Failed to get screen sources:', error)
      // Return empty array instead of throwing - let the UI handle it
      return []
    }
  }
}

export const recordingService = new RecordingService()

