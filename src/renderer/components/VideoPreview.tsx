import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useProject } from '../context/ProjectContext'

const VideoPreview: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const { state, setCurrentTime, setPlaying, updateTextOverlay, saveHistory, setTextEditing } = useProject()
  const isSeekingRef = useRef(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null)
  const [editedText, setEditedText] = useState('')
  const [isDraggingText, setIsDraggingText] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // Get the currently playing clip (if any)
  const currentClip = state.tracks
    .flatMap(track => track.clips)
    .find(clip => {
      const startTime = clip.offset
      const endTime = startTime + clip.duration
      return state.currentTime >= startTime && state.currentTime <= endTime
    })

  // Get currently playing audio clips
  const currentAudioClips = state.audioTracks
    .flatMap(track => track.clips)
    .filter(clip => {
      const startTime = clip.offset
      const endTime = startTime + clip.duration
      return state.currentTime >= startTime && state.currentTime <= endTime
    })

  // Handle mouse move for dragging text
  useEffect(() => {
    if (!isDraggingText) return

    // Get the current clip for this effect
    const currentClip = state.tracks
      .flatMap(track => track.clips)
      .find(clip => {
        const startTime = clip.offset
        const endTime = startTime + clip.duration
        return state.currentTime >= startTime && state.currentTime <= endTime
      })

    const handleMouseMove = (e: MouseEvent) => {
      if (!currentClip || !previewContainerRef.current) return
      const rect = previewContainerRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100
      const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100
      
      // Find the overlay being dragged
      const overlay = currentClip.textOverlays?.find(o => o.id === isDraggingText)
      if (overlay) {
        updateTextOverlay(currentClip.id, overlay.id, {
          position: {
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y))
          }
        })
      }
    }

    const handleMouseUp = () => {
      if (isDraggingText) {
        saveHistory()
      }
      setIsDraggingText(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingText, dragOffset, state.tracks, state.currentTime, updateTextOverlay, saveHistory])

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

  // Apply playback speed
  useEffect(() => {
    const video = videoRef.current
    if (video && currentClip) {
      video.playbackRate = currentClip.speed || 1
    }
  }, [currentClip, videoRef])

  // Apply volume
  useEffect(() => {
    const video = videoRef.current
    if (video && currentClip) {
      video.volume = currentClip.volume ?? 1
    }
  }, [currentClip])

  // Sync video position when playhead moves while paused
  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentClip || state.isPlaying) return
    
    const timeInClip = state.currentTime - currentClip.offset
    if (timeInClip >= 0 && timeInClip <= currentClip.duration) {
      video.currentTime = timeInClip / 1000
    }
  }, [state.currentTime, currentClip, state.isPlaying])

  // Get volume at specific time using keyframes
  const getVolumeFromKeyframes = useCallback((clip: any, timeInClip: number) => {
    if (!clip.volumeKeyframes || clip.volumeKeyframes.length === 0) {
      return clip.volume
    }

    // Sort keyframes by time
    const sortedKeyframes = [...clip.volumeKeyframes].sort((a, b) => a.time - b.time)
    
    // Find surrounding keyframes
    let beforeKeyframe: any = null
    let afterKeyframe: any = null

    for (let i = 0; i < sortedKeyframes.length; i++) {
      if (sortedKeyframes[i].time <= timeInClip) {
        beforeKeyframe = sortedKeyframes[i]
      }
      if (sortedKeyframes[i].time >= timeInClip && !afterKeyframe) {
        afterKeyframe = sortedKeyframes[i]
        break
      }
    }

    // If no keyframes, return base volume
    if (!beforeKeyframe && !afterKeyframe) return clip.volume

    // If only one keyframe, return its volume
    if (!beforeKeyframe) return afterKeyframe.volume
    if (!afterKeyframe) return beforeKeyframe.volume

    // If time matches a keyframe exactly
    if (beforeKeyframe.time === timeInClip) return beforeKeyframe.volume

    // Linear interpolation between keyframes
    const timeDiff = afterKeyframe.time - beforeKeyframe.time
    const volumeDiff = afterKeyframe.volume - beforeKeyframe.volume
    const progress = (timeInClip - beforeKeyframe.time) / timeDiff

    return beforeKeyframe.volume + (volumeDiff * progress)
  }, [])

  // Sync audio tracks with video playback
  useEffect(() => {
    currentAudioClips.forEach((clip) => {
      let audioEl = audioRefs.current[clip.id]
      if (!audioEl) {
        audioEl = document.createElement('audio')
        audioEl.src = `file://${clip.filePath}`
        audioEl.preload = 'metadata' // Only load metadata initially
        audioEl.crossOrigin = 'anonymous'
        audioRefs.current[clip.id] = audioEl
      }

      const timeInClip = state.currentTime - clip.offset
      
      // Apply sync offset
      const syncOffset = clip.syncOffset || 0
      const adjustedTimeInClip = timeInClip + syncOffset
      
      if (adjustedTimeInClip >= 0 && adjustedTimeInClip <= clip.duration) {
        // Only update currentTime if it's significantly different to avoid glitches
        const targetTime = adjustedTimeInClip / 1000
        if (Math.abs(audioEl.currentTime - targetTime) > 0.1) {
          audioEl.currentTime = targetTime
        }
        
        // Calculate fade effects
        let fadeMultiplier = 1
        if (clip.fadeIn && adjustedTimeInClip < clip.fadeIn) {
          fadeMultiplier = adjustedTimeInClip / clip.fadeIn
        } else if (clip.fadeOut && adjustedTimeInClip > (clip.duration - clip.fadeOut)) {
          const fadeOutStart = clip.duration - clip.fadeOut
          fadeMultiplier = 1 - ((adjustedTimeInClip - fadeOutStart) / clip.fadeOut)
        }
        
        // Calculate crossfade effects
        let crossfadeMultiplier = 1
        if (clip.crossfadeIn && adjustedTimeInClip < clip.crossfadeIn) {
          // Crossfade in: gradually increase volume from 0 to full
          crossfadeMultiplier = adjustedTimeInClip / clip.crossfadeIn
        } else if (clip.crossfadeOut && adjustedTimeInClip > (clip.duration - clip.crossfadeOut)) {
          // Crossfade out: gradually decrease volume from full to 0
          const crossfadeOutStart = clip.duration - clip.crossfadeOut
          crossfadeMultiplier = 1 - ((adjustedTimeInClip - crossfadeOutStart) / clip.crossfadeOut)
        }
        
        // Get volume from keyframes
        const keyframeVolume = getVolumeFromKeyframes(clip, adjustedTimeInClip)
        
        // Get track controls
        const track = state.audioTracks.find(t => t.id === clip.trackId)
        const trackVolume = track?.volume || 1
        const trackMute = track?.mute || false
        const trackSolo = track?.solo || false
        
        // Check if any other track is soloed
        const anySolo = state.audioTracks.some(t => t.solo)
        const shouldPlay = !trackMute && (!anySolo || trackSolo)
        
        // Apply track pan (simplified - just affects volume balance)
        const panMultiplier = track?.pan ? (track.pan > 0 ? 1 - track.pan * 0.5 : 1 + track.pan * 0.5) : 1
        
        // Calculate final volume with all factors
        const baseVolume = keyframeVolume * fadeMultiplier * crossfadeMultiplier * trackVolume * panMultiplier
        const masterVolume = state.masterMute ? 0 : state.masterVolume
        const targetVolume = shouldPlay ? baseVolume * masterVolume : 0
        if (Math.abs(audioEl.volume - targetVolume) > 0.01) {
          audioEl.volume = targetVolume
        }
        
        if (state.isPlaying && audioEl.paused) {
          audioEl.play().catch(() => {
            // Ignore play interruption errors
          })
        } else if (!state.isPlaying && !audioEl.paused) {
          audioEl.pause()
        }
      } else {
        if (!audioEl.paused) {
          audioEl.pause()
        }
      }
    })

        // Pause audio clips that are no longer playing
        const activeClipIds = new Set(currentAudioClips.map(clip => clip.id))
        Object.keys(audioRefs.current).forEach(clipId => {
          if (!activeClipIds.has(clipId) && audioRefs.current[clipId] && !audioRefs.current[clipId].paused) {
            audioRefs.current[clipId].pause()
          }
        })
  }, [currentAudioClips, state.currentTime, state.isPlaying])

  // Cleanup audio elements when component unmounts or clips change
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audioEl => {
        if (audioEl) {
          audioEl.pause()
          audioEl.src = ''
        }
      })
      audioRefs.current = {}
    }
  }, [])

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

  // Calculate fade opacity (legacy fadeIn/fadeOut)
  const getFadeOpacity = () => {
    if (!currentClip || !state.isPlaying) return 1
    
    const timeInClip = state.currentTime - currentClip.offset
    const fadeInEnd = (currentClip.fadeIn || 0) * currentClip.duration
    const fadeOutStart = currentClip.duration - ((currentClip.fadeOut || 0) * currentClip.duration)
    
    if (timeInClip < fadeInEnd) {
      // Fade in
      return timeInClip / fadeInEnd
    } else if (timeInClip > fadeOutStart) {
      // Fade out
      return 1 - ((timeInClip - fadeOutStart) / (currentClip.duration - fadeOutStart))
    }
    
    return 1
  }

  // Calculate transition effects (new transitionIn/transitionOut)
  const getTransitionEffects = () => {
    if (!currentClip) return { opacity: 1, transform: 'none', filter: 'none', scale: 1 }
    
    const timeInClip = state.currentTime - currentClip.offset
    const transitionDuration = currentClip.transitionDuration || 500
    const transitionIn = currentClip.transitionIn || 'none'
    const transitionOut = currentClip.transitionOut || 'none'
    
    const effects = { opacity: 1, transform: 'none', filter: 'none', scale: 1 }
    
    // Transition In
    if (timeInClip < transitionDuration && transitionIn !== 'none') {
      const progress = timeInClip / transitionDuration
      
      switch (transitionIn) {
        case 'fade':
          effects.opacity = progress
          break
        case 'slide-left':
          effects.transform = `translateX(${(1 - progress) * 100}%)`
          effects.opacity = progress
          break
        case 'slide-right':
          effects.transform = `translateX(${-(1 - progress) * 100}%)`
          effects.opacity = progress
          break
        case 'slide-up':
          effects.transform = `translateY(${(1 - progress) * 100}%)`
          effects.opacity = progress
          break
        case 'slide-down':
          effects.transform = `translateY(${-(1 - progress) * 100}%)`
          effects.opacity = progress
          break
        case 'zoom-in':
          effects.scale = 0.5 + (progress * 0.5)
          effects.opacity = progress
          break
        case 'zoom-out':
          effects.scale = 1 + ((1 - progress) * 0.5)
          effects.opacity = progress
          break
        case 'blur':
          effects.filter = `blur(${(1 - progress) * 10}px)`
          effects.opacity = progress
          break
      }
    }
    
    // Transition Out
    const transitionOutStart = currentClip.duration - transitionDuration
    if (timeInClip > transitionOutStart && transitionOut !== 'none') {
      const progress = (timeInClip - transitionOutStart) / transitionDuration
      
      switch (transitionOut) {
        case 'fade':
          effects.opacity = Math.min(effects.opacity, 1 - progress)
          break
        case 'slide-left':
          effects.transform = `translateX(${progress * 100}%)`
          effects.opacity = Math.min(effects.opacity, 1 - progress)
          break
        case 'slide-right':
          effects.transform = `translateX(${-progress * 100}%)`
          effects.opacity = Math.min(effects.opacity, 1 - progress)
          break
        case 'slide-up':
          effects.transform = `translateY(${progress * 100}%)`
          effects.opacity = Math.min(effects.opacity, 1 - progress)
          break
        case 'slide-down':
          effects.transform = `translateY(${-progress * 100}%)`
          effects.opacity = Math.min(effects.opacity, 1 - progress)
          break
        case 'zoom-in':
          effects.scale = 1 + (progress * 0.5)
          effects.opacity = Math.min(effects.opacity, 1 - progress)
          break
        case 'zoom-out':
          effects.scale = 1 - (progress * 0.5)
          effects.opacity = Math.min(effects.opacity, 1 - progress)
          break
        case 'blur':
          effects.filter = `blur(${progress * 10}px)`
          effects.opacity = Math.min(effects.opacity, 1 - progress)
          break
      }
    }
    
    return effects
  }

  const fadeOpacity = getFadeOpacity()
  const transitionEffects = getTransitionEffects()

  // Get CSS filter for video effects
  const getVideoFilter = () => {
    if (!currentClip) return ''
    
    const filters: string[] = []
    
    // Brightness: -100 to 100, where 0 = normal, -100 = black, 100 = 2x brightness
    const brightness = currentClip.brightness || 0
    if (brightness !== 0) {
      const brightnessValue = 1 + (brightness / 100)
      filters.push(`brightness(${brightnessValue})`)
    }
    
    // Contrast: -100 to 100, where 0 = normal, -100 = no contrast, 100 = high contrast
    const contrast = currentClip.contrast || 0
    if (contrast !== 0) {
      const contrastValue = 1 + (contrast / 100)
      filters.push(`contrast(${contrastValue})`)
    }
    
    // Saturation: -100 to 100, where 0 = normal, -100 = grayscale, 100 = double saturation
    const saturation = currentClip.saturation || 0
    if (saturation !== 0) {
      const saturationValue = 1 + (saturation / 100)
      filters.push(`saturate(${saturationValue})`)
    }
    
    // Blur: 0 to 100 pixels
    const blur = currentClip.blur || 0
    if (blur > 0) {
      filters.push(`blur(${blur / 10}px)`) // Convert 0-100 to 0-10px for reasonable blur
    }
    
    // Sharpen: 0 to 100 (using contrast trick)
    const sharpen = currentClip.sharpen || 0
    if (sharpen > 0) {
      // Sharpen is achieved by increasing contrast around edges
      filters.push(`contrast(${1 + sharpen / 50})`) // Boost contrast for sharpening effect
    }
    
    // Grayscale: 0 to 100 percentage
    const grayscale = currentClip.grayscale || 0
    if (grayscale > 0) {
      filters.push(`grayscale(${grayscale}%)`)
    }
    
    // Sepia: 0 to 100 percentage
    const sepia = currentClip.sepia || 0
    if (sepia > 0) {
      filters.push(`sepia(${sepia}%)`)
    }
    
    // Vintage effect: combination of sepia, reduced saturation, slight blur
    if (currentClip.vintage) {
      filters.push('sepia(40%) saturate(80%) contrast(1.1) brightness(0.95)')
      if (!filters.find(f => f.startsWith('blur'))) {
        filters.push('blur(0.5px)') // Subtle blur for vintage look
      }
    }
    
    return filters.join(' ') || 'none'
  }

  const videoFilter = getVideoFilter()

  // Get transform for rotation and flip
  const getRotationTransform = () => {
    if (!currentClip) return 'none'
    
    const transforms: string[] = []
    
    // Rotation
    const rotation = currentClip.rotation || 0
    if (rotation !== 0) {
      transforms.push(`rotate(${rotation}deg)`)
    }
    
    // Horizontal flip
    if (currentClip.flipHorizontal) {
      transforms.push('scaleX(-1)')
    }
    
    // Vertical flip
    if (currentClip.flipVertical) {
      transforms.push('scaleY(-1)')
    }
    
    return transforms.join(' ') || 'none'
  }

  const rotationTransform = getRotationTransform()

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    
    const clipId = e.dataTransfer.getData('text/plain')
    if (clipId && state.clips.find(clip => clip.id === clipId)) {
      // Find the clip and seek to it
      const clip = state.clips.find(clip => clip.id === clipId)
      if (clip) {
        setCurrentTime(clip.offset)
        setPlaying(false)
      }
    }
  }, [state.clips, setCurrentTime, setPlaying])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
  }, [])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={previewContainerRef}
        className="flex-1 bg-dark-secondary border border-gray-800 rounded overflow-hidden relative flex items-center justify-center group"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
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
              muted={currentClip.muted || false}
              playsInline={true}
              style={{
                opacity: transitionEffects.opacity !== 1 ? transitionEffects.opacity : fadeOpacity,
                transform: [
                  rotationTransform !== 'none' ? rotationTransform : '',
                  transitionEffects.transform !== 'none' ? transitionEffects.transform : '',
                  transitionEffects.scale !== 1 ? `scale(${transitionEffects.scale})` : ''
                ].filter(t => t).join(' ') || 'none',
                filter: transitionEffects.filter !== 'none' ? transitionEffects.filter : videoFilter,
                transition: 'opacity 0.1s linear, transform 0.1s linear, filter 0.1s linear',
              }}
            />
            
            {/* Fade overlay indicator */}
            {currentClip.fadeIn && currentClip.fadeIn > 0 && (
              <div className="absolute top-2 left-2 bg-gray-800/80 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600/50 font-medium">
                Fade In: {Math.round((currentClip.fadeIn || 0) * 100)}%
              </div>
            )}
            
            {currentClip.fadeOut && currentClip.fadeOut > 0 && (
              <div className="absolute top-2 right-2 bg-gray-800/80 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600/50 font-medium">
                Fade Out: {Math.round((currentClip.fadeOut || 0) * 100)}%
              </div>
            )}

            {/* Text Overlays */}
            {currentClip.textOverlays && currentClip.textOverlays.map(overlay => {
              const timeInClip = state.currentTime - currentClip.offset
              const isVisible = timeInClip >= overlay.startTime && timeInClip <= overlay.endTime
              const isEditing = editingOverlayId === overlay.id
              
              if (!isVisible) return null
              
              return (
                <div
                  key={overlay.id}
                  className={`absolute ${isDraggingText === overlay.id ? 'cursor-grabbing' : 'cursor-move'} hover:outline hover:outline-1 hover:outline-gray-400 z-50 group`}
                  style={{
                    left: `${overlay.position.x}%`,
                    top: `${overlay.position.y}%`,
                    transform: 'translate(-50%, -50%)',
                    textAlign: overlay.alignment,
                    fontSize: `${overlay.fontSize}px`,
                    fontFamily: overlay.fontFamily,
                    color: overlay.color,
                  }}
                  onMouseDown={(e) => {
                    if (editingOverlayId === overlay.id) return // Don't drag while editing
                    e.preventDefault()
                    setIsDraggingText(overlay.id)
                    const rect = e.currentTarget.getBoundingClientRect()
                    setDragOffset({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top
                    })
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    if (!state.isPlaying) {
                      setEditingOverlayId(overlay.id)
                      setEditedText(overlay.text)
                      setTextEditing(true) // Set the flag when starting to edit
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  title="Drag to move, double-click to edit text"
                >
                  {isEditing ? (
                    <div onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        onBlur={() => {
                          updateTextOverlay(currentClip.id, overlay.id, { text: editedText })
                          saveHistory()
                          setEditingOverlayId(null)
                          setTextEditing(false) // Clear the flag when done editing
                        }}
                        onKeyDown={(e) => {
                          // Stop propagation for all keys to prevent triggering app shortcuts
                          e.stopPropagation()
                          
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            updateTextOverlay(currentClip.id, overlay.id, { text: editedText })
                            saveHistory()
                            setEditingOverlayId(null)
                            setTextEditing(false) // Clear the flag when done editing
                          } else if (e.key === 'Escape') {
                            e.preventDefault()
                            setEditingOverlayId(null)
                            setTextEditing(false) // Clear the flag when canceling
                          }
                          // For Delete and Backspace, just stop propagation - let the input handle it normally
                        }}
                        autoFocus
                        className="bg-gray-900/90 text-gray-300 px-2 py-1 rounded border border-gray-600/50"
                        style={{
                          fontSize: `${overlay.fontSize}px`,
                          fontFamily: overlay.fontFamily,
                          color: overlay.color,
                        }}
                      />
                    </div>
                  ) : (
                    <span className="whitespace-nowrap">{overlay.text}</span>
                  )}
                </div>
              )
            })}
            
            {/* Progress bar on video */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 cursor-pointer"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-gray-600 transition-all"
                style={{ width: `${((state.currentTime) / (currentClip.duration)) * 100}%` }}
              />
            </div>

            {/* Play overlay button */}
            {!state.isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 cursor-pointer z-30" onClick={handlePlayPause}>
                <button className="w-16 h-16 bg-gray-800/80 hover:bg-gray-700/80 rounded-full flex items-center justify-center transition-all border border-gray-600/50">
                  <svg className="w-10 h-10 ml-1" fill="white" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-500 text-center">
            <svg className="w-12 h-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium">Import a video to see preview</p>
            <p className="text-xs text-gray-600 mt-2">Drag & drop or click "Import Video"</p>
          </div>
        )}

        {/* Drop overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-gray-800/20 border-2 border-dashed border-gray-600/50 flex items-center justify-center z-50">
            <div className="text-center">
              <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium text-gray-300">Drop to preview</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      {currentClip && (
        <div className="mt-6 w-full">
          {/* Progress bar and time */}
          <div className="w-full flex items-center gap-4 px-2 mb-3">
            <div className="flex-1 h-2.5 bg-gray-800 rounded-full cursor-pointer relative group" onClick={handleSeek}>
              <div 
                className="h-full bg-gray-600 rounded-full transition-all relative"
                style={{ width: `${((state.currentTime) / (currentClip.duration)) * 100}%` }}
              >
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-gray-500" />
              </div>
            </div>

            <div className="text-xs text-gray-300 font-mono min-w-[100px] text-right">
              {formatTime(state.currentTime)} / {formatTime(currentClip.duration)}
            </div>
          </div>

          {/* Playback controls */}
          <div className="w-full flex items-center justify-center gap-1 px-2">
            {/* First Group - Standard Playback Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const newTime = currentClip.offset
                  setCurrentTime(newTime)
                  setPlaying(false)
                }}
                className="px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded border border-gray-700/50 text-gray-300 transition-colors flex items-center gap-1"
                title="Rewind to Start"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
                <svg className="w-3 h-3 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h2m0 0h2m-2 0V5z" />
                </svg>
              </button>

              <button
                onClick={() => {
                  const newTime = Math.max(currentClip.offset, state.currentTime - 100)
                  setCurrentTime(newTime)
                  setPlaying(false)
                }}
                className="px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded border border-gray-700/50 text-gray-300 transition-colors flex items-center"
                title="Step Backward"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={() => {
                  const newTime = Math.min(currentClip.offset + currentClip.duration, state.currentTime + 100)
                  setCurrentTime(newTime)
                  setPlaying(false)
                }}
                className="px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded border border-gray-700/50 text-gray-300 transition-colors flex items-center"
                title="Step Forward"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => {
                  const newTime = currentClip.offset + currentClip.duration
                  setCurrentTime(newTime)
                  setPlaying(false)
                }}
                className="px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded border border-gray-700/50 text-gray-300 transition-colors flex items-center gap-1"
                title="Fast Forward to End"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h2m0 0h2m-2 0V5z" />
                </svg>
                <svg className="w-3 h-3 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Separator */}
            <div className="w-px h-4 bg-gray-700/50 mx-1" />

            {/* Second Group - Time-Based Jump Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const newTime = Math.max(currentClip.offset, state.currentTime - 1000)
                  setCurrentTime(newTime)
                  setPlaying(false)
                }}
                className="px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded border border-gray-700/50 text-gray-300 transition-colors flex items-center gap-1 text-xs"
                title="Jump Backward 1 Second"
              >
                <span className="text-xs font-medium">1s</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={() => {
                  const newTime = Math.min(currentClip.offset + currentClip.duration, state.currentTime + 1000)
                  setCurrentTime(newTime)
                  setPlaying(false)
                }}
                className="px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded border border-gray-700/50 text-gray-300 transition-colors flex items-center gap-1 text-xs"
                title="Jump Forward 1 Second"
              >
                <span className="text-xs font-medium">1s</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => {
                  const newTime = Math.max(currentClip.offset, state.currentTime - 5000)
                  setCurrentTime(newTime)
                  setPlaying(false)
                }}
                className="px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded border border-gray-700/50 text-gray-300 transition-colors flex items-center gap-1 text-xs"
                title="Jump Backward 5 Seconds"
              >
                <span className="text-xs font-medium">5s</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={() => {
                  const newTime = Math.min(currentClip.offset + currentClip.duration, state.currentTime + 5000)
                  setCurrentTime(newTime)
                  setPlaying(false)
                }}
                className="px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded border border-gray-700/50 text-gray-300 transition-colors flex items-center gap-1 text-xs"
                title="Jump Forward 5 Seconds"
              >
                <span className="text-xs font-medium">5s</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Separator */}
            <div className="w-px h-4 bg-gray-700/50 mx-1" />

            {/* Play/Pause button */}
            <button
              onClick={handlePlayPause}
              className="px-3 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded border border-gray-700/50 text-gray-300 transition-colors flex items-center"
              title={state.isPlaying ? 'Pause' : 'Play'}
            >
              {state.isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Stop button */}
            <button
              onClick={handleStop}
              className="px-3 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded border border-gray-700/50 text-gray-300 transition-colors flex items-center"
              title="Stop"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoPreview
