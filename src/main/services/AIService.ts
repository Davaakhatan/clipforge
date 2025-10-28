import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

class AIService {
  private openai: OpenAI | null = null
  private apiKey: string | null = null
  private configPath: string

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'ai-config.json')
    this.loadConfig()
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'))
        this.apiKey = config.apiKey
        if (this.apiKey) {
          this.openai = new OpenAI({
            apiKey: this.apiKey,
          })
        }
      }
    } catch (error) {
      console.error('Failed to load AI config:', error)
    }
  }

  private saveConfig(): void {
    try {
      const config = { apiKey: this.apiKey }
      fs.writeFileSync(this.configPath, JSON.stringify(config), 'utf-8')
    } catch (error) {
      console.error('Failed to save AI config:', error)
    }
  }

  setApiKey(apiKey: string): void {
    if (apiKey.trim() === '') {
      // Clear the API key
      this.apiKey = null
      this.openai = null
      this.saveConfig()
      return
    }

    this.apiKey = apiKey
    this.openai = new OpenAI({
      apiKey: apiKey,
    })
    this.saveConfig()
  }

  isConfigured(): boolean {
    return this.openai !== null && this.apiKey !== null
  }

  async testConnection(): Promise<{ success: boolean; error?: string; response?: any }> {
    if (!this.openai) {
      return { success: false, error: 'OpenAI client not initialized' }
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello, this is a test message.' }],
        max_tokens: 10,
      })
      
      return { success: true, response: response.choices[0]?.message?.content }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async generateCaptions(audioFilePath: string): Promise<string[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized')
    }

    // For now, return mock captions
    // In a real implementation, you would use Whisper API
    return [
      'Welcome to our video presentation.',
      'Today we will discuss important topics.',
      'Let me show you some examples.',
    ]
  }

  async analyzeVideoContent(videoFilePath: string): Promise<any[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized')
    }

    // Mock analysis for now
    return [
      { timestamp: '00:00', type: 'scene_change', description: 'Opening scene' },
      { timestamp: '00:15', type: 'highlight', description: 'Key moment' },
      { timestamp: '00:30', type: 'scene_change', description: 'Transition' },
    ]
  }

  async generateTextOverlays(description: string, duration: number): Promise<any[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized')
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `Generate 3-5 text overlays for a ${duration} second video about: ${description}. Return as JSON array with text, startTime, endTime, and style properties.`,
          },
        ],
        max_tokens: 500,
      })

      const content = response.choices[0]?.message?.content
      if (content) {
        return JSON.parse(content)
      }
      return []
    } catch (error) {
      console.error('Error generating text overlays:', error)
      return []
    }
  }

  async suggestColorCorrection(videoFilePath: string): Promise<any> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized')
    }

    // Mock color correction suggestions
    return {
      brightness: 0.1,
      contrast: 0.05,
      saturation: 0.0,
      temperature: 0.0,
    }
  }

  async suggestExportSettings(videoInfo: any): Promise<any> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized')
    }

    // Mock export settings suggestions
    return {
      quality: 'high',
      resolution: '1080p',
      format: 'mp4',
      bitrate: '5000k',
    }
  }

  async generateMusicSuggestions(description: string, duration: number): Promise<string[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized')
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `Suggest 5 music tracks for a ${duration} second video about: ${description}. Return as JSON array of track names.`,
          },
        ],
        max_tokens: 200,
      })

      const content = response.choices[0]?.message?.content
      if (content) {
        return JSON.parse(content)
      }
      return []
    } catch (error) {
      console.error('Error generating music suggestions:', error)
      return []
    }
  }
}

export const aiService = new AIService()