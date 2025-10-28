import React, { useCallback, useState } from 'react'
import { useProject, Clip, AudioClip } from '../context/ProjectContext'

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const MediaLibrary: React.FC = () => {
  const { state, addClip, removeClip, addAudioClip, removeAudioClip, saveHistory } = useProject()
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
          volume: 1, // 100% volume by default
          fadeIn: 0, // No fade in by default
          fadeOut: 0, // No fade out by default
          brightness: 0, // No brightness adjustment by default
          contrast: 0, // No contrast adjustment by default
          saturation: 0, // No saturation adjustment by default
        }
        addClip(clip)
      }
    } catch (error) {
      console.error('Error importing video:', error)
    } finally {
      setImporting(prev => prev.filter(p => p !== filePath))
    }
  }, [addClip])

  const importAudioFile = useCallback(async (filePath: string, fileName: string) => {
    try {
      setImporting(prev => [...prev, filePath])
      
      const result = await window.electron.ipc.invoke('importAudio', { filePath })
      
      if (result.success) {
        const audioClip: AudioClip = {
          id: Math.random().toString(36).substring(7),
          name: fileName,
          filePath: filePath,
          duration: result.metadata.duration * 1000, // Convert seconds to ms
          startTime: 0,
          endTime: result.metadata.duration * 1000,
          trackId: 0,
          offset: 0,
          volume: 1, // 100% volume by default
          fadeIn: 0,
          fadeOut: 0,
        }
        addAudioClip(audioClip)
        saveHistory()
      }
    } catch (error) {
      console.error('Error importing audio:', error)
    } finally {
      setImporting(prev => prev.filter(p => p !== filePath))
    }
  }, [addAudioClip, saveHistory])

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

  const handleAudioFileSelect = useCallback(async () => {
    try {
      const filePaths = await window.electron?.ipc?.invoke('showOpenDialogAudio')
      
      if (filePaths && filePaths.length > 0) {
        for (const filePath of filePaths) {
          const fileName = filePath.split('/').pop() || 'audio'
          await importAudioFile(filePath, fileName)
        }
      }
    } catch (error) {
      console.error('Error opening audio file picker:', error)
    }
  }, [importAudioFile])

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
    <div className="h-full flex flex-col bg-dark-secondary">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-sm font-bold text-white">Media Library</h2>
        </div>
        <div className="space-y-2">
          <button
            onClick={handleFileSelect}
            className="w-full px-4 py-3 bg-gradient-to-r from-accent to-blue-600 hover:from-blue-600 hover:to-accent rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl group"
          >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Import Video</span>
        </button>
        
        <button
          onClick={handleAudioFileSelect}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-pink-600 hover:to-purple-600 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <span>Import Audio</span>
        </button>
      </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {(state.clips.length === 0 && state.audioClips.length === 0) ? (
          <div className="text-center text-gray-500 mt-12">
            <div className="text-5xl mb-3">📹</div>
            <p className="text-sm font-medium">Drop video files here</p>
            <p className="text-xs mt-2 text-gray-600">or click "Import Video/Audio"</p>
          </div>
        ) : (
          <div className="space-y-3">
      {/* Video Clips */}
      {state.clips.map(clip => (
        <div
          key={clip.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', clip.id)
            e.dataTransfer.effectAllowed = 'move'
          }}
          className="group p-3 bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl border border-gray-700/50 hover:border-accent/50 hover:shadow-xl transition-all relative overflow-hidden cursor-grab active:cursor-grabbing backdrop-blur-sm"
        >
          {importing.includes(clip.filePath) && (
            <div className="absolute inset-0 bg-dark/95 bg-opacity-90 flex items-center justify-center z-10 rounded-xl">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                <div className="text-sm font-semibold text-accent">Processing...</div>
              </div>
            </div>
          )}
          
          {/* Thumbnail */}
          <div className="w-full h-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-gray-700/50 group-hover:border-accent/30 transition-colors">
            {clip.thumbnail ? (
              <img src={clip.thumbnail} alt={clip.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 border-2 border-gray-600 border-t-accent rounded-full animate-spin" />
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-white truncate flex-1">{clip.name}</p>
              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeClip(clip.id)
                  saveHistory()
                }}
                className="w-5 h-5 bg-red-600/80 hover:bg-red-600 rounded-md flex items-center justify-center text-white text-xs shadow-md opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                title="Delete clip"
              >
                ×
              </button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatTime(clip.duration)}</span>
              </div>
              <div className="flex items-center gap-1 text-accent font-semibold">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Video</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Audio Clips */}
      {state.audioClips.map(clip => (
        <div
          key={clip.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', `audio-${clip.id}`)
            e.dataTransfer.effectAllowed = 'move'
          }}
          className="group p-3 bg-gradient-to-br from-purple-800/60 to-pink-900/60 rounded-xl border border-purple-700/50 hover:border-pink-400/50 hover:shadow-xl transition-all relative overflow-hidden cursor-grab active:cursor-grabbing backdrop-blur-sm"
        >
          {importing.includes(clip.filePath) && (
            <div className="absolute inset-0 bg-dark/95 bg-opacity-90 flex items-center justify-center z-10 rounded-xl">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-sm font-semibold text-pink-500">Processing...</div>
              </div>
            </div>
          )}
          
          {/* Audio Icon */}
          <div className="w-full h-32 bg-gradient-to-br from-purple-800 to-pink-900 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-purple-700/50 group-hover:border-pink-400/30 transition-colors">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-12 h-12 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </div>
          </div>
          
          {/* Info */}
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-white truncate flex-1">{clip.name}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeAudioClip(clip.id)
                  saveHistory()
                }}
                className="w-5 h-5 bg-red-600/80 hover:bg-red-600 rounded-md flex items-center justify-center text-white text-xs shadow-md opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                title="Delete clip"
              >
                ×
              </button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatTime(clip.duration)}</span>
              </div>
              <div className="flex items-center gap-1 text-pink-400 font-semibold">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                <span>Audio</span>
              </div>
            </div>
          </div>
        </div>
      ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MediaLibrary
