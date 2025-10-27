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
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 320, height: 240 },
      })
      console.log('Screen sources retrieved:', sources.length)
      
      // Log each source for debugging
      sources.forEach(source => {
        console.log(`Source: ${source.name}, ID: ${source.id}, DisplayID: ${source.display_id}`)
      })
      
      return sources
    } catch (error) {
      console.error('Failed to get screen sources:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      // Return empty array instead of throwing - let the UI handle it
      return []
    }
  }
}

export const recordingService = new RecordingService()

