import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

export interface SavedProject {
  version: string
  metadata: {
    name: string
    created: string
    modified: string
    clipForgeVersion: string
  }
  project: {
    tracks: any[]
    audioTracks: any[]
    clips: any[]
    audioClips: any[]
    masterVolume: number
    masterMute: boolean
    zoom: number
  }
  // Store file paths as-is (will need to handle missing files on load)
  filePaths: {
    videoClips: Array<{ clipId: string; filePath: string }>
    audioClips: Array<{ clipId: string; filePath: string }>
  }
}

class ProjectService {
  private readonly PROJECT_VERSION = '1.0.0'
  private readonly AUTO_SAVE_INTERVAL = 5 * 60 * 1000 // 5 minutes
  private autoSaveTimer: NodeJS.Timeout | null = null
  private currentProjectPath: string | null = null
  private lastAutoSave: Date | null = null

  /**
   * Save project to file
   */
  async saveProject(projectPath: string, projectData: SavedProject['project']): Promise<void> {
    const savedProject: SavedProject = {
      version: this.PROJECT_VERSION,
      metadata: {
        name: path.basename(projectPath, '.clipforge'),
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        clipForgeVersion: app.getVersion() || '1.0.0',
      },
      project: {
        tracks: projectData.tracks,
        audioTracks: projectData.audioTracks,
        clips: projectData.clips.map(clip => ({
          ...clip,
          // Don't save filePath in clip, store separately
        })),
        audioClips: projectData.audioClips.map(clip => ({
          ...clip,
          // Don't save filePath in clip, store separately
        })),
        masterVolume: projectData.masterVolume,
        masterMute: projectData.masterMute,
        zoom: projectData.zoom,
      },
      filePaths: {
        videoClips: projectData.clips.map(clip => ({
          clipId: clip.id,
          filePath: clip.filePath,
        })),
        audioClips: projectData.audioClips.map(clip => ({
          clipId: clip.id,
          filePath: clip.filePath,
        })),
      },
    }

    await fs.writeFile(projectPath, JSON.stringify(savedProject, null, 2), 'utf-8')
    this.currentProjectPath = projectPath
  }

  /**
   * Load project from file
   */
  async loadProject(projectPath: string): Promise<SavedProject> {
    const fileContent = await fs.readFile(projectPath, 'utf-8')
    const savedProject: SavedProject = JSON.parse(fileContent)

    // Restore file paths back into clips
    const clipsWithPaths = savedProject.project.clips.map((clip: any) => {
      const filePathData = savedProject.filePaths.videoClips.find(fp => fp.clipId === clip.id)
      return {
        ...clip,
        filePath: filePathData?.filePath || '',
      }
    })

    const audioClipsWithPaths = savedProject.project.audioClips.map((clip: any) => {
      const filePathData = savedProject.filePaths.audioClips.find(fp => fp.clipId === clip.id)
      return {
        ...clip,
        filePath: filePathData?.filePath || '',
      }
    })

    // Return with restored file paths
    return {
      ...savedProject,
      project: {
        ...savedProject.project,
        clips: clipsWithPaths,
        audioClips: audioClipsWithPaths,
      },
    }
  }

  /**
   * Get auto-save path
   */
  getAutoSavePath(): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'auto-save', 'autosave.clipforge')
  }

  /**
   * Auto-save project to temp location
   */
  async autoSave(projectData: SavedProject['project']): Promise<void> {
    const autoSavePath = this.getAutoSavePath()
    const autoSaveDir = path.dirname(autoSavePath)
    
    // Ensure directory exists
    await fs.mkdir(autoSaveDir, { recursive: true })
    
    await this.saveProject(autoSavePath, projectData)
    this.lastAutoSave = new Date()
  }

  /**
   * Check if auto-save exists and load it
   */
  async loadAutoSave(): Promise<SavedProject | null> {
    try {
      const autoSavePath = this.getAutoSavePath()
      const stats = await fs.stat(autoSavePath)
      
      // Only load if auto-save is less than 7 days old
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
      if (stats.mtimeMs < sevenDaysAgo) {
        return null
      }

      return await this.loadProject(autoSavePath)
    } catch (error) {
      return null
    }
  }

  /**
   * Clear auto-save
   */
  async clearAutoSave(): Promise<void> {
    try {
      const autoSavePath = this.getAutoSavePath()
      await fs.unlink(autoSavePath)
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Start auto-save timer
   */
  startAutoSave(projectData: () => SavedProject['project']): void {
    this.stopAutoSave()
    this.autoSaveTimer = setInterval(async () => {
      try {
        await this.autoSave(projectData())
        console.log('Auto-saved project')
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, this.AUTO_SAVE_INTERVAL)
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }

  /**
   * Get current project path
   */
  getCurrentProjectPath(): string | null {
    return this.currentProjectPath
  }

  /**
   * Set current project path
   */
  setCurrentProjectPath(projectPath: string | null): void {
    this.currentProjectPath = projectPath
  }

  /**
   * Get recent projects (from userData/recent-projects.json)
   */
  async getRecentProjects(): Promise<Array<{ path: string; name: string; modified: string }>> {
    try {
      const recentProjectsPath = path.join(app.getPath('userData'), 'recent-projects.json')
      const content = await fs.readFile(recentProjectsPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return []
    }
  }

  /**
   * Add project to recent projects
   */
  async addToRecentProjects(projectPath: string): Promise<void> {
    try {
      const recentProjects = await this.getRecentProjects()
      const projectName = path.basename(projectPath, '.clipforge')
      const stats = await fs.stat(projectPath)
      
      // Remove if already exists
      const filtered = recentProjects.filter(p => p.path !== projectPath)
      
      // Add to beginning
      filtered.unshift({
        path: projectPath,
        name: projectName,
        modified: stats.mtime.toISOString(),
      })

      // Keep only last 10
      const limited = filtered.slice(0, 10)

      const recentProjectsPath = path.join(app.getPath('userData'), 'recent-projects.json')
      await fs.writeFile(recentProjectsPath, JSON.stringify(limited, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to update recent projects:', error)
    }
  }
}

export const projectService = new ProjectService()

