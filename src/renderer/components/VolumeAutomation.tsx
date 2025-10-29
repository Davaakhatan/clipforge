import React, { useState, useRef, useCallback } from 'react'
import { VolumeKeyframe } from '../context/ProjectContext'

interface VolumeAutomationProps {
  clipId: string
  duration: number
  keyframes: VolumeKeyframe[]
  onAddKeyframe: (clipId: string, keyframe: VolumeKeyframe) => void
  onRemoveKeyframe: (clipId: string, keyframeTime: number) => void
  onUpdateKeyframe: (clipId: string, keyframeTime: number, updates: Partial<VolumeKeyframe>) => void
  currentTime: number
}

const VolumeAutomation: React.FC<VolumeAutomationProps> = ({
  clipId,
  duration,
  keyframes,
  onAddKeyframe,
  onRemoveKeyframe,
  onUpdateKeyframe,
  currentTime
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [draggedKeyframe, setDraggedKeyframe] = useState<VolumeKeyframe | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Convert time to percentage
  const timeToPercent = useCallback((time: number) => {
    return (time / duration) * 100
  }, [duration])

  // Convert percentage to time
  const percentToTime = useCallback((percent: number) => {
    return (percent / 100) * duration
  }, [duration])

  // Get volume at a specific time using keyframes
  const getVolumeAtTime = useCallback((time: number) => {
    if (!keyframes || keyframes.length === 0) return 1

    // Sort keyframes by time
    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time)
    
    // Find surrounding keyframes
    let beforeKeyframe: VolumeKeyframe | null = null
    let afterKeyframe: VolumeKeyframe | null = null

    for (let i = 0; i < sortedKeyframes.length; i++) {
      if (sortedKeyframes[i].time <= time) {
        beforeKeyframe = sortedKeyframes[i]
      }
      if (sortedKeyframes[i].time >= time && !afterKeyframe) {
        afterKeyframe = sortedKeyframes[i]
        break
      }
    }

    // If no keyframes, return default volume
    if (!beforeKeyframe && !afterKeyframe) return 1

    // If only one keyframe, return its volume
    if (!beforeKeyframe) return afterKeyframe!.volume
    if (!afterKeyframe) return beforeKeyframe.volume

    // If time matches a keyframe exactly
    if (beforeKeyframe.time === time) return beforeKeyframe.volume

    // Linear interpolation between keyframes
    const timeDiff = afterKeyframe.time - beforeKeyframe.time
    const volumeDiff = afterKeyframe.volume - beforeKeyframe.volume
    const progress = (time - beforeKeyframe.time) / timeDiff

    return beforeKeyframe.volume + (volumeDiff * progress)
  }, [keyframes])

  // Draw the automation curve
  const drawCurve = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw grid lines
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const y = (canvas.height / 10) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Draw volume curve
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.beginPath()

    const points = 100
    for (let i = 0; i <= points; i++) {
      const time = (i / points) * duration
      const volume = getVolumeAtTime(time)
      const x = (i / points) * canvas.width
      const y = canvas.height - (volume * canvas.height)

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    // Draw keyframes
    keyframes.forEach(keyframe => {
      const x = timeToPercent(keyframe.time) * (canvas.width / 100)
      const y = canvas.height - (keyframe.volume * canvas.height)

      ctx.fillStyle = '#3b82f6'
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.fill()

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.stroke()
    })

    // Draw current time indicator
    const currentTimePercent = timeToPercent(currentTime)
    const currentX = currentTimePercent * (canvas.width / 100)
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(currentX, 0)
    ctx.lineTo(currentX, canvas.height)
    ctx.stroke()
  }, [duration, keyframes, getVolumeAtTime, timeToPercent, currentTime])

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = (x / rect.width) * 100
    const time = percentToTime(percent)
    const volume = getVolumeAtTime(time)

    // Check if clicking on existing keyframe
    const clickedKeyframe = keyframes.find(kf => 
      Math.abs(timeToPercent(kf.time) - percent) < 2
    )

    if (clickedKeyframe) {
      setDraggedKeyframe(clickedKeyframe)
      setIsDragging(true)
    } else {
      // Add new keyframe
      onAddKeyframe(clipId, { time, volume })
    }
  }, [containerRef, percentToTime, getVolumeAtTime, keyframes, timeToPercent, onAddKeyframe, clipId])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !draggedKeyframe || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
    const time = percentToTime(percent)
    const volume = Math.max(0, Math.min(1, 1 - ((e.clientY - rect.top) / rect.height)))

    onUpdateKeyframe(clipId, draggedKeyframe.time, { time, volume })
  }, [isDragging, draggedKeyframe, containerRef, percentToTime, onUpdateKeyframe, clipId])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDraggedKeyframe(null)
  }, [])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = (x / rect.width) * 100
    const time = percentToTime(percent)

    // Remove keyframe if double-clicking on one
    const clickedKeyframe = keyframes.find(kf => 
      Math.abs(timeToPercent(kf.time) - percent) < 2
    )

    if (clickedKeyframe) {
      onRemoveKeyframe(clipId, clickedKeyframe.time)
    }
  }, [containerRef, percentToTime, keyframes, timeToPercent, onRemoveKeyframe, clipId])

  // Redraw when dependencies change
  React.useEffect(() => {
    drawCurve()
  }, [drawCurve])

  return (
    <div className="bg-gray-800/30 rounded p-2.5 border border-gray-700/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Volume Automation</span>
        </div>
        <div className="text-xs text-gray-400">
          {keyframes.length} keyframes
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mb-2">
        Click to add • Drag to move • Double-click to remove
      </div>
      
      <div 
        ref={containerRef}
        className="relative h-32 bg-gray-900 rounded border border-gray-700 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Volume labels */}
        <div className="absolute left-1 top-1 text-xs text-gray-400">100%</div>
        <div className="absolute left-1 top-1/2 text-xs text-gray-400">50%</div>
        <div className="absolute left-1 bottom-1 text-xs text-gray-400">0%</div>
      </div>
      
      {/* Keyframe list */}
      {keyframes.length > 0 && (
        <div className="mt-3 space-y-1 max-h-20 overflow-y-auto">
          {keyframes.map((keyframe, index) => (
            <div key={index} className="flex items-center justify-between text-xs bg-gray-700/50 rounded px-2 py-1">
              <span className="text-gray-300">
                {Math.floor(keyframe.time / 1000)}s
              </span>
              <span className="text-gray-300 font-mono">
                {Math.round(keyframe.volume * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default VolumeAutomation
