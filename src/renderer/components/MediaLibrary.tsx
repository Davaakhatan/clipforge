import React, { useCallback, useState } from 'react'
import { useProject, Clip } from '../context/ProjectContext'

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const MediaLibrary: React.FC = () => {
  const { state, addClip, removeClip, saveHistory } = useProject()
  const [importing, setImporting] = useState<string[]>([])

  const importVideoFile = useCallback(async (filePath: string, fileName: string) => {
    try {
      setImporting(prev => [...prev, filePath])
      
      const result = await window.electron.ipc.invoke('importVideo', { filePath })
      
      if (result.success) {
        const clip: Clip = {
          id: Math.random().toString(36).substring(7),
          name: fileName,
          filePath: filePath,
          duration: result.metadata.duration * 1000, // Convert seconds to ms
          startTime: 0,
          endTime: result.metadata.duration * 1000, // Convert seconds to ms
          trackId: 0,
          offset: 0,
          thumbnail: result.thumbnailPath,
          speed: 1, // Normal speed by default
        }
        addClip(clip)
      }
    } catch (error) {
      console.error('Error importing video:', error)
    } finally {
      setImporting(prev => prev.filter(p => p !== filePath))
    }
  }, [addClip])

  const handleFileSelect = useCallback(async () => {
    try {
      // Open native file picker dialog
      const filePaths = await window.electron?.ipc?.invoke('showOpenDialog')
      
      if (filePaths && filePaths.length > 0) {
        for (const filePath of filePaths) {
          const fileName = filePath.split('/').pop() || 'video'
          await importVideoFile(filePath, fileName)
        }
      }
    } catch (error) {
      console.error('Error opening file picker:', error)
    }
  }, [importVideoFile])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    
    for (const file of files) {
      if (file.type.startsWith('video/')) {
        await importVideoFile(file.path, file.name)
      }
    }
  }, [importVideoFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-800 bg-dark">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Media Library</h2>
        <button
          onClick={handleFileSelect}
          className="w-full px-4 py-2.5 bg-accent hover:bg-accent-hover rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Import Video
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {state.clips.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">Drop video files here</p>
            <p className="text-xs mt-2">or click "Import Video"</p>
          </div>
        ) : (
          <div className="space-y-2">
      {state.clips.map(clip => (
        <div
          key={clip.id}
          className="group p-3 bg-dark-secondary rounded-lg border border-gray-800 hover:border-accent hover:shadow-lg transition-all relative overflow-hidden"
        >
          {importing.includes(clip.filePath) && (
            <div className="absolute inset-0 bg-dark bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <div className="text-sm text-accent">Processing...</div>
              </div>
            </div>
          )}
          <div className="w-full h-28 bg-gray-800 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
            {clip.thumbnail ? (
              <img src={clip.thumbnail} alt={clip.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <span className="text-xs text-gray-500">Loading...</span>
            )}
          </div>
          <p className="text-xs font-medium truncate mb-1">{clip.name}</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{formatTime(clip.duration)}</span>
            <span className="text-gray-600">📹 {Math.round(clip.duration / 1000)}s</span>
          </div>
          
          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeClip(clip.id)
              saveHistory() // Save state for undo/redo
            }}
            className="absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>
      ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MediaLibrary
