import React, { useState } from 'react'
import { useProject } from '../context/ProjectContext'

interface ExportSettings {
  quality: 'high' | 'medium' | 'low'
  resolution: '720p' | '1080p' | '4K'
  format: 'mp4' | 'mov'
}

interface ExportPreset {
  name: string
  settings: ExportSettings
}

const EXPORT_PRESETS: ExportPreset[] = [
  {
    name: 'YouTube',
    settings: { quality: 'high', resolution: '1080p', format: 'mp4' }
  },
  {
    name: 'Instagram',
    settings: { quality: 'high', resolution: '1080p', format: 'mp4' }
  },
  {
    name: 'TikTok',
    settings: { quality: 'high', resolution: '1080p', format: 'mp4' }
  }
]

const Header: React.FC = () => {
  const { state, undo, redo, canUndo, canRedo, saveProject, loadProject, newProject, currentProjectPath, hasUnsavedChanges } = useProject()
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    quality: 'high',
    resolution: '1080p',
    format: 'mp4',
  })

  const handleExportClick = () => {
    if (state.clips.length === 0) {
      alert('No clips to export!')
      return
    }
    setShowExportDialog(true)
  }

  const handleExport = async () => {
    setShowExportDialog(false)
    
    try {
      setExporting(true)
      setExportProgress(0)

      // Get output path
      const outputPath = await window.electronAPI?.ipc?.invoke('showSaveDialog')
      if (!outputPath) {
        setExporting(false)
        return
      }

      // Listen for progress updates
      const cleanup = window.electronAPI?.ipc?.on('exportProgress', (progress: number) => {
        setExportProgress(progress)
      })

      // Prepare clips data
      const clips = state.tracks.flatMap(track => 
        track.clips.map(clip => ({
          filePath: clip.filePath,
          offset: clip.offset,
          duration: clip.duration,
          startTime: clip.startTime,
          endTime: clip.endTime,
          speed: clip.speed,
          volume: clip.volume,
          brightness: clip.brightness || 0,
          contrast: clip.contrast || 0,
          saturation: clip.saturation || 0,
          rotation: clip.rotation || 0,
          flipHorizontal: clip.flipHorizontal || false,
          flipVertical: clip.flipVertical || false,
          fadeIn: clip.fadeIn || 0,
          fadeOut: clip.fadeOut || 0,
          transitionIn: clip.transitionIn,
          transitionOut: clip.transitionOut,
          transitionDuration: clip.transitionDuration || 500,
        }))
      )

      // Export with settings
      const result = await window.electronAPI?.ipc?.invoke('exportVideo', { 
        clips, 
        outputPath, 
        settings: exportSettings 
      })
      
      if (cleanup) cleanup()
      
      if (result.success) {
        alert('Video exported successfully!')
      } else {
        alert(`Export failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed: ' + error.message)
    } finally {
      setExporting(false)
    }
  }
  const handleMinimize = () => {
    window.electronAPI?.ipc?.invoke('minimizeWindow')
  }

  const handleMaximize = () => {
    window.electronAPI?.ipc?.invoke('maximizeWindow')
  }

  const handleClose = () => {
    window.electronAPI?.ipc?.invoke('closeWindow')
  }

  const handleSave = async () => {
    const result = await saveProject()
    if (result.success) {
      // Success - could show a toast notification
    } else if (result.error && result.error !== 'No save path selected') {
      alert(`Failed to save project: ${result.error}`)
    }
  }

  const handleLoad = async () => {
    const projectPath = await window.electronAPI?.showOpenProjectDialog()
    if (projectPath) {
      const result = await loadProject(projectPath)
      if (!result.success) {
        alert(`Failed to load project: ${result.error}`)
      }
    }
  }

  const handleNew = async () => {
    await newProject()
  }

  return (
    <>
      {/* Export Settings Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center" onClick={() => setShowExportDialog(false)}>
          <div className="bg-gradient-to-br from-dark to-gray-900 border border-gray-700 rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">Export Settings</h3>
              <p className="text-gray-400">Customize your video export</p>
            </div>

            <div className="space-y-5">
              {/* Quality */}
              <div>
                <label className="text-sm font-bold text-gray-300 mb-3 block flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  Quality
                </label>
                <select
                  value={exportSettings.quality}
                  onChange={(e) => setExportSettings({ ...exportSettings, quality: e.target.value as any })}
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl text-white font-medium hover:border-blue-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="high">🏆 High (Best Quality)</option>
                  <option value="medium">⚖️ Medium (Balanced)</option>
                  <option value="low">💾 Low (Smaller File)</option>
                </select>
              </div>

              {/* Resolution */}
              <div>
                <label className="text-sm font-bold text-gray-300 mb-3 block flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                    <path fillRule="evenodd" d="M1 7h18v10a2 2 0 01-2 2H3a2 2 0 01-2-2V7zm2 6h14V9H3v4z" clipRule="evenodd" />
                  </svg>
                  Resolution
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: '720p', label: '720p HD', desc: 'HD' },
                    { value: '1080p', label: '1080p', desc: 'Full HD' },
                    { value: '4K', label: '4K', desc: 'Ultra HD' },
                  ].map(res => (
                    <button
                      key={res.value}
                      onClick={() => setExportSettings({ ...exportSettings, resolution: res.value as any })}
                      className={`px-4 py-3 rounded-xl border-2 transition-all ${
                        exportSettings.resolution === res.value
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-gray-700 bg-gray-800/80 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-bold">{res.label}</div>
                      <div className="text-xs opacity-75">{res.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Presets */}
              <div>
                <label className="text-sm font-bold text-gray-300 mb-3 block flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Quick Presets
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {EXPORT_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => setExportSettings(preset.settings)}
                      className={`px-4 py-3 rounded-xl border-2 transition-all ${
                        exportSettings.quality === preset.settings.quality &&
                        exportSettings.resolution === preset.settings.resolution &&
                        exportSettings.format === preset.settings.format
                          ? 'border-yellow-500 bg-yellow-500/10 text-white'
                          : 'border-gray-700 bg-gray-800/80 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-bold">{preset.name}</div>
                      <div className="text-xs opacity-75 mt-1">{preset.settings.resolution}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="text-sm font-bold text-gray-300 mb-3 block flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2h-1.528A6 6 0 004 9.528V4z" />
                    <path fillRule="evenodd" d="M6 10a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2v-3a2 2 0 00-2-2H6zm4 2v3h3v-3h-3z" clipRule="evenodd" />
                  </svg>
                  Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'mp4', label: 'MP4', desc: 'Recommended', icon: '📁' },
                    { value: 'mov', label: 'MOV', desc: 'Apple', icon: '🍎' },
                  ].map(fmt => (
                    <button
                      key={fmt.value}
                      onClick={() => setExportSettings({ ...exportSettings, format: fmt.value as any })}
                      className={`px-4 py-3 rounded-xl border-2 transition-all ${
                        exportSettings.format === fmt.value
                          ? 'border-purple-500 bg-purple-500/10 text-white'
                          : 'border-gray-700 bg-gray-800/80 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-bold text-lg mb-1">{fmt.icon}</div>
                      <div className="font-semibold">{fmt.label}</div>
                      <div className="text-xs opacity-75">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-700">
              <button
                onClick={() => setShowExportDialog(false)}
                className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-semibold transition-all hover:shadow-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl text-white font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Progress Modal */}
      {exporting && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
          <div className="bg-dark border border-gray-700 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v8.262a1 1 0 001.555.832l3.197-2.132a1 1 0 00.445-.832V11a1 1 0 00-.445-.832z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Exporting Video</h3>
              <p className="text-gray-400">Processing your timeline...</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 flex items-center justify-end pr-2"
                  style={{ width: `${exportProgress}%` }}
                >
                  <span className="text-xs font-bold text-white">{Math.round(exportProgress)}%</span>
                </div>
              </div>
              <p className="text-center text-sm text-gray-400 mt-2">
                {exportProgress < 30 && 'Analyzing clips...'}
                {exportProgress >= 30 && exportProgress < 60 && 'Processing video...'}
                {exportProgress >= 60 && exportProgress < 90 && 'Applying effects...'}
                {exportProgress >= 90 && 'Finalizing export...'}
              </p>
            </div>

            <div className="flex items-center justify-center text-gray-500 text-sm">
              <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>This may take a few moments</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="h-10 bg-dark border-b border-gray-800/50 flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-white text-xs font-semibold">
              CF
            </div>
            <span className="text-sm font-medium text-gray-300">ClipForge</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={handleNew}
              className="px-2 py-1 bg-gray-800/30 hover:bg-gray-700/50 rounded text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 border border-gray-700/30"
              title="New Project (Cmd/Ctrl+N)"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>New</span>
            </button>
            <button
              onClick={handleLoad}
              className="px-2 py-1 bg-gray-800/30 hover:bg-gray-700/50 rounded text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 border border-gray-700/30"
              title="Open Project (Cmd/Ctrl+O)"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>Open</span>
            </button>
            <button
              onClick={handleSave}
              className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1.5 border ${
                hasUnsavedChanges 
                  ? 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-400' 
                  : 'bg-gray-800/30 hover:bg-gray-700/50 border-gray-700/30 text-gray-400 hover:text-white'
              }`}
              title="Save Project (Cmd/Ctrl+S)"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>{hasUnsavedChanges ? 'Save *' : 'Save'}</span>
            </button>
          </div>

          <div className="w-px h-4 bg-gray-700/50" />
          
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="px-2 py-1 bg-gray-800/30 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs text-gray-400 hover:text-white transition-colors border border-gray-700/30"
              title="Undo (Cmd/Ctrl+Z)"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="px-2 py-1 bg-gray-800/30 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs text-gray-400 hover:text-white transition-colors border border-gray-700/30"
              title="Redo (Cmd/Ctrl+Shift+Z)"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8-8v2m8 8l-6-6m6 6l-6 6" />
              </svg>
            </button>
          </div>

          <div className="w-px h-4 bg-gray-700/50" />
          
          <button
            onClick={handleExportClick}
            disabled={exporting || state.clips.length === 0}
            className="px-2.5 py-1 bg-accent/90 hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs font-medium text-white transition-colors"
          >
            Export
          </button>
        </div>

        <div className="flex items-center">
          <button
            onClick={handleMinimize}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-800/50 rounded transition-colors text-gray-400 hover:text-white"
            aria-label="Minimize"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-800/50 rounded transition-colors text-gray-400 hover:text-white"
            aria-label="Maximize"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded transition-colors text-gray-400 hover:text-red-400"
            aria-label="Close"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}

export default Header
