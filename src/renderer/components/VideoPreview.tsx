import React, { useRef, useEffect, useCallback } from 'react'
import { useProject } from '../context/ProjectContext'

const VideoPreview: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { state, setCurrentTime, setPlaying } = useProject()
  const isSeekingRef = useRef(false)

  // Get the currently playing clip (if any)
  const currentClip = state.tracks
    .flatMap(track => track.clips)
    .find(clip => {
      const startTime = clip.offset
      const endTime = startTime + clip.duration
      return state.currentTime >= startTime && state.currentTime <= endTime
    })

  // Debounced time update to prevent lag
  const handleTimeUpdate = useCallback(() => {
    if (isSeekingRef.current) return
    
    const video = videoRef.current
    if (video && currentClip && video.currentTime !== undefined) {
      // Convert video time to timeline time (add clip offset)
      const timelineTime = currentClip.offset + (video.currentTime * 1000)
      setCurrentTime(timelineTime)
    }
  }, [setCurrentTime, currentClip])

  // Sync video position when playhead moves while paused
  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentClip || state.isPlaying) return
    
    const timeInClip = state.currentTime - currentClip.offset
    if (timeInClip >= 0 && timeInClip <= currentClip.duration) {
      video.currentTime = timeInClip / 1000
    }
  }, [state.currentTime, currentClip, state.isPlaying])

  // Sync video currentTime with playhead position when play state changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentClip) return

    // When playing starts, seek to the correct position within the clip
    if (state.isPlaying && video.paused) {
      const timeInClip = state.currentTime - currentClip.offset
      if (timeInClip >= 0 && timeInClip <= currentClip.duration) {
        video.currentTime = timeInClip / 1000
      }
      video.play().catch(err => console.error('Play failed:', err))
    } else if (!state.isPlaying && !video.paused) {
      video.pause()
    }
  }, [state.isPlaying, state.currentTime, currentClip])

  const handlePlayPause = useCallback(() => {
    setPlaying(!state.isPlaying)
  }, [state.isPlaying, setPlaying])

  const handleSeek = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!currentClip) return
    
    const container = event.currentTarget
    const rect = container.getBoundingClientRect()
    const percent = (event.clientX - rect.left) / rect.width
    const newTime = percent * currentClip.duration
    
    const video = videoRef.current
    if (video) {
      isSeekingRef.current = true
      video.currentTime = newTime / 1000
      setCurrentTime(newTime)
      setTimeout(() => { isSeekingRef.current = false }, 100)
    }
  }, [currentClip, setCurrentTime])

  const handleStop = useCallback(() => {
    setCurrentTime(0)
    setPlaying(false)
  }, [setCurrentTime, setPlaying])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 bg-dark-secondary border border-gray-800 rounded overflow-hidden relative flex items-center justify-center group">
        {currentClip ? (
          <>
            <video
              ref={videoRef}
              src={`file://${currentClip.filePath}`}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => {
                if (state.isPlaying && videoRef.current) {
                  videoRef.current.play()
                }
              }}
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              className="w-full h-full object-contain"
              controls={false}
              muted={false}
              playsInline={true}
            />
            
            {/* Progress bar on video */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 cursor-pointer"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-accent transition-all"
                style={{ width: `${((state.currentTime) / (currentClip.duration)) * 100}%` }}
              />
            </div>

            {/* Play overlay button */}
            {!state.isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 cursor-pointer" onClick={handlePlayPause}>
                <button className="w-20 h-20 bg-accent hover:bg-accent-hover rounded-full flex items-center justify-center transition-all shadow-2xl">
                  <svg className="w-10 h-10 ml-1" fill="white" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-500 text-center">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-sm font-medium">Import a video to see preview</p>
            <p className="text-xs text-gray-600 mt-2">Drag & drop or click "Import Video"</p>
          </div>
        )}
      </div>

      {/* Controls bar */}
      {currentClip && (
        <div className="mt-6 w-full flex items-center gap-4 px-2">
          <button
            onClick={handlePlayPause}
            className="w-14 h-14 bg-accent hover:bg-accent-hover rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
            title={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? (
              <svg className="w-7 h-7" fill="white" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 ml-1" fill="white" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="flex-1 h-2.5 bg-gray-800 rounded-full cursor-pointer relative group" onClick={handleSeek}>
            <div 
              className="h-full bg-accent rounded-full transition-all relative"
              style={{ width: `${((state.currentTime) / (currentClip.duration)) * 100}%` }}
            >
              <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
            </div>
          </div>

          <div className="text-sm text-gray-300 font-mono min-w-[140px]">
            {formatTime(state.currentTime)} / {formatTime(currentClip.duration)}
          </div>

          <button
            onClick={handleStop}
            className="w-12 h-12 hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors"
            title="Stop"
          >
            <svg className="w-6 h-6" fill="gray" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default VideoPreview
