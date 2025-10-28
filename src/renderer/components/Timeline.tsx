import React, { useRef, useEffect, useCallback, useState, MouseEvent as ReactMouseEvent } from 'react'
import { useProject, Clip, AudioClip, TextOverlay } from '../context/ProjectContext'

const Timeline: React.FC = () => {
  const { state, setCurrentTime, removeClip, updateClip, saveHistory, setSelectedClipId, setZoom, removeTextOverlay, removeAudioClip, updateAudioClip, addToSelection, removeFromSelection, clearSelection, setSelectedClips } = useProject()
  const [selectedTextOverlay, setSelectedTextOverlay] = useState<{ clipId: string; overlayId: string } | null>(null)
  const zoom = state.zoom
  const selectedClipId = state.selectedClipId
  const [isDraggingClip, setIsDraggingClip] = useState(false)
  const [isDraggingAudioClip, setIsDraggingAudioClip] = useState(false)
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const [isResizingClip, setIsResizingClip] = useState<'left' | 'right' | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, startTime: 0 })
  const [trimFeedback, setTrimFeedback] = useState<{ side: 'left' | 'right' | null, clipId: string | null, newDuration: number }>({ side: null, clipId: null, newDuration: 0 })
  
  const timelineContainerRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLDivElement>(null)

  // Calculate total duration
  const totalDuration = Math.max(
    state.clips.reduce((max, clip) => Math.max(max, clip.offset + clip.duration), 0),
    30000 // 30s minimum
  )

  // Calculate viewport width for adaptive zoom
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(1000)

  useEffect(() => {
    const updateViewport = () => {
      if (viewportRef.current) {
        setViewportWidth(viewportRef.current.clientWidth - 80) // Subtract track header width
      }
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key - check for text overlay first, then clip
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        
        // If a text overlay is selected, delete it
        if (selectedTextOverlay) {
          removeTextOverlay(selectedTextOverlay.clipId, selectedTextOverlay.overlayId)
          setSelectedTextOverlay(null)
          saveHistory()
          return
        }
        
        // Otherwise delete the selected clip
        if (selectedClipId) {
          removeClip(selectedClipId)
          setSelectedClipId(null)
          saveHistory()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipId, selectedTextOverlay, removeClip, removeTextOverlay, saveHistory])

  // Adaptive zoom: zoom 1.0 = fit to viewport, higher = more detail
  const pixelsPerSecond = (viewportWidth * zoom) / totalDuration
  const timeToPx = (time: number) => time * pixelsPerSecond
  const pxToTime = (px: number) => px / pixelsPerSecond

  // Snap to grid
  const snapToGrid = (time: number) => {
    const interval = 1000 // 1 second
    return Math.round(time / interval) * interval
  }

  // Handle timeline click to seek
  const handleTimelineClick = useCallback((e: ReactMouseEvent) => {
    if (!timelineContainerRef.current || isDraggingClip) return
    
    // Clear selection when clicking on empty timeline
    clearSelection()
    setSelectedClipId(null)
    
    const rect = timelineContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newTime = Math.max(0, pxToTime(x))
    setCurrentTime(snapToGrid(newTime))
  }, [pxToTime, setCurrentTime, isDraggingClip, clearSelection, setSelectedClipId])

  // Handle playhead drag start
  const handlePlayheadMouseDown = useCallback((e: ReactMouseEvent) => {
    e.stopPropagation()
    setIsDraggingPlayhead(true)
  }, [])

  // Handle playhead drag
  useEffect(() => {
    if (!isDraggingPlayhead) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineContainerRef.current || !rulerRef.current) return
      
      const rect = timelineContainerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const newTime = Math.max(0, pxToTime(x))
      setCurrentTime(newTime)
    }

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingPlayhead, pxToTime, setCurrentTime])

  // Handle mouse wheel zoom (like CapCut)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(Math.max(0.5, Math.min(5, zoom + delta)))
    }
  }, [zoom])

  // Zoom buttons
  const handleZoomIn = () => {
    setZoom(Math.min(5, zoom + 0.5))
  }

  const handleZoomOut = () => {
    setZoom(Math.max(0.5, zoom - 0.5))
  }

  const handleZoomToFit = () => {
    // Calculate zoom to fit all content
    const contentWidth = timeToPx(totalDuration)
    const containerWidth = viewportWidth
    const fitZoom = Math.max(0.5, Math.min(5, containerWidth / contentWidth))
    setZoom(fitZoom)
  }

  const handleZoomPreset = (preset: number) => {
    setZoom(preset)
  }

  // Frame navigation
  const handleFrameBackward = () => {
    const frameTime = 1000 / 30 // Assuming 30fps
    setCurrentTime(Math.max(0, state.currentTime - frameTime))
  }

  const handleFrameForward = () => {
    const frameTime = 1000 / 30 // Assuming 30fps
    setCurrentTime(Math.min(totalDuration, state.currentTime + frameTime))
  }

  const handleGoToStart = () => {
    setCurrentTime(0)
  }

  const handleGoToEnd = () => {
    setCurrentTime(totalDuration)
  }

  // Handle clip drag
  const handleClipMouseDown = useCallback((e: ReactMouseEvent, clip: Clip) => {
    e.stopPropagation()
    // Check if clicking on resize handle
    const target = e.target as HTMLElement
    if (target.classList.contains('resize-handle')) {
      return // Let resize handler manage it
    }
    setSelectedClipId(clip.id)
    setIsDraggingClip(true)
    setDragOffset({
      x: e.clientX,
      startTime: clip.offset
    })
  }, [])

  // Handle audio clip drag
  const handleAudioClipMouseDown = useCallback((e: ReactMouseEvent, clip: AudioClip) => {
    e.stopPropagation()
    setSelectedClipId(clip.id)
    setIsDraggingAudioClip(true)
    setDragOffset({
      x: e.clientX,
      startTime: clip.offset
    })
  }, [])

  // Handle resize start
  const handleResizeStart = useCallback((e: ReactMouseEvent, side: 'left' | 'right', clip: Clip) => {
    e.stopPropagation()
    setSelectedClipId(clip.id)
    setIsResizingClip(side)
    setDragOffset({
      x: e.clientX,
      startTime: side === 'left' ? clip.startTime : clip.endTime
    })
  }, [])

  // Drag and resize handler
  useEffect(() => {
    if ((!isDraggingClip && !isDraggingAudioClip && !isResizingClip) || !selectedClipId) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragOffset.x
      const dt = pxToTime(dx)
      
      if (isDraggingAudioClip) {
        // Handle audio clip drag
        const audioClip = state.audioClips.find(c => c.id === selectedClipId)
        if (!audioClip) return
        
        const newOffset = Math.max(0, dragOffset.startTime + dt)
        const snappedOffset = snapToGrid(newOffset)
        updateAudioClip(selectedClipId, { offset: snappedOffset })
        return
      }
      
      const clip = state.clips.find(c => c.id === selectedClipId)
      if (!clip) return

      if (isDraggingClip) {
        // Drag the entire clip
        const newOffset = Math.max(0, dragOffset.startTime + dt)
        const snappedOffset = snapToGrid(newOffset)
        updateClip(selectedClipId, { offset: snappedOffset })
             } else if (isResizingClip) {
               // Resize (trim) the clip
               if (isResizingClip === 'left') {
                 const newStartTime = dragOffset.startTime + dt
                 const newDuration = clip.endTime - newStartTime
                 const trimmedAmount = clip.duration - newDuration
                 if (newDuration > 0 && newDuration < clip.duration) {
                   updateClip(selectedClipId, { 
                     startTime: snapToGrid(newStartTime), 
                     duration: clip.endTime - snapToGrid(newStartTime),
                     offset: clip.offset + (newStartTime - clip.startTime)
                   })
                   setTrimFeedback({ side: 'left', clipId: selectedClipId, newDuration: trimmedAmount })
                 }
               } else {
                 const newEndTime = dragOffset.startTime + dt
                 const newDuration = newEndTime - clip.startTime
                 const trimmedAmount = clip.duration - newDuration
                 if (newDuration > 0 && newDuration < clip.duration) {
                   updateClip(selectedClipId, { 
                     endTime: snapToGrid(newEndTime), 
                     duration: snapToGrid(newEndTime) - clip.startTime
                   })
                   setTrimFeedback({ side: 'right', clipId: selectedClipId, newDuration: trimmedAmount })
                 }
               }
             }
           }

    const handleMouseUp = () => {
      setIsDraggingClip(false)
      setIsDraggingAudioClip(false)
      setIsResizingClip(null)
      setTrimFeedback({ side: null, clipId: null, newDuration: 0 })
      
      // Save history after trim/drag completes
      saveHistory()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingClip, isDraggingAudioClip, isResizingClip, selectedClipId, dragOffset, pxToTime, updateClip, updateAudioClip, state.clips, state.audioClips, saveHistory])

  // Format time for display
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  // Generate time markers - smart spacing based on zoom with minimum label distance
  const getMarkerInterval = () => {
    // Calculate pixels per second at current zoom
    const actualPixelsPerSecond = pixelsPerSecond
    
    // Minimum distance between labels (pixels) - adjust this to control overlap
    const minLabelDistance = 80 // 80px minimum
    
    // Calculate minimum time interval needed to avoid overlap
    const minTimeInterval = (minLabelDistance / actualPixelsPerSecond) * 1000 // Convert to ms
    
    // Round to reasonable intervals
    if (minTimeInterval > 30000) return 60000 // 1 minute
    if (minTimeInterval > 15000) return 30000 // 30 seconds
    if (minTimeInterval > 10000) return 15000 // 15 seconds
    if (minTimeInterval > 5000) return 10000 // 10 seconds
    if (minTimeInterval > 2000) return 5000 // 5 seconds
    return 1000 // 1 second max detail
  }

  const timeMarkers: number[] = []
  const interval = getMarkerInterval()
  const numMarkers = Math.min(Math.ceil(totalDuration / interval), 10000) // Cap at 10000 markers to prevent overflow
  for (let i = 0; i <= numMarkers; i++) {
    timeMarkers.push(i * interval)
  }

  return (
    <div className="h-full flex flex-col bg-dark-secondary">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between bg-dark">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">Timeline</h2>
          <span className="text-xs text-gray-500">{state.clips.length} clips</span>
          {selectedClipId && (
            <span className="text-xs text-blue-400">● Selected</span>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          {/* Frame Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleGoToStart}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              title="Go to Start"
            >
              ⏮
            </button>
            <button
              onClick={handleFrameBackward}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              title="Frame Backward"
            >
              ⏪
            </button>
            <button
              onClick={handleFrameForward}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              title="Frame Forward"
            >
              ⏩
            </button>
            <button
              onClick={handleGoToEnd}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              title="Go to End"
            >
              ⏭
            </button>
          </div>

          {/* Time Navigation */}
          <div className="border-l border-gray-700 ml-2 pl-2 flex items-center gap-1">
            <button
              onClick={() => setCurrentTime(Math.max(0, state.currentTime - 1000))}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              title="1s Back"
            >
              1s ⏪
            </button>
            <button
              onClick={() => setCurrentTime(Math.min(totalDuration, state.currentTime + 1000))}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              title="1s Forward"
            >
              1s ⏩
            </button>
            <button
              onClick={() => setCurrentTime(Math.max(0, state.currentTime - 5000))}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              title="5s Back"
            >
              5s ⏪
            </button>
            <button
              onClick={() => setCurrentTime(Math.min(totalDuration, state.currentTime + 5000))}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              title="5s Forward"
            >
              5s ⏩
            </button>
          </div>

          {/* Current Time Display */}
          <div className="text-xs text-gray-400 font-mono px-2 border-l border-gray-700 ml-2">
            {formatTime(state.currentTime)}
          </div>
          
          {/* Zoom Presets */}
          <div className="border-l border-gray-700 ml-2 pl-2 flex items-center gap-1">
            <button
              onClick={() => handleZoomPreset(0.5)}
              className={`px-2 py-1 rounded text-xs ${zoom === 0.5 ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
              title="50% Zoom"
            >
              50%
            </button>
            <button
              onClick={() => handleZoomPreset(1)}
              className={`px-2 py-1 rounded text-xs ${zoom === 1 ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
              title="100% Zoom"
            >
              100%
            </button>
            <button
              onClick={() => handleZoomPreset(2)}
              className={`px-2 py-1 rounded text-xs ${zoom === 2 ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
              title="200% Zoom"
            >
              200%
            </button>
            <button
              onClick={handleZoomToFit}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              title="Fit to Screen"
            >
              Fit
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="border-l border-gray-700 ml-2 pl-2 flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              title="Zoom Out"
            >
              −
            </button>
            <span className="text-xs text-gray-300 mx-1 min-w-[3rem] text-center font-mono">
              {zoom.toFixed(1)}x
            </span>
            <button
              onClick={handleZoomIn}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              title="Zoom In"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Tracks */}
      <div className="flex-1 overflow-auto" ref={viewportRef}>
        {/* Enhanced Ruler */}
        <div 
          ref={rulerRef}
          className="h-12 bg-dark-tertiary border-b border-gray-800 flex items-start sticky top-0 z-10 cursor-grab"
          onMouseDown={handlePlayheadMouseDown}
        >
          <div className="w-20 border-r border-gray-800 flex items-center justify-center">
            <span className="text-xs text-gray-400 font-semibold">Time</span>
          </div>
          <div className="flex-1 relative" style={{ width: `${timeToPx(totalDuration)}px`, minWidth: '100%' }}>
            {timeMarkers.map((time) => {
              const labelWidth = 60 // Approximate width of time label in pixels
              const leftPos = timeToPx(time)
              
              // Only show label if it won't collide with next marker
              const shouldShowLabel = timeMarkers.indexOf(time) === 0 || 
                (timeToPx(timeMarkers[timeMarkers.indexOf(time) + 1] - time) > labelWidth)
              
              // Calculate frame number (assuming 30fps)
              const frameNumber = Math.round(time * 30 / 1000)
              
              return (
                <div
                  key={time}
                  className="absolute border-l border-gray-600 h-full flex flex-col"
                  style={{ left: `${leftPos}px` }}
                >
                  {/* Time Label */}
                  {shouldShowLabel && (
                    <div className="mt-1 ml-1 text-[10px] text-gray-300 font-mono whitespace-nowrap">
                      {formatTime(time)}
                    </div>
                  )}
                  
                  {/* Frame Number (only show for major markers) */}
                  {shouldShowLabel && time % 1000 === 0 && (
                    <div className="mt-3 ml-1 text-[9px] text-gray-500 font-mono">
                      F{frameNumber}
                    </div>
                  )}
                  
                  {/* Minor tick marks */}
                  <div className="absolute bottom-0 w-px h-2 bg-gray-600"></div>
                </div>
              )
            })}
            
            {/* Playhead */}
            <div
              className="absolute top-0 w-0.5 h-full bg-accent z-20 pointer-events-none"
              style={{ left: `${timeToPx(state.currentTime)}px` }}
            >
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-accent rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Text Overlays Track */}
        {(() => {
          // Collect all text overlays from all clips
          const allTextOverlays: { clip: Clip; overlay: TextOverlay }[] = []
          state.clips.forEach(clip => {
            if (clip.textOverlays) {
              clip.textOverlays.forEach(overlay => {
                allTextOverlays.push({ clip, overlay })
              })
            }
          })

          return allTextOverlays.length > 0 ? (
            <div className="h-24 border-b border-gray-800 bg-dark flex relative">
              {/* Track Header */}
              <div className="w-20 border-r border-gray-800 bg-dark-tertiary flex flex-col items-center justify-center text-xs text-gray-400">
                <div>📝 Text</div>
              </div>

              {/* Track Content */}
              <div
                className="flex-1 relative bg-dark overflow-visible cursor-crosshair"
                onClick={handleTimelineClick}
                style={{ minWidth: `${Math.max(timeToPx(totalDuration), 800)}px` }}
              >
                {allTextOverlays.map(({ clip, overlay }) => {
                  const absoluteStart = clip.offset + overlay.startTime
                  const duration = overlay.endTime - overlay.startTime
                  const isSelected = selectedTextOverlay?.clipId === clip.id && selectedTextOverlay?.overlayId === overlay.id

                  return (
                    <div
                      key={overlay.id}
                      className={`absolute h-16 top-2 rounded-lg border-2 flex items-center justify-center cursor-pointer shadow-lg transition-all ${
                        isSelected
                          ? 'border-yellow-400 bg-yellow-400 bg-opacity-20 ring-2 ring-yellow-300'
                          : 'border-yellow-600 bg-yellow-600 bg-opacity-10 hover:bg-opacity-20'
                      }`}
                      style={{
                        left: `${timeToPx(absoluteStart)}px`,
                        width: `${Math.max(timeToPx(duration), 100)}px`,
                        minWidth: '100px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTextOverlay({ clipId: clip.id, overlayId: overlay.id })
                        setSelectedClipId(clip.id) // Also select the parent clip
                      }}
                    >
                      {/* Text preview */}
                      <div className="px-2 py-1 flex items-center gap-2">
                        <span className="text-lg">📝</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {overlay.text}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {formatTime(duration)}
                          </p>
                        </div>
                      </div>

                      {/* Delete button */}
                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeTextOverlay(clip.id, overlay.id)
                            setSelectedTextOverlay(null)
                            saveHistory()
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white text-xs shadow-lg"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-red-500 z-20"
                  style={{ left: `${timeToPx(state.currentTime)}px` }}
                />
              </div>
            </div>
          ) : null
        })()}

        {/* Timeline Tracks */}
        {state.tracks.map(track => (
          <div key={track.id} className="h-32 border-b border-gray-800 bg-dark flex relative">
            {/* Track Header */}
            <div className="w-20 border-r border-gray-800 bg-dark-tertiary flex flex-col items-center justify-center text-xs text-gray-400">
              <div>Track {track.id + 1}</div>
            </div>

            {/* Track Content */}
            <div
              ref={timelineContainerRef}
              className="flex-1 relative bg-dark overflow-visible cursor-crosshair"
              onClick={handleTimelineClick}
              onWheel={handleWheel}
              style={{ minWidth: `${Math.max(timeToPx(totalDuration), 800)}px` }}
            >
              {/* Empty track indicator */}
              {track.clips.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-gray-600">Drop clips here</span>
                </div>
              )}

              {/* Clips */}
              {track.clips.map(clip => {
                const isSelected = selectedClipId === clip.id
                const isMultiSelected = state.selectedClipIds.includes(clip.id)
                return (
                  <div
                    key={clip.id}
                    className={`absolute h-28 top-2 rounded-lg border-2 flex flex-col cursor-move shadow-lg transition-all overflow-visible ${
                      isSelected
                        ? 'border-white ring-2 ring-blue-400 ring-opacity-50'
                        : isMultiSelected
                        ? 'border-orange-400 ring-2 ring-orange-400 ring-opacity-50'
                        : 'border-blue-500 hover:border-blue-400'
                    }`}
                    style={{
                      left: `${timeToPx(clip.offset)}px`,
                      width: `${Math.max(timeToPx(clip.duration), 120)}px`,
                      minWidth: '120px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      
                      // Multi-select logic
                      if (e.metaKey || e.ctrlKey) {
                        // Add/remove from selection
                        if (state.selectedClipIds.includes(clip.id)) {
                          removeFromSelection(clip.id)
                        } else {
                          addToSelection(clip.id)
                        }
                      } else {
                        // Single select
                        setSelectedClipId(clip.id)
                        setSelectedClips([clip.id])
                      }
                    }}
                    onMouseDown={(e) => handleClipMouseDown(e, clip)}
                  >
                    {/* Clip Content - CapCut Style with Thumbnails */}
                    <div className="flex-1 overflow-hidden relative">
                      {clip.thumbnail ? (
                        <img 
                          src={clip.thumbnail} 
                          alt={clip.name}
                          className="w-full h-full object-cover opacity-90"
                        />
                      ) : (
                        <div className="h-full bg-blue-600 flex items-center justify-center">
                          <p className="text-xs text-blue-100">{formatTime(clip.duration)}</p>
                        </div>
                      )}
                      
                      {/* Clip name overlay */}
                      <div className="absolute top-1 left-1 right-1">
                        <p className="text-[10px] font-bold text-white bg-black bg-opacity-60 px-1 rounded truncate">
                          {clip.name}
                        </p>
                      </div>
                      
                      {/* Duration overlay at bottom */}
                      <div className="absolute bottom-1 right-1">
                        <p className="text-[10px] text-white bg-black bg-opacity-60 px-1 rounded">
                          {formatTime(clip.duration)}
                        </p>
                      </div>
                      
                      {/* Speed indicator */}
                      <div className="absolute bottom-1 left-1">
                        <p className="text-[10px] text-white bg-green-600 bg-opacity-80 px-1 rounded font-bold">
                          {clip.speed}x
                        </p>
                      </div>
                      
                      {/* Volume indicator - only show if not 100% */}
                      {clip.volume !== 1 && (
                        <div className="absolute bottom-1 left-[calc(0.25rem+2.5rem)]">
                          <p className="text-[10px] text-white bg-orange-600 bg-opacity-80 px-1 rounded font-bold">
                            🔊{Math.round(clip.volume * 100)}%
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Delete Button - Show on selected clips */}
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeClip(clip.id)
                          setSelectedClipId(null)
                          saveHistory() // Save state for undo/redo
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white text-xs shadow-lg"
                      >
                        ×
                      </button>
                    )}


                    {/* CapCut-style Trim Handles */}
                    {isSelected && (
                      <>
                        {/* Left trim handle - MUCH LARGER and clearer */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-12 cursor-ew-resize z-10"
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            handleResizeStart(e, 'left', clip)
                          }}
                        >
                          {/* Large white trim bar - ALWAYS VISIBLE */}
                          <div className={`absolute left-0 top-0 bottom-0 w-2 bg-white border-r-2 border-blue-500 ${isResizingClip === 'left' ? 'animate-pulse bg-blue-400' : ''}`} />
                          
                          {/* Drag handle area with visual feedback */}
                          <div className="absolute -left-8 top-0 bottom-0 w-8 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                            <div className="w-8 h-full bg-blue-500 bg-opacity-30 border-2 border-blue-500 rounded-lg flex flex-col items-center justify-center">
                              {/* Triple line indicator for drag */}
                              <div className="space-y-1">
                                <div className="w-4 h-0.5 bg-blue-500" />
                                <div className="w-4 h-0.5 bg-blue-500" />
                                <div className="w-4 h-0.5 bg-blue-500" />
                              </div>
                            </div>
                          </div>

                          {/* Show trim feedback during drag */}
                          {trimFeedback.side === 'left' && trimFeedback.clipId === clip.id && (
                            <div className="absolute -top-8 left-2 text-xs bg-blue-500 text-white px-2 py-1 rounded shadow-lg whitespace-nowrap">
                              -{formatTime(trimFeedback.newDuration)}
                            </div>
                          )}
                        </div>

                        {/* Right trim handle - MUCH LARGER and clearer */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-12 cursor-ew-resize z-10"
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            handleResizeStart(e, 'right', clip)
                          }}
                        >
                          {/* Large white trim bar - ALWAYS VISIBLE */}
                          <div className={`absolute right-0 top-0 bottom-0 w-2 bg-white border-l-2 border-blue-500 ${isResizingClip === 'right' ? 'animate-pulse bg-blue-400' : ''}`} />
                          
                          {/* Drag handle area with visual feedback */}
                          <div className="absolute -right-8 top-0 bottom-0 w-8 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                            <div className="w-8 h-full bg-blue-500 bg-opacity-30 border-2 border-blue-500 rounded-lg flex flex-col items-center justify-center">
                              {/* Triple line indicator for drag */}
                              <div className="space-y-1">
                                <div className="w-4 h-0.5 bg-blue-500" />
                                <div className="w-4 h-0.5 bg-blue-500" />
                                <div className="w-4 h-0.5 bg-blue-500" />
                              </div>
                            </div>
                          </div>

                          {/* Show trim feedback during drag */}
                          {trimFeedback.side === 'right' && trimFeedback.clipId === clip.id && (
                            <div className="absolute -top-8 right-2 text-xs bg-blue-500 text-white px-2 py-1 rounded shadow-lg whitespace-nowrap">
                              -{formatTime(trimFeedback.newDuration)}
                            </div>
                          )}
                        </div>

                      </>
                    )}
                  </div>
                )
              })}

              {/* Playhead - draggable */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-red-500 z-20 cursor-grab active:cursor-grabbing hover:w-1.5 transition-all"
                style={{ left: `${timeToPx(state.currentTime)}px` }}
                onMouseDown={handlePlayheadMouseDown}
              >
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-transparent border-b-red-500" />
                {/* Playhead handle */}
                <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-5 h-16 bg-red-500 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}

        {/* Audio Tracks */}
        {state.audioTracks.map(track => (
          <div key={track.id} className="h-24 border-b border-gray-800 bg-dark flex relative">
            {/* Track Header */}
            <div className="w-20 border-r border-gray-800 bg-dark-tertiary flex flex-col items-center justify-center text-xs text-gray-400">
              <div>🎵 Audio {track.id + 1}</div>
            </div>

            {/* Track Content */}
            <div
              className="flex-1 relative bg-dark overflow-visible cursor-crosshair"
              onClick={handleTimelineClick}
              style={{ minWidth: `${Math.max(timeToPx(totalDuration), 800)}px` }}
            >
              {/* Empty track indicator */}
              {track.clips.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-gray-600">Drop audio here</span>
                </div>
              )}

              {/* Audio Clips */}
              {track.clips.map(clip => {
                const isSelected = selectedClipId === clip.id
                const isMultiSelected = state.selectedClipIds.includes(clip.id)
                return (
                  <div
                    key={clip.id}
                    className={`absolute h-16 top-2 rounded-lg border-2 flex items-center justify-center cursor-move shadow-lg transition-all overflow-visible ${
                      isSelected
                        ? 'border-pink-400 ring-2 ring-pink-300'
                        : isMultiSelected
                        ? 'border-orange-400 ring-2 ring-orange-400 ring-opacity-50'
                        : 'border-pink-600 hover:border-pink-500'
                    }`}
                    style={{
                      left: `${timeToPx(clip.offset)}px`,
                      width: `${Math.max(timeToPx(clip.duration), 100)}px`,
                      minWidth: '100px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      
                      // Multi-select logic
                      if (e.metaKey || e.ctrlKey) {
                        // Add/remove from selection
                        if (state.selectedClipIds.includes(clip.id)) {
                          removeFromSelection(clip.id)
                        } else {
                          addToSelection(clip.id)
                        }
                      } else {
                        // Single select
                        setSelectedClipId(clip.id)
                        setSelectedClips([clip.id])
                      }
                    }}
                    onMouseDown={(e) => handleAudioClipMouseDown(e, clip)}
                  >
                    {/* Audio Waveform or Icon */}
                    <div className="flex-1 h-full bg-gradient-to-r from-pink-700 to-purple-700 flex items-center justify-center rounded">
                      <div className="px-2 py-1 flex items-center gap-2">
                        <svg className="w-5 h-5 text-pink-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                        <p className="text-[10px] font-semibold text-white truncate">{clip.name}</p>
                      </div>
                    </div>

                    {/* Delete Button */}
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeAudioClip(clip.id)
                          setSelectedClipId(null)
                          saveHistory()
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white text-xs shadow-lg"
                      >
                        ×
                      </button>
                    )}

                    {/* Volume indicator */}
                    {clip.volume !== 1 && (
                      <div className="absolute -bottom-6 left-1">
                        <p className="text-[10px] text-white bg-pink-600 bg-opacity-80 px-1 rounded font-bold">
                          🔊{Math.round(clip.volume * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-red-500 z-20"
                style={{ left: `${timeToPx(state.currentTime)}px` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mini Timeline Overview */}
      <div className="h-16 bg-dark-tertiary border-t border-gray-800 flex items-center px-4">
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-gray-400 font-semibold min-w-[3rem]">Overview</span>
          
          {/* Mini Timeline */}
          <div className="flex-1 h-8 bg-gray-900 rounded border border-gray-700 relative overflow-hidden">
            {/* Mini clips representation */}
            {state.clips.map((clip) => (
              <div
                key={clip.id}
                className="absolute h-full bg-blue-500 rounded-sm border border-blue-400"
                style={{
                  left: `${(clip.offset / totalDuration) * 100}%`,
                  width: `${(clip.duration / totalDuration) * 100}%`,
                }}
              />
            ))}
            
            {/* Mini audio clips */}
            {state.audioClips.map((clip) => (
              <div
                key={clip.id}
                className="absolute h-full bg-pink-500 rounded-sm border border-pink-400"
                style={{
                  left: `${(clip.offset / totalDuration) * 100}%`,
                  width: `${(clip.duration / totalDuration) * 100}%`,
                }}
              />
            ))}
            
            {/* Viewport indicator */}
            <div
              className="absolute top-0 h-full border-2 border-accent bg-accent/20 pointer-events-none"
              style={{
                left: `${Math.max(0, (state.currentTime - viewportWidth / 2 / zoom) / totalDuration) * 100}%`,
                width: `${(viewportWidth / zoom / totalDuration) * 100}%`,
              }}
            />
            
            {/* Current time indicator */}
            <div
              className="absolute top-0 w-0.5 h-full bg-accent pointer-events-none"
              style={{ left: `${(state.currentTime / totalDuration) * 100}%` }}
            />
          </div>
          
          {/* Duration info */}
          <div className="text-xs text-gray-400 font-mono min-w-[4rem] text-right">
            {formatTime(totalDuration)}
          </div>
        </div>
      </div>

      {/* Footer Tips */}
      <div className="px-4 py-2 border-t border-gray-800 bg-dark text-xs text-gray-500">
        💡 Drag white trim bars to trim • <kbd className="px-1 bg-gray-800 rounded">Delete</kbd> Remove • <kbd className="px-1 bg-gray-800 rounded">Cmd/Ctrl+Z</kbd> Undo • <kbd className="px-1 bg-gray-800 rounded">S</kbd> Split • <kbd className="px-1 bg-gray-800 rounded">Space</kbd> Play/Pause
      </div>
    </div>
  )
}

export default Timeline
