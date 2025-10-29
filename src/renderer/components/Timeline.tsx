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
  const [snappingEnabled, setSnappingEnabled] = useState(true)
  const [snapTarget, setSnapTarget] = useState<{ time: number; type: 'playhead' | 'clip-start' | 'clip-end' } | null>(null)
  
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

  // Enhanced snapping function with magnetic snap to playhead and clip edges
  const snapToPosition = (time: number, excludeClipId?: string): { snappedTime: number; target: { time: number; type: 'playhead' | 'clip-start' | 'clip-end' } | null } => {
    if (!snappingEnabled) {
      // Still snap to grid when snapping is off
      const gridInterval = 1000
      return { snappedTime: Math.round(time / gridInterval) * gridInterval, target: null }
    }

    const SNAP_THRESHOLD = 100 // 100ms threshold for snapping
    const snapTargets: Array<{ time: number; type: 'playhead' | 'clip-start' | 'clip-end' }> = []

    // Add playhead as snap target
    snapTargets.push({ time: state.currentTime, type: 'playhead' })

    // Add clip edges as snap targets
    state.clips.forEach(clip => {
      if (clip.id !== excludeClipId) {
        snapTargets.push({ time: clip.offset, type: 'clip-start' })
        snapTargets.push({ time: clip.offset + clip.duration, type: 'clip-end' })
      }
    })
    
    // Add audio clip edges as snap targets
    state.audioClips.forEach(clip => {
      if (clip.id !== excludeClipId) {
        snapTargets.push({ time: clip.offset, type: 'clip-start' })
        snapTargets.push({ time: clip.offset + clip.duration, type: 'clip-end' })
      }
    })

    // Find closest snap target
    let closestTarget: { time: number; type: 'playhead' | 'clip-start' | 'clip-end' } | null = null
    let closestDistance = Infinity

    snapTargets.forEach(target => {
      const distance = Math.abs(time - target.time)
      if (distance < SNAP_THRESHOLD && distance < closestDistance) {
        closestDistance = distance
        closestTarget = target
      }
    })

    // Snap to closest target if within threshold
    if (closestTarget) {
      const target = closestTarget as { time: number; type: 'playhead' | 'clip-start' | 'clip-end' }
      return { snappedTime: target.time, target: target }
    }

    // Otherwise snap to grid (1 second intervals)
    const gridInterval = 1000
    return { snappedTime: Math.round(time / gridInterval) * gridInterval, target: null }
  }

  // Legacy snap to grid function (for backward compatibility)
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


  // Handle clip drag
  const handleClipMouseDown = useCallback((e: ReactMouseEvent, clip: Clip) => {
    e.stopPropagation()
    
    // Check if clicking on trim handle or trim bar - these should NOT trigger drag
    const target = e.target as HTMLElement
    const isTrimBar = target.classList.contains('trim-bar') || target.closest('.trim-bar')
    const isTrimHandleZone = target.classList.contains('trim-handle-zone') || target.closest('.trim-handle-zone')
    
    if (isTrimBar || isTrimHandleZone) {
      return // Let trim handler manage it - don't drag
    }
    
    // Check if clicking on delete button
    const isDeleteButton = target.closest('button')?.classList.contains('bg-red-600')
    if (isDeleteButton) {
      return // Let delete handler manage it
    }
    
    // Otherwise, this is a drag operation - click anywhere else on the clip to move it
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
        const { snappedTime, target } = snapToPosition(newOffset, selectedClipId)
        setSnapTarget(target)
        updateAudioClip(selectedClipId, { offset: snappedTime })
        return
      }
      
      const clip = state.clips.find(c => c.id === selectedClipId)
      if (!clip) return

      if (isDraggingClip) {
        // Drag the entire clip
        const newOffset = Math.max(0, dragOffset.startTime + dt)
        const { snappedTime, target } = snapToPosition(newOffset, selectedClipId)
        setSnapTarget(target)
        updateClip(selectedClipId, { offset: snappedTime })
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
      setSnapTarget(null)
      
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
            <span className="text-xs text-gray-400">● Selected</span>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          {/* Zoom Presets */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleZoomPreset(0.5)}
              className={`px-2 py-1 rounded text-xs border transition-colors ${zoom === 0.5 ? 'bg-gray-700/50 border-gray-600/50 text-gray-300' : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-700/50 hover:border-gray-600/50'}`}
              title="50% Zoom"
            >
              50%
            </button>
            <button
              onClick={() => handleZoomPreset(1)}
              className={`px-2 py-1 rounded text-xs border transition-colors ${zoom === 1 ? 'bg-gray-700/50 border-gray-600/50 text-gray-300' : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-700/50 hover:border-gray-600/50'}`}
              title="100% Zoom"
            >
              100%
            </button>
            <button
              onClick={() => handleZoomPreset(2)}
              className={`px-2 py-1 rounded text-xs border transition-colors ${zoom === 2 ? 'bg-gray-700/50 border-gray-600/50 text-gray-300' : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-700/50 hover:border-gray-600/50'}`}
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

          {/* Snapping Toggle */}
          <div className="border-l border-gray-700 ml-2 pl-2">
            <button
              onClick={() => setSnappingEnabled(!snappingEnabled)}
              className={`px-3 py-1 rounded text-xs transition-colors border ${
                snappingEnabled 
                  ? 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50' 
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-700/50 hover:border-gray-600/50'
              }`}
              title={snappingEnabled ? 'Snapping: ON (Click to disable)' : 'Snapping: OFF (Click to enable)'}
            >
              {snappingEnabled ? 'Snap' : 'Snap'}
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
              className="absolute top-0 w-0.5 h-full bg-gray-400 z-20 pointer-events-none"
              style={{ left: `${timeToPx(state.currentTime)}px` }}
            >
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-400 rounded-full border border-gray-600"></div>
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
                <div>Text</div>
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
                      className={`absolute h-16 top-2 rounded border flex items-center justify-center cursor-pointer transition-all ${
                        isSelected
                          ? 'border-gray-400 bg-gray-800/30 ring-1 ring-gray-400'
                          : 'border-gray-600 bg-gray-800/20 hover:bg-gray-800/30'
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
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-300 truncate">
                            {overlay.text}
                          </p>
                          <p className="text-[10px] text-gray-500">
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
                          className="absolute -top-2 -right-2 w-5 h-5 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-gray-400 z-20"
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
                    className={`absolute h-28 top-2 rounded border flex flex-col cursor-move transition-all overflow-visible ${
                      isSelected
                        ? 'border-gray-300 ring-1 ring-gray-400'
                        : isMultiSelected
                        ? 'border-gray-400 ring-1 ring-gray-500'
                        : 'border-gray-600 hover:border-gray-500'
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
                        <div className="h-full bg-gray-700/50 flex items-center justify-center border border-gray-600/30">
                          <p className="text-xs text-gray-300">{formatTime(clip.duration)}</p>
                        </div>
                      )}
                      
                      {/* Clip name overlay */}
                      <div className="absolute top-1 left-1 right-1">
                        <p className="text-[10px] font-medium text-gray-200 bg-gray-900/70 px-1 rounded truncate">
                          {clip.name}
                        </p>
                      </div>
                      
                      {/* Duration overlay at bottom */}
                      <div className="absolute bottom-1 right-1">
                        <p className="text-[10px] text-gray-200 bg-gray-900/70 px-1 rounded">
                          {formatTime(clip.duration)}
                        </p>
                      </div>
                      
                      {/* Speed indicator */}
                      <div className="absolute bottom-1 left-1">
                        <p className="text-[10px] text-gray-200 bg-gray-900/70 px-1 rounded font-medium">
                          {clip.speed}x
                        </p>
                      </div>
                      
                      {/* Volume indicator - only show if not 100% */}
                      {clip.volume !== 1 && (
                        <div className="absolute bottom-1 left-[calc(0.25rem+2.5rem)]">
                          <p className="text-[10px] text-gray-200 bg-gray-900/70 px-1 rounded font-medium">
                            {Math.round(clip.volume * 100)}%
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
                        className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/50 rounded-full flex items-center justify-center text-gray-300 text-xs transition-colors"
                      >
                        ×
                      </button>
                    )}


                    {/* CapCut-style Trim Handles */}
                    {isSelected && (
                      <>
                        {/* Left trim handle - Only the thin white bar triggers resize */}
                        <div
                          className="trim-handle absolute left-0 top-0 bottom-0 w-6 cursor-ew-resize z-10 pointer-events-none"
                        >
                          {/* Thin white trim bar - ONLY this triggers resize, very small area */}
                          <div 
                            className={`trim-bar absolute left-0 top-0 bottom-0 w-1.5 bg-white border-r-2 border-gray-500 pointer-events-auto cursor-ew-resize z-10 ${isResizingClip === 'left' ? 'animate-pulse bg-gray-400 w-2' : ''}`}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              handleResizeStart(e, 'left', clip)
                            }}
                          />
                          
                          {/* Visual handle area - cosmetic only, NO pointer events so it doesn't interfere */}
                          <div 
                            className="trim-handle-zone absolute -left-6 top-0 bottom-0 w-6 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity pointer-events-none"
                          >
                            <div className="w-8 h-full bg-gray-700/30 border-2 border-gray-600 rounded flex flex-col items-center justify-center">
                              {/* Triple line indicator for drag */}
                              <div className="space-y-1">
                                <div className="w-4 h-0.5 bg-gray-500" />
                                <div className="w-4 h-0.5 bg-gray-500" />
                                <div className="w-4 h-0.5 bg-gray-500" />
                              </div>
                            </div>
                          </div>

                          {/* Show trim feedback during drag */}
                          {trimFeedback.side === 'left' && trimFeedback.clipId === clip.id && (
                            <div className="absolute -top-8 left-2 text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700 whitespace-nowrap pointer-events-none">
                              -{formatTime(trimFeedback.newDuration)}
                            </div>
                          )}
                        </div>

                        {/* Right trim handle - Only the white bar triggers resize */}
                        <div
                          className="trim-handle absolute right-0 top-0 bottom-0 w-6 cursor-ew-resize z-10 pointer-events-none"
                        >
                          {/* White trim bar - ONLY this triggers resize, rest of clip triggers drag */}
                          <div 
                            className={`trim-bar absolute right-0 top-0 bottom-0 w-1.5 bg-white border-l-2 border-gray-500 pointer-events-auto cursor-ew-resize z-10 ${isResizingClip === 'right' ? 'animate-pulse bg-gray-400 w-2' : ''}`}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              handleResizeStart(e, 'right', clip)
                            }}
                          />
                          
                          {/* Visual handle area - cosmetic only, NO pointer events so it doesn't interfere */}
                          <div 
                            className="trim-handle-zone absolute -right-6 top-0 bottom-0 w-6 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity pointer-events-none"
                          >
                            <div className="w-8 h-full bg-gray-700/30 border-2 border-gray-600 rounded flex flex-col items-center justify-center">
                              {/* Triple line indicator for drag */}
                              <div className="space-y-1">
                                <div className="w-4 h-0.5 bg-gray-500" />
                                <div className="w-4 h-0.5 bg-gray-500" />
                                <div className="w-4 h-0.5 bg-gray-500" />
                              </div>
                            </div>
                          </div>

                          {/* Show trim feedback during drag */}
                          {trimFeedback.side === 'right' && trimFeedback.clipId === clip.id && (
                            <div className="absolute -top-8 right-2 text-xs bg-gray-800/90 text-gray-300 px-2 py-1 rounded border border-gray-700 whitespace-nowrap pointer-events-none">
                              -{formatTime(trimFeedback.newDuration)}
                            </div>
                          )}
                        </div>

                      </>
                    )}
                  </div>
                )
              })}

              {/* Snap Target Indicator - Yellow line when snapping */}
              {snapTarget && snappingEnabled && isDraggingClip && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-500 z-15 pointer-events-none"
                  style={{ left: `${timeToPx(snapTarget.time)}px` }}
                >
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-[9px] text-gray-300 font-medium bg-gray-800 px-1 rounded border border-gray-700 whitespace-nowrap">
                    SNAPPED
                  </div>
                </div>
              )}

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
              <div>Audio {track.id + 1}</div>
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
                    className={`absolute h-16 top-2 rounded border flex items-center justify-center cursor-move transition-all overflow-visible ${
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
                    <div className="flex-1 h-full bg-gray-700/50 flex items-center justify-center rounded border border-gray-600/30">
                      <div className="px-2 py-1 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                        <p className="text-[10px] font-medium text-gray-300 truncate">{clip.name}</p>
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
                        className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/50 rounded-full flex items-center justify-center text-gray-300 text-xs transition-colors"
                      >
                        ×
                      </button>
                    )}

                    {/* Volume indicator */}
                    {clip.volume !== 1 && (
                      <div className="absolute -bottom-6 left-1">
                        <p className="text-[10px] text-gray-300 bg-gray-800/80 border border-gray-600/50 px-1 rounded font-medium">
                          {Math.round(clip.volume * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Snap Target Indicator - Yellow line when snapping audio clips */}
              {snapTarget && snappingEnabled && isDraggingAudioClip && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-500 z-15 pointer-events-none"
                  style={{ left: `${timeToPx(snapTarget.time)}px` }}
                >
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-[9px] text-gray-300 font-medium bg-gray-800 px-1 rounded border border-gray-700 whitespace-nowrap">
                    SNAPPED
                  </div>
                </div>
              )}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-gray-400 z-20"
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
                className="absolute h-full bg-gray-600 rounded-sm border border-gray-500"
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
                className="absolute h-full bg-gray-500 rounded-sm border border-gray-400"
                style={{
                  left: `${(clip.offset / totalDuration) * 100}%`,
                  width: `${(clip.duration / totalDuration) * 100}%`,
                }}
              />
            ))}
            
            {/* Viewport indicator */}
            <div
              className="absolute top-0 h-full border border-gray-400 bg-gray-700/30 pointer-events-none"
              style={{
                left: `${Math.max(0, (state.currentTime - viewportWidth / 2 / zoom) / totalDuration) * 100}%`,
                width: `${(viewportWidth / zoom / totalDuration) * 100}%`,
              }}
            />
            
            {/* Current time indicator */}
            <div
              className="absolute top-0 w-0.5 h-full bg-gray-300 pointer-events-none"
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
        Drag white trim bars to trim • <kbd className="px-1 bg-gray-800 rounded">Delete</kbd> Remove • <kbd className="px-1 bg-gray-800 rounded">Cmd/Ctrl+Z</kbd> Undo • <kbd className="px-1 bg-gray-800 rounded">S</kbd> Split • <kbd className="px-1 bg-gray-800 rounded">Space</kbd> Play/Pause
        {snappingEnabled && (
          <span className="ml-2 text-gray-400">• Snap ON: Drag clips near playhead/edges to auto-align</span>
        )}
      </div>
    </div>
  )
}

export default Timeline
