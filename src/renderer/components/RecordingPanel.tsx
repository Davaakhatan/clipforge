import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useProject, Clip } from '../context/ProjectContext'

// Helper to generate unique ID
const generateId = () => Math.random().toString(36).substring(7)

const RecordingPanel: React.FC = () => {
  const { addClip } = useProject()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState<'screen' | 'webcam' | 'pip' | null>(null)
  const [includeAudio, setIncludeAudio] = useState(true)
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null)
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const [availableSources, setAvailableSources] = useState<any[]>([])
  const [recordingTime, setRecordingTime] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null)

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      setRecordingTime(0)
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [isRecording])

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Start recording with proper error handling
  const startRecording = useCallback(async (type: 'screen' | 'webcam' | 'pip') => {
    try {
      console.log('[RecordingPanel] Starting recording type:', type)
      let stream: MediaStream | null = null

      if (type === 'screen') {
        // Get screen sources from main process
        const sources = await window.electronAPI.ipc.invoke('getScreenSources')
        
        if (!sources || sources.length === 0) {
          const grantPermission = confirm(
            'ClipForge needs screen recording permission.\n\n' +
            'To enable:\n' +
            '1. Open System Settings\n' +
            '2. Go to Privacy & Security\n' +
            '3. Click "Screen Recording"\n' +
            '4. Enable "ClipForge"\n\n' +
            'Would you like to open System Settings now?'
          )
          
          if (grantPermission) {
            await window.electronAPI.ipc.invoke('openScreenRecordingSettings')
          }
          return
        }
        
        console.log('[RecordingPanel] Screen sources available:', sources.length)
        
        // Show source picker modal
        setAvailableSources(sources)
        setShowSourcePicker(true)
        return
      } else if (type === 'webcam') {
        console.log('[RecordingPanel] Starting webcam recording')
        const constraints: any = {
          video: { width: 1280, height: 720, facingMode: 'user' },
        }
        
        if (includeAudio) {
          constraints.audio = { echoCancellation: true, noiseSuppression: true }
        }
        
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } else if (type === 'pip') {
        console.log('[RecordingPanel] Starting PiP recording')
        const sources = await window.electronAPI.ipc.invoke('getScreenSources')
        
        if (!sources || !Array.isArray(sources) || sources.length === 0) {
          alert('No screen sources available.')
          return
        }
        
        const entireScreen = sources.find((s: any) => s.name === 'Entire Screen')
        const selectedSource = entireScreen || sources[0]
        
        if (!selectedSource || !selectedSource.id) {
          alert('No valid screen source available.')
          return
        }
        
        const constraints: any = {
          video: {
            // @ts-ignore - Electron specific
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: selectedSource.id,
            },
          },
        }
        
      // Note: Audio from desktop sources requires separate getUserMedia call
      // We'll only request video here for now
        
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      }

      if (stream) {
        console.log('[RecordingPanel] Stream obtained, starting MediaRecorder')
        await startRecordingFromStream(stream, type)
      }
    } catch (error: any) {
      console.error('[RecordingPanel] Error starting recording:', error)
      alert(`Failed to start recording: ${error.message || 'Unknown error'}. Please ensure permissions are granted.`)
    }
  }, [includeAudio])

  // Handle source selection for screen recording
  const handleSourceSelect = useCallback(async (source: any) => {
    try {
      console.log('[RecordingPanel] Source selected:', source.name, 'ID:', source.id, 'Type:', source.id.startsWith('screen:') ? 'Screen' : 'Window')
      setShowSourcePicker(false)
      
      const constraints: any = {
        video: {
          // @ts-ignore - Electron specific
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
          },
        },
      }
      
      console.log('[RecordingPanel] Media constraints:', JSON.stringify(constraints, null, 2))
      
      console.log('[RecordingPanel] Getting user media with constraints:', constraints)
      const videoStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Get audio from microphone if enabled
      let audioStream: MediaStream | null = null
      if (includeAudio) {
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true } 
          })
          console.log('[RecordingPanel] Microphone audio stream obtained')
        } catch (audioError) {
          console.error('[RecordingPanel] Failed to get microphone audio:', audioError)
          alert('Could not access microphone. Recording without audio.')
        }
      }
      
      if (videoStream) {
        // Merge audio stream with video stream if available
        if (audioStream) {
          audioStream.getAudioTracks().forEach(track => {
            videoStream.addTrack(track)
            console.log('[RecordingPanel] Added audio track to video stream')
          })
        }
        
        console.log('[RecordingPanel] Stream obtained from source selection')
        await startRecordingFromStream(videoStream, 'screen')
      }
    } catch (error: any) {
      console.error('[RecordingPanel] Error selecting source:', error)
      alert(`Failed to start recording: ${error.message || 'Unknown error'}`)
    }
  }, [includeAudio])

  // Start recording from a MediaStream
  const startRecordingFromStream = async (stream: MediaStream, type: 'screen' | 'webcam' | 'pip') => {
    console.log('[RecordingPanel] startRecordingFromStream called')
    
    // Clear previous chunks
    chunksRef.current = []
    
    // Create a hidden video element to render the stream
    const video = document.createElement('video')
    video.srcObject = stream
    video.muted = true
    video.autoplay = true
    video.playsInline = true
    video.style.display = 'none'
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    document.body.appendChild(video)
    hiddenVideoRef.current = video
    
    // Explicitly play the video and wait for it to be ready
    try {
      await video.play()
      console.log('[RecordingPanel] Video element playing')
    } catch (error) {
      console.error('[RecordingPanel] Error playing video:', error)
    }
    
    // Wait a bit for the video to start
    await new Promise(resolve => setTimeout(resolve, 500))
    
    console.log('[RecordingPanel] Created hidden video element')

    // Check stream state
    console.log('[RecordingPanel] Stream active:', stream.active)
    console.log('[RecordingPanel] Stream tracks:', stream.getTracks().map(t => ({ 
      kind: t.kind, 
      enabled: t.enabled, 
      readyState: t.readyState,
      muted: t.muted 
    })))

    // Check for active video track
    const videoTrack = stream.getVideoTracks()[0]
    const audioTrack = stream.getAudioTracks()[0]
    
    if (!videoTrack) {
      console.error('[RecordingPanel] No video track in stream')
      alert('No video track available in the stream.')
      return
    }
    
    console.log('[RecordingPanel] Video track:', { enabled: videoTrack.enabled, muted: videoTrack.muted, readyState: videoTrack.readyState })
    if (audioTrack) {
      console.log('[RecordingPanel] Audio track:', { enabled: audioTrack.enabled, muted: audioTrack.muted, readyState: audioTrack.readyState })
    }
    
    // Ensure tracks stay enabled
    videoTrack.enabled = true
    if (audioTrack) {
      audioTrack.enabled = true
    }

    // Check supported MIME types
    const codecs = ['video/webm']
    let selectedMimeType = 'video/webm'
    
    for (const mimeType of codecs) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType
        console.log('[RecordingPanel] Using MIME type:', mimeType)
        break
      }
    }

    const options: MediaRecorderOptions = {
      mimeType: selectedMimeType,
    }

    console.log('[RecordingPanel] MediaRecorder options:', options)
    console.log('[RecordingPanel] Stream type:', stream.getVideoTracks().length, 'video tracks,', stream.getAudioTracks().length, 'audio tracks')

    try {
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      let chunkCount = 0
      mediaRecorder.ondataavailable = (event) => {
        console.log('[RecordingPanel] ondataavailable fired:', event.data.size, 'bytes')
        if (event.data && event.data.size > 0) {
          chunkCount++
          console.log(`[RecordingPanel] Received chunk #${chunkCount}: ${event.data.size} bytes`)
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('[RecordingPanel] MediaRecorder error:', event)
      }

      mediaRecorder.onstart = () => {
        console.log('[RecordingPanel] MediaRecorder started successfully')
      }

      mediaRecorder.onstop = () => {
        console.log(`[RecordingPanel] MediaRecorder stopped. Total chunks: ${chunksRef.current.length}, bytes: ${chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)}`)
      }

      // Start WITH timeslice - this ensures data is emitted
      // Use 100ms for more frequent chunks to prevent stream from becoming inactive
      mediaRecorder.start(100) // Get data every 100ms
      console.log('[RecordingPanel] MediaRecorder.start() called with 100ms timeslice')
      
      // Set recording state immediately
      setRecordingStream(stream)
      setIsRecording(true)
      setRecordingType(type)
      
      // Give MediaRecorder a moment to actually start
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Minimize window AFTER recording has started
      await window.electronAPI?.ipc?.invoke('minimizeWindow')
      
      // Log chunk updates periodically and monitor stream health
      const progressCheck = setInterval(() => {
        const trackStatus = stream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
          constraints: t.getConstraints()
        }))
        console.log(`[RecordingPanel] Recording active. Chunks: ${chunksRef.current.length}, Stream active: ${stream.active}, Tracks:`, trackStatus)
        
        // Re-enable tracks if they become disabled
        stream.getTracks().forEach(track => {
          if (!track.enabled && track.readyState === 'live') {
            console.warn(`[RecordingPanel] Re-enabling ${track.kind} track`)
            track.enabled = true
          }
        })
      }, 2000)
      
      ;(mediaRecorder as any)._progressInterval = progressCheck
    } catch (error: any) {
      console.error('[RecordingPanel] Error creating MediaRecorder:', error)
      alert(`Failed to create MediaRecorder: ${error.message || 'Unknown error'}`)
    }
  }

  // Stop recording
  const stopRecording = useCallback(() => {
    // Pause timer first to capture exact time
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    
    // Capture the recording time
    const finalRecordingTime = recordingTime
    console.log('[RecordingPanel] Stopping recording at', finalRecordingTime, 'seconds')
    console.log('[RecordingPanel] Current chunks:', chunksRef.current.length)
    
    // Now start async operation
    const stopRecordingAsync = async () => {
      try {
      
      if (mediaRecorderRef.current) {
        // Request final data
        if (mediaRecorderRef.current.state !== 'inactive') {
          console.log('[RecordingPanel] Requesting final data and stopping')
          mediaRecorderRef.current.requestData() // Request data before stopping
          await new Promise(resolve => setTimeout(resolve, 100)) // Wait a bit
          mediaRecorderRef.current.stop()
          
          // Wait for stop event
          await new Promise<void>((resolve) => {
            if (mediaRecorderRef.current) {
              const originalOnStop = mediaRecorderRef.current.onstop
              mediaRecorderRef.current.onstop = () => {
                console.log('[RecordingPanel] MediaRecorder stopped event fired')
                if (originalOnStop) originalOnStop()
                resolve()
              }
            } else {
              resolve()
            }
          })
        }
      }

      // Wait for any final data
      await new Promise(resolve => setTimeout(resolve, 300))
      
      console.log('[RecordingPanel] Final chunk count:', chunksRef.current.length)
      const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
      console.log('[RecordingPanel] Total size:', totalSize, 'bytes')

      // Cleanup hidden video element
      if (hiddenVideoRef.current) {
        document.body.removeChild(hiddenVideoRef.current)
        hiddenVideoRef.current = null
        console.log('[RecordingPanel] Removed hidden video element')
      }

      // Stop all tracks
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => {
          track.stop()
          console.log(`[RecordingPanel] Stopped ${track.kind} track`)
        })
        setRecordingStream(null)
      }

      if (chunksRef.current.length === 0 || totalSize === 0) {
        console.error('[RecordingPanel] No recording data captured')
        console.error('[RecordingPanel] Stream state before stop:', {
          active: recordingStream?.active,
          tracks: recordingStream?.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
        })
        alert('⚠️ Recording failed: MediaRecorder did not capture any data. This is a known issue with Electron screen recording on macOS.\n\nPlease use "Import Video" to add existing videos, or try using a screen recording app to capture, then import the file.')
        setIsRecording(false)
        setRecordingType(null)
        chunksRef.current = []
        mediaRecorderRef.current = null
        return
      }

      // Create blob
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      console.log('[RecordingPanel] Blob created:', blob.size, 'bytes')

      // Check if we actually captured any chunks during recording
      const recordedChunks = chunksRef.current.length
      console.log('[RecordingPanel] Total chunks recorded:', recordedChunks)
      
      // Validate blob has data AND chunks were captured
      if (blob.size === 0 || recordedChunks === 0) {
        console.error('[RecordingPanel] Blob is empty or no chunks captured')
        alert('⚠️ Recording failed: MediaRecorder did not capture any data.\n\nThis is a known limitation with Electron screen recording on macOS.\n\nPlease use "Import Video" to add existing video files instead.')
        return
      }
      
      // Save blob to file via IPC
      const fileName = `clipforge-record-${Date.now()}.webm`
      const file = new File([blob], fileName, { type: 'video/webm' })
      
      // Convert to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Array.from(new Uint8Array(arrayBuffer)) // Convert to regular array for IPC
      
      // Save via IPC
      const filePath = await window.electronAPI.ipc.invoke('saveRecording', {
        fileName,
        buffer
      })
      console.log('[RecordingPanel] Saved recording to:', filePath)
      
      // Use the file path
      const url = filePath // Already a proper file path
      
      // Use final recording time as duration (in milliseconds)
      // finalRecordingTime is in seconds, convert to milliseconds
      const duration = finalRecordingTime > 0 ? finalRecordingTime * 1000 : 10000 // Default to 10 seconds if somehow 0
      
      console.log('[RecordingPanel] Using duration from recording time:', duration, 'ms (', finalRecordingTime, 'seconds)')
      
      // Validate duration
      if (!duration || !isFinite(duration) || duration <= 0) {
        console.error('[RecordingPanel] Invalid duration:', duration)
        URL.revokeObjectURL(url)
        alert('Failed to import recording: Invalid duration.')
        return
      }
      
      const videoTrack = recordingStream?.getVideoTracks()[0]
      const settings = videoTrack?.getSettings()
      
      // Create a clip object
      const newClip: Clip = {
        id: generateId(),
        name: fileName,
        filePath: url, // Use the blob URL as temporary path
        duration: duration,
        startTime: 0,
        endTime: duration,
        trackId: 0,
        offset: 0,
        speed: 1, // Normal speed by default
        volume: 1, // 100% volume by default
        fadeIn: 0, // No fade in by default
        fadeOut: 0, // No fade out by default
        brightness: 0, // No brightness adjustment by default
        contrast: 0, // No contrast adjustment by default
        saturation: 0, // No saturation adjustment by default
      }
      
      // Add to timeline
      addClip(newClip)
      
      console.log('[RecordingPanel] Recording imported to timeline successfully')
      
      // Don't revoke URL - keep it for the clip to use
      
    } catch (error: any) {
      console.error('[RecordingPanel] Error saving recording:', error)
      alert('Failed to save recording: ' + error.message)
    } finally {
      setIsRecording(false)
      setRecordingType(null)
      chunksRef.current = []
      mediaRecorderRef.current = null
      
      // Restore window when recording stops
      await window.electronAPI.ipc.invoke('restoreWindow')
    }
    }
    
    stopRecordingAsync()
  }, [recordingStream, addClip, recordingTime])

  return (
    <div className="p-3 border-b border-gray-800">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.75 17L9 20l-1 1h8l-1-1-1.75-3M3 13h18M4 17h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v11a1 1 0 001 1z" />
        </svg>
        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Record</h2>
      </div>
      
      {!isRecording ? (
        <>
          {/* Audio Control */}
          <div className="mb-2 flex items-center justify-between px-2 py-1 bg-gray-800/30 rounded border border-gray-700/30">
            <label className="text-xs text-gray-400 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-xs">Audio</span>
            </label>
            <input
              type="checkbox"
              checked={includeAudio}
              onChange={(e) => setIncludeAudio(e.target.checked)}
              className="w-3.5 h-3.5 accent-accent"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => startRecording('screen')}
              className="flex-1 px-2.5 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded text-xs text-gray-300 hover:text-white transition-colors border border-gray-700/50 hover:border-gray-600 flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.75 17L9 20l-1 1h8l-1-1-1.75-3M3 13h18M4 17h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v11a1 1 0 001 1z" />
              </svg>
              <span>Screen</span>
            </button>
            <button
              onClick={() => startRecording('webcam')}
              className="flex-1 px-2.5 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded text-xs text-gray-300 hover:text-white transition-colors border border-gray-700/50 hover:border-gray-600 flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Webcam</span>
            </button>
            <button
              onClick={() => startRecording('pip')}
              className="flex-1 px-2.5 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded text-xs text-gray-300 hover:text-white transition-colors border border-gray-700/50 hover:border-gray-600 flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 4v16M17 4v16M4 17h16M4 7h16" />
              </svg>
              <span>PIP</span>
            </button>
          </div>

          {/* Source Picker Modal */}
          {showSourcePicker && (
            <div className="fixed inset-0 z-50 pointer-events-none">
              <div className="absolute inset-0 bg-black bg-opacity-90" onClick={() => setShowSourcePicker(false)} style={{ pointerEvents: 'auto' }}></div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                <div className="bg-gray-900 rounded p-6 max-w-4xl w-full mx-4 border border-gray-700/50" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-medium text-gray-300 mb-1 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2分子的=2v8a2 2 0 002 2z" />
                        </svg>
                        Select Screen or Window to Record
                      </h3>
                      <p className="text-xs text-gray-500">Choose what you want to record</p>
                    </div>
                    <button
                      onClick={() => setShowSourcePicker(false)}
                      className="text-gray-400 hover:text-gray-300 transition-colors p-1.5 hover:bg-gray- siguiente/50 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    {availableSources.map((source) => (
                      <button
                        key={source.id}
                        onClick={() => handleSourceSelect(source)}
                        className="p-2.5 border border-gray-700/50 hover:border-gray-600/50 rounded transition-all bg-gray-800/30 group"
                      >
                        <img 
                          src={source.thumbnail.toDataURL()} 
                          alt={source.name} 
                          className="w-full h-32 object-cover rounded mb-2 group-hover:opacity-80 transition-opacity"
                        />
                        <p className="text-xs text-gray-300 truncate text-center">{source.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 p-4 bg-gray-800/30 rounded border border-gray-700/30">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-gray-500 rounded-full animate-pulse" />
            <span className="font-medium text-gray-300">Recording {recordingType}...</span>
            <span className="text-sm text-gray-400">{formatTime(recordingTime)}</span>
          </div>
          <button
            onClick={stopRecording}
            className="w-full px-4 py-2.5 bg-gray-800/50 hover:bg-gray-700/50 rounded border border-gray-700/50 text-gray-300 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Stop Recording
          </button>
        </div>
      )}
    </div>
  )
}

export default RecordingPanel
