import React, { useState } from 'react'
import { useProject } from '../context/ProjectContext'

interface ExportSettings {
  quality: 'high' | 'medium' | 'low'
  resolution: '720p' | '1080p' | '4K'
  format: 'mp4' | 'mov'
}

const Header: React.FC = () => {
  const { state, undo, redo, canUndo, canRedo } = useProject()
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
      const outputPath = await window.electron?.ipc?.invoke('showSaveDialog')
      if (!outputPath) {
        setExporting(false)
        return
      }

      // Listen for progress updates
      const cleanup = window.electron?.ipc?.on('exportProgress', (progress: number) => {
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
          fadeIn: clip.fadeIn || 0,
          fadeOut: clip.fadeOut || 0,
          transitionIn: clip.transitionIn,
          transitionOut: clip.transitionOut,
          transitionDuration: clip.transitionDuration || 500,
        }))
      )

      // Export with settings
      const result = await window.electron?.ipc?.invoke('exportVideo', { 
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
    window.electron?.ipc?.invoke('minimizeWindow')
  }

  const handleMaximize = () => {
    window.electron?.ipc?.invoke('maximizeWindow')
  }

  const handleClose = () => {
    window.electron?.ipc?.invoke('closeWindow')
  }

  return (
    <>
      {/* Export Settings Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
          <div className="bg-dark border border-gray-700 rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Export Settings</h3>
              <p className="text-gray-400 text-sm">Choose your export options</p>
            </div>

            <div className="space-y-4">
              {/* Quality */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Quality</label>
                <select
                  value={exportSettings.quality}
                  onChange={(e) => setExportSettings({ ...exportSettings, quality: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                >
                  <option value="high">High (Best Quality)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="low">Low (Smaller File)</option>
                </select>
              </div>

              {/* Resolution */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Resolution</label>
                <select
                  value={exportSettings.resolution}
                  onChange={(e) => setExportSettings({ ...exportSettings, resolution: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                >
                  <option value="720p">720p HD</option>
                  <option value="1080p">1080p Full HD</option>
                  <option value="4K">4K Ultra HD</option>
                </select>
              </div>

              {/* Format */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Format</label>
                <select
                  value={exportSettings.format}
                  onChange={(e) => setExportSettings({ ...exportSettings, format: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                >
                  <option value="mp4">MP4 (Recommended)</option>
                  <option value="mov">MOV (Apple)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowExportDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-semibold transition-all shadow-lg"
              >
                Export
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
      <div className="h-12 bg-dark border-b border-gray-800 flex items-center justify-between pl-4 pr-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded flex items-center justify-center text-white font-bold">
            CF
          </div>
          <span className="text-lg font-semibold">ClipForge</span>
          
          <div className="ml-8 flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
              title="Undo (Cmd/Ctrl + Z)"
            >
              ↶ Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
              title="Redo (Cmd/Ctrl + Shift + Z)"
            >
              ↷ Redo
            </button>
            <div className="w-px h-6 bg-gray-700" />
            <button
              onClick={handleExportClick}
              disabled={exporting || state.clips.length === 0}
              className="px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
            >
              Export Video
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleMinimize}
            className="w-12 h-8 flex items-center justify-center hover:bg-gray-800 rounded transition-colors"
            aria-label="Minimize"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="w-12 h-8 flex items-center justify-center hover:bg-gray-800 rounded transition-colors"
            aria-label="Maximize"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            className="w-12 h-8 flex items-center justify-center hover:bg-red-600 rounded transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
