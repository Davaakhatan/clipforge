import React, { useRef, useEffect, useCallback, useState, MouseEvent as ReactMouseEvent } from 'react'
import { useProject, Clip } from '../context/ProjectContext'

const Timeline: React.FC = () => {
  const { state, setCurrentTime, removeClip, updateClip, saveHistory } = useProject()
  const [zoom, setZoom] = useState(1)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [isDraggingClip, setIsDraggingClip] = useState(false)
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
    const rect = timelineContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newTime = Math.max(0, pxToTime(x))
    setCurrentTime(snapToGrid(newTime))
  }, [pxToTime, setCurrentTime, isDraggingClip])

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
    if ((!isDraggingClip && !isResizingClip) || !selectedClipId) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragOffset.x
      const dt = pxToTime(dx)
      
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
  }, [isDraggingClip, isResizingClip, selectedClipId, dragOffset, pxToTime, updateClip, state.clips, saveHistory])

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
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTime(Math.max(0, state.currentTime - 5000))}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
          >
            ⏪ 5s
          </button>
          <div className="text-xs text-gray-400 font-mono px-2">
            {formatTime(state.currentTime)}
          </div>
          <button
            onClick={() => setCurrentTime(Math.min(totalDuration, state.currentTime + 5000))}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
          >
            5s ⏩
          </button>
          
          <div className="border-l border-gray-700 ml-2 pl-2 flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              title="Zoom Out"
            >
              −
            </button>
            <span className="text-xs text-gray-500 mx-1 min-w-[3rem] text-center">{zoom.toFixed(1)}x</span>
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
        {/* Ruler */}
        <div 
          ref={rulerRef}
          className="h-8 bg-dark-tertiary border-b border-gray-800 flex items-start sticky top-0 z-10 cursor-grab"
          onMouseDown={handlePlayheadMouseDown}
        >
          <div className="w-20 border-r border-gray-800"></div>
          <div className="flex-1 relative" style={{ width: `${timeToPx(totalDuration)}px`, minWidth: '100%' }}>
            {timeMarkers.map((time) => {
              const labelWidth = 50 // Approximate width of time label in pixels
              const leftPos = timeToPx(time)
              
              // Only show label if it won't collide with next marker
              const shouldShowLabel = timeMarkers.indexOf(time) === 0 || 
                (timeToPx(timeMarkers[timeMarkers.indexOf(time) + 1] - time) > labelWidth)
              
              return (
                <div
                  key={time}
                  className="absolute border-l border-gray-700 h-full flex flex-col"
                  style={{ left: `${leftPos}px` }}
                >
                  {shouldShowLabel && (
                    <div className="mt-1 ml-2 text-[11px] text-gray-300 font-mono whitespace-nowrap">{formatTime(time)}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

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
                return (
                  <div
                    key={clip.id}
                    className={`absolute h-28 top-2 rounded-lg border-2 flex flex-col cursor-move shadow-lg transition-all overflow-hidden ${
                      isSelected
                        ? 'border-white ring-2 ring-blue-400 ring-opacity-50'
                        : 'border-blue-500 hover:border-blue-400'
                    }`}
                    style={{
                      left: `${timeToPx(clip.offset)}px`,
                      width: `${Math.max(timeToPx(clip.duration), 120)}px`,
                      minWidth: '120px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedClipId(clip.id)
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
                    </div>

                    {/* Speed Control Button */}
                    {isSelected && (
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-dark border border-gray-700 rounded shadow-lg p-1 flex gap-1 z-20">
                        {[0.25, 0.5, 1, 1.5, 2].map(speed => (
                          <button
                            key={speed}
                            onClick={(e) => {
                              e.stopPropagation()
                              updateClip(clip.id, { speed })
                              saveHistory()
                            }}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              clip.speed === speed
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Delete Button */}
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
      </div>

      {/* Footer Tips */}
      <div className="px-4 py-2 border-t border-gray-800 bg-dark text-xs text-gray-500">
        💡 Drag white trim bars to trim • <kbd className="px-1 bg-gray-800 rounded">Cmd/Ctrl+Z</kbd> Undo • <kbd className="px-1 bg-gray-800 rounded">S</kbd> Split • <kbd className="px-1 bg-gray-800 rounded">Space</kbd> Play/Pause
      </div>
    </div>
  )
}

export default Timeline
