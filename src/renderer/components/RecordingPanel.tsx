import React, { useState, useCallback, useRef } from 'react'
import { useProject, Clip } from '../context/ProjectContext'

const RecordingPanel: React.FC = () => {
  const { addClip } = useProject()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState<'screen' | 'webcam' | 'pip' | null>(null)
  const [includeAudio, setIncludeAudio] = useState(true)
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null)
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const [availableSources, setAvailableSources] = useState<any[]>([])
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Load screen sources - using browser API instead of Electron's desktopCapturer
  const loadScreenSources = useCallback(async () => {
    // Use browser's getDisplayMedia API instead of Electron's desktopCapturer
    // This avoids macOS permission issues
    return []
  }, [])

  // Start recording
  const startRecording = useCallback(async (type: 'screen' | 'webcam' | 'pip') => {
    try {
      let stream: MediaStream | null = null

      if (type === 'screen') {
        // Get screen sources from main process
        const sources = await window.electron.ipc.invoke('getScreenSources')
        
        if (sources.length === 0) {
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
            // Open System Settings to screen recording
            await window.electron.ipc.invoke('openScreenRecordingSettings')
          }
          return
        }
        
        // Validate sources array - make sure we have a valid array
        console.log('Screen sources received:', sources)
        
        if (!Array.isArray(sources) || sources.length === 0) {
          console.error('No screen sources available')
          alert('No screen sources available. Please ensure screen recording permissions are granted.')
          return
        }
        
        // Show source picker modal
        setAvailableSources(sources)
        setShowSourcePicker(true)
        return // Don't start recording yet, wait for user to select
      } else if (type === 'webcam') {
        const constraints: any = {
          video: true,
        }
        
        if (includeAudio) {
          constraints.audio = true
        }
        
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } else if (type === 'pip') {
        // Picture-in-picture: use screen only for now
        const sources = await window.electron.ipc.invoke('getScreenSources')
        
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
        
        if (includeAudio) {
          constraints.audio = {
            // @ts-ignore - Electron specific
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: entireScreen.id,
            },
          }
        }
        
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      }

      if (stream) {
        setRecordingStream(stream)
        await startRecordingFromStream(stream, type)
      }
    } catch (error) {
      console.error('Error starting recording:', error)
      alert(`Failed to start recording: ${error.message || 'Unknown error'}. Please ensure screen recording permissions are granted.`)
    }
  }, [includeAudio])

  // Handle source selection for screen recording
  const handleSourceSelect = useCallback(async (source: any) => {
    try {
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
      
      // Only add audio if user wants it
      if (includeAudio) {
        constraints.audio = {
          // @ts-ignore - Electron specific
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
          },
        }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      if (stream) {
        setRecordingStream(stream)
        await startRecordingFromStream(stream, 'screen')
      }
    } catch (error) {
      console.error('Error starting recording:', error)
      alert(`Failed to start recording: ${error.message || 'Unknown error'}`)
    }
  }, [includeAudio])

  // Start recording from a MediaStream
  const startRecordingFromStream = async (stream: MediaStream, type: 'screen' | 'webcam' | 'pip') => {
    chunksRef.current = []

    // Check stream state
    console.log('Stream active:', stream.active)
    console.log('Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })))

    // Check supported MIME types
    const codecs = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    let selectedMimeType = 'video/webm'
    
    for (const mimeType of codecs) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType
        console.log('Using MIME type:', mimeType)
        break
      }
    }

    const options: MediaRecorderOptions = {
      mimeType: selectedMimeType,
      videoBitsPerSecond: 2500000, // 2.5 Mbps
    }

    console.log('MediaRecorder options:', options)

    const mediaRecorder = new MediaRecorder(stream, options)
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        console.log('Received data chunk:', event.data.size, 'bytes')
        chunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onerror = (event) => {
      console.error('Recording error:', event)
      alert('Recording error occurred. Please try again.')
    }

    mediaRecorder.onstart = () => {
      console.log('MediaRecorder started')
    }

    mediaRecorder.onstop = () => {
      console.log('MediaRecorder stopped. Total chunks:', chunksRef.current.length)
    }

    try {
      mediaRecorder.start(100) // Collect data every 100ms
      console.log('MediaRecorder.start() called')
      setIsRecording(true)
      setRecordingType(type)
    } catch (error) {
      console.error('Error starting MediaRecorder:', error)
      alert('Failed to start recording: ' + error.message)
    }
  }

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      console.log('Stopping recording...')
      console.log('Chunks before stop:', chunksRef.current.length)
      
      // Stop recording first
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        
        // Wait for recording to fully stop
        await new Promise((resolve) => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => {
              console.log('MediaRecorder stopped')
              resolve(undefined)
            }
          } else {
            resolve(undefined)
          }
        })
      }

      console.log('Chunks after stop:', chunksRef.current.length)

      // Stop all media tracks
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => {
          track.stop()
          console.log('Stopped track:', track.kind)
        })
        setRecordingStream(null)
      }

      // Wait for final data
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Final chunks:', chunksRef.current.length, 'chunks')
      console.log('Total size:', chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0), 'bytes')

      if (chunksRef.current.length === 0) {
        console.error('No chunks recorded')
        alert('No recording data to save. The stream may not have been active.')
        setIsRecording(false)
        setRecordingType(null)
        chunksRef.current = []
        mediaRecorderRef.current = null
        return
      }

      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      console.log('Blob created:', blob.size, 'bytes')
      
      if (blob.size === 0) {
        console.error('Blob size is zero')
        alert('No recording data to save')
        setIsRecording(false)
        setRecordingType(null)
        chunksRef.current = []
        mediaRecorderRef.current = null
        return
      }

      const url = URL.createObjectURL(blob)

      // Create a download link
      const a = document.createElement('a')
      a.href = url
      a.download = `clipforge-record-${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100)
      
      console.log('Recording saved successfully')
    } catch (error) {
      console.error('Error saving recording:', error)
      alert('Failed to save recording: ' + error.message)
    } finally {
      setIsRecording(false)
      setRecordingType(null)
      chunksRef.current = []
      mediaRecorderRef.current = null
    }
  }, [recordingStream])

  return (
    <div className="p-4 border-b border-gray-800 bg-dark">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">Record</h2>
      
      {!isRecording ? (
        <>
          {/* Audio Control */}
          <div className="mb-3 flex items-center justify-between p-2 bg-gray-800 rounded-lg">
            <label className="text-xs text-gray-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Record Audio
            </label>
            <input
              type="checkbox"
              checked={includeAudio}
              onChange={(e) => setIncludeAudio(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => startRecording('screen')}
              className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-1.75-3M3 13h18M4 17h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v11a1 1 0 001 1z" />
              </svg>
              Screen
            </button>
            <button
              onClick={() => startRecording('webcam')}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Webcam
            </button>
            <button
              onClick={() => startRecording('pip')}
              className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M4 17h16M4 7h16" />
              </svg>
              Screen + Webcam
            </button>
          </div>

          {/* Source Picker Modal */}
          {showSourcePicker && (
            <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" onClick={() => setShowSourcePicker(false)}>
              <div className="bg-dark-secondary rounded-lg p-6 max-w-4xl w-full mx-4 border-2 border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.75 17L9 20l-1 1h8l-1-1-1.75-3M3 13h18M4 17h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v11a1 1 0 001 1z" />
                  </svg>
                  Select Screen or Window to Record
                </h3>
                <p className="text-sm text-gray-400 mb-4">Choose what you want to record</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {availableSources.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => handleSourceSelect(source)}
                      className="p-3 border-2 border-gray-700 hover:border-red-500 rounded-lg transition-all hover:transform hover:scale-105 bg-dark group"
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
                <button
                  onClick={() => setShowSourcePicker(false)}
                  className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center gap-2 text-red-500">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="font-medium">Recording {recordingType}...</span>
          <button
            onClick={stopRecording}
            className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm font-medium"
          >
            Stop
          </button>
        </div>
      )}
    </div>
  )
}

export default RecordingPanel

