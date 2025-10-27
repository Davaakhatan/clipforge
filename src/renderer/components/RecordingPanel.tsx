import React, { useState, useCallback, useRef } from 'react'
import { useProject, Clip } from '../context/ProjectContext'

const RecordingPanel: React.FC = () => {
  const { addClip } = useProject()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState<'screen' | 'webcam' | 'pip' | null>(null)
  const [includeAudio, setIncludeAudio] = useState(true)
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null)
  
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
        
        // Validate sources array
        if (!sources || !Array.isArray(sources) || sources.length === 0) {
          alert('No screen sources available. Please ensure screen recording permissions are granted.')
          return
        }
        
        // Find entire screen source or use the first available screen
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
        
        // Only add audio if user wants it
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

  // Handle source selection for screen recording (removed - using getDisplayMedia instead)
  const handleSourceSelect = useCallback(async (sourceId: string) => {
    // No longer needed - browser handles source selection
  }, [])

  // Start recording from a MediaStream
  const startRecordingFromStream = async (stream: MediaStream, type: 'screen' | 'webcam' | 'pip') => {
    chunksRef.current = []

    const options: MediaRecorderOptions = {
      mimeType: 'video/webm',
      videoBitsPerSecond: 2500000, // 2.5 Mbps
    }

    const mediaRecorder = new MediaRecorder(stream, options)
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onerror = (event) => {
      console.error('Recording error:', event)
    }

    mediaRecorder.start(100) // Collect data every 100ms
    setIsRecording(true)
    setRecordingType(type)
  }

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      // Stop recording first
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        
        // Wait for recording to fully stop
        await new Promise((resolve) => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = resolve
          } else {
            resolve(undefined)
          }
        })
      }

      // Stop all media tracks
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop())
        setRecordingStream(null)
      }

      // Wait a moment for final data
      await new Promise(resolve => setTimeout(resolve, 500))

      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      
      if (blob.size === 0) {
        alert('No recording data to save')
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

