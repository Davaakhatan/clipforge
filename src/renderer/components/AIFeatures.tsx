import React, { useState } from 'react'
import { useProject } from '../context/ProjectContext'

interface AIFeaturesProps {
  isOpen: boolean
  onClose: () => void
}

interface VideoSelectionDialogProps {
  videos: Array<{ id: string; name: string; filePath: string; thumbnail?: string }>
  onSelectFromLibrary: (filePath: string) => void
  onUploadNew: () => void
  onCancel: () => void
}

const VideoSelectionDialog: React.FC<VideoSelectionDialogProps> = ({
  videos,
  onSelectFromLibrary,
  onUploadNew,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]">
      <div className="bg-gray-900 rounded p-3 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-300">Select Video</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-300 transition-colors p-1.5 hover:bg-gray-800/50 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-gray-500 text-xs mb-3">Choose from your media library or upload a new video</p>
        
        {videos.length > 0 && (
          <div className="mb-6">
            <h4 className="text-gray-300 font-medium text-sm mb-2">Media Library</h4>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => onSelectFromLibrary(video.filePath)}
                  className="bg-gray-800/30 hover:bg-gray-700/30 rounded p-2.5 border border-gray-700/30 hover:border-gray-600/50 transition-colors text-left group"
                >
                  <div className="w-full h-24 bg-gray-900 rounded mb-2 overflow-hidden flex items-center justify-center">
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt={video.name} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-gray-300 text-xs truncate font-medium group-hover:text-gray-200">{video.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}
        
        <button
          onClick={onUploadNew}
          className="w-full bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Upload New Video</span>
        </button>
      </div>
    </div>
  )
}

export const AIFeatures: React.FC<AIFeaturesProps> = ({ isOpen, onClose }) => {
  const { state } = useProject()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState('')
  const [activeFeature, setActiveFeature] = useState('')
  const [showVideoSelection, setShowVideoSelection] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  
  // Get available videos from media library (only video clips)
  const availableVideos = state.clips.map(clip => ({
    id: clip.id,
    name: clip.name,
    filePath: clip.filePath,
    thumbnail: clip.thumbnail,
  }))

  // Helper to process video file with the selected action
  const processVideoFile = async (action: string, filePath: string) => {
    setIsLoading(true)
    setResult('')
    setActiveFeature(action)
    
    try {
      if (!window.electronAPI) {
        throw new Error('AI API not available')
      }

      switch (action) {
        case 'captions':
          const captions = await window.electronAPI.generateCaptions(filePath)
          setResult(`AUTO-GENERATED CAPTIONS\n\n${captions.join('\n\n')}\n\nThese captions were generated using OpenAI's Whisper API and include timestamps for easy editing.`)
          break
        case 'color':
          const suggestions = await window.electronAPI.suggestColorCorrection(filePath)
          setResult(`AI COLOR CORRECTION SUGGESTIONS\n\nRecommended Adjustments:\n• Brightness: ${suggestions.brightness > 0 ? '+' : ''}${suggestions.brightness}\n• Contrast: ${suggestions.contrast > 0 ? '+' : ''}${suggestions.contrast}\n• Saturation: ${suggestions.saturation > 0 ? '+' : ''}${suggestions.saturation}\n• Temperature: ${suggestions.temperature > 0 ? '+' : ''}${suggestions.temperature}\n• Exposure: ${suggestions.exposure > 0 ? '+' : ''}${suggestions.exposure}\n• Shadows: ${suggestions.shadows > 0 ? '+' : ''}${suggestions.shadows}\n• Highlights: ${suggestions.highlights > 0 ? '+' : ''}${suggestions.highlights}\n\nReason: ${suggestions.reason}\nConfidence: ${Math.round((suggestions.confidence || 0.7) * 100)}%\nPreset: ${suggestions.preset}\n\nThese suggestions were generated using GPT-4 Vision analysis of your video frames for optimal color enhancement.`)
          break
        case 'analysis':
          const analysis = await window.electronAPI.analyzeVideoContent(filePath)
          setResult(`SMART CONTENT ANALYSIS\n\n${analysis.map((item: any, index: number) => 
            `${index + 1}. [${item.timestamp}] ${item.type.toUpperCase()}\n   Description: ${item.description}\n   Confidence: ${Math.round((item.confidence || 0.8) * 100)}%\n   ${item.suggestions ? `Suggestions: ${item.suggestions}` : ''}`
          ).join('\n\n')}\n\nThis analysis was generated using GPT-4 Vision to identify key moments, scene changes, and editing opportunities.`)
          break
        case 'audio-cleanup':
          const audioResult = await window.electronAPI.enhanceAudioCleanup(filePath, {
            noiseReduction: true,
            normalize: true,
            volumeBoost: 5
          })
          if (audioResult.success) {
            setResult(`Audio Enhanced Successfully!\n\nOutput saved to:\n${audioResult.outputPath}\n\nApplied enhancements:\n• Noise reduction\n• Normalization\n• Volume boost (+5dB)`)
          } else {
            setResult(`Error: ${audioResult.error}`)
          }
          break
        case 'workflow':
          const workflowResult = await window.electronAPI.automateWorkflow(filePath, [
            'add captions',
            'color correct',
            'add overlays',
            'enhance audio'
          ])
          if (workflowResult.success && workflowResult.results) {
            setResult(`AI WORKFLOW AUTOMATION\n\nSuggested Workflow Steps:\n\n${workflowResult.results.map((step: any, i: number) => 
              `${i + 1}. ${step.action.toUpperCase()} (Priority: ${step.priority})\n   ${step.description}\n   Estimated time: ${step.estimatedTime}s${step.startTime ? `\n   Time range: ${step.startTime}s - ${step.endTime}s` : ''}`
            ).join('\n\n')}`)
          } else {
            setResult(`Error: ${workflowResult.error || 'Unknown error'}`)
          }
          break
      }
    } catch (error: any) {
      const errorMessages: Record<string, string> = {
        'captions': `Error generating captions: ${error.message}\n\nThis might be because:\n• No audio file was selected\n• Audio file format is not supported\n• OpenAI API quota exceeded\n• Network connection issues`,
        'color': `Error suggesting color correction: ${error.message}\n\nThis might be because:\n• No video file was selected\n• Video format is not supported\n• OpenAI API quota exceeded\n• Network connection issues`,
        'analysis': `Error analyzing content: ${error.message}\n\nThis might be because:\n• No video file was selected\n• Video format is not supported\n• OpenAI API quota exceeded\n• Network connection issues`,
        'audio-cleanup': `Error: ${error.message}`,
        'workflow': `Error: ${error.message}`
      }
      setResult(errorMessages[action] || `Error: ${error.message}`)
    } finally {
      setIsLoading(false)
      setActiveFeature('')
    }
  }

  // Handle selecting video from library
  const handleSelectFromLibrary = async (filePath: string) => {
    const action = pendingAction
    setShowVideoSelection(false)
    setPendingAction(null)
    
    if (action && filePath) {
      await processVideoFile(action, filePath)
    } else {
      setIsLoading(false)
      setActiveFeature('')
      setResult('')
    }
  }

  // Handle uploading new video
  const handleUploadNew = async () => {
    const action = pendingAction
    setShowVideoSelection(false)
    setPendingAction(null)
    
    if (!window.electronAPI) {
      setResult('AI API not available')
      return
    }
    
    const filePaths = await window.electronAPI.ipc.invoke('showOpenDialog')
    if (filePaths && filePaths.length > 0 && action) {
      await processVideoFile(action, filePaths[0])
    } else {
      setIsLoading(false)
      setActiveFeature('')
      setResult('')
    }
  }

  // Handle canceling video selection
  const handleCancelSelection = () => {
    setShowVideoSelection(false)
    setPendingAction(null)
    setIsLoading(false)
    setActiveFeature('')
  }

  const handleGenerateCaptions = async () => {
    if (availableVideos.length > 0) {
      setPendingAction('captions')
      setShowVideoSelection(true)
    } else {
      const filePaths = await window.electronAPI?.ipc?.invoke('showOpenDialog')
      if (filePaths && filePaths.length > 0) {
        await processVideoFile('captions', filePaths[0])
      }
    }
  }

  const handleAnalyzeContent = async () => {
    if (availableVideos.length > 0) {
      setPendingAction('analysis')
      setShowVideoSelection(true)
    } else {
      const filePaths = await window.electronAPI?.ipc?.invoke('showOpenDialog')
      if (filePaths && filePaths.length > 0) {
        await processVideoFile('analysis', filePaths[0])
      }
    }
  }

  const handleGenerateTextOverlays = async () => {
    setIsLoading(true)
    setResult('')
    setActiveFeature('overlays')
    
    try {
      if (!window.electronAPI) {
        throw new Error('AI API not available')
      }

      const overlays = await window.electronAPI.generateTextOverlays('A tutorial about video editing', 60)
      const formattedResult = `INTELLIGENT TEXT OVERLAYS\n\n${overlays.map((overlay: any, index: number) => 
        `${index + 1}. "${overlay.text}"\n   Style: ${overlay.style} | Position: ${overlay.position}\n   Duration: ${overlay.startTime}ms - ${overlay.endTime}ms\n   Animation: ${overlay.animation} | Color: ${overlay.color}\n   Font Size: ${overlay.fontSize} | Opacity: ${overlay.opacity}`
      ).join('\n\n')}\n\nThese overlays were generated using GPT-4 with contextual timing and styling for maximum visual impact.`
      setResult(formattedResult)
    } catch (error: any) {
      setResult(`Error generating text overlays: ${error.message}\n\nThis might be because:\n• Invalid video description\n• OpenAI API quota exceeded\n• Network connection issues`)
    } finally {
      setIsLoading(false)
      setActiveFeature('')
    }
  }

  const handleSuggestColorCorrection = async () => {
    if (availableVideos.length > 0) {
      setPendingAction('color')
      setShowVideoSelection(true)
    } else {
      const filePaths = await window.electronAPI?.ipc?.invoke('showOpenDialog')
      if (filePaths && filePaths.length > 0) {
        await processVideoFile('color', filePaths[0])
      }
    }
  }

  const handleSuggestExportSettings = async () => {
    setIsLoading(true)
    setResult('')
    setActiveFeature('export')
    
    try {
      if (!window.electronAPI) {
        throw new Error('AI API not available')
      }

      const suggestions = await window.electronAPI.suggestExportSettings({ duration: 60, resolution: '1080p' })
      const formattedResult = `OPTIMAL EXPORT SETTINGS\n\nRecommended Configuration:\n• Resolution: ${suggestions.resolution}\n• Format: ${suggestions.format.toUpperCase()}\n• Video Codec: ${suggestions.codec.toUpperCase()}\n• Bitrate: ${suggestions.bitrate}\n• Quality: ${suggestions.quality.toUpperCase()}\n• Audio Codec: ${suggestions.audioCodec.toUpperCase()}\n• Audio Bitrate: ${suggestions.audioBitrate}\n• Frame Rate: ${suggestions.frameRate} fps\n• Preset: ${suggestions.preset}\n\nReason: ${suggestions.reason}\nEstimated File Size: ${suggestions.estimatedSize}\nCompatibility: ${suggestions.compatibility}\n\nThese settings were optimized using GPT-4 analysis for the best balance of quality, file size, and compatibility.`
      setResult(formattedResult)
    } catch (error: any) {
      setResult(`Error suggesting export settings: ${error.message}\n\nThis might be because:\n• Invalid video information\n• OpenAI API quota exceeded\n• Network connection issues`)
    } finally {
      setIsLoading(false)
      setActiveFeature('')
    }
  }

  const handleGenerateMusicSuggestions = async () => {
    setIsLoading(true)
    setResult('')
    setActiveFeature('music')
    
    try {
      if (!window.electronAPI) {
        throw new Error('AI API not available')
      }

      const suggestions = await window.electronAPI.generateMusicSuggestions('Upbeat tutorial video', 60)
      const formattedResult = `INTELLIGENT MUSIC SUGGESTIONS\n\n${suggestions.join('\n\n')}\n\nThese suggestions were generated using GPT-4 analysis considering your video content, mood, duration, and current music trends. Each suggestion includes genre, mood, duration, and where to find the track.`
      setResult(formattedResult)
    } catch (error: any) {
      setResult(`Error generating music suggestions: ${error.message}\n\nThis might be because:\n• Invalid video description\n• OpenAI API quota exceeded\n• Network connection issues`)
    } finally {
      setIsLoading(false)
      setActiveFeature('')
    }
  }

  if (!isOpen) return null

  return (
    <>
      {showVideoSelection && (
        <VideoSelectionDialog
          videos={availableVideos}
          onSelectFromLibrary={handleSelectFromLibrary}
          onUploadNew={handleUploadNew}
          onCancel={handleCancelSelection}
        />
      )}
      {!showVideoSelection && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded p-6 w-full max-w-4xl mx-4 max-h-[85vh] overflow-y-auto border border-gray-700/50">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-300 mb-1">AI-Powered Video Tools</h2>
            <p className="text-gray-500 text-xs">Enhance your videos with intelligent automation</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors p-1.5 hover:bg-gray-800/50 rounded"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {/* Generate Captions */}
          <div className="bg-gray-800/30 border border-gray-700/30 rounded p-3 hover:border-gray-600/50 transition-colors">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-gray-700/50 rounded flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-gray-300 font-medium text-sm">Auto Captions</h3>
                <p className="text-gray-500 text-xs">Generate subtitles from audio</p>
              </div>
            </div>
            <button
              onClick={handleGenerateCaptions}
              disabled={isLoading}
              className="w-full bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/30 text-gray-300 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoading && activeFeature === 'captions' ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate Captions</span>
                </>
              )}
            </button>
          </div>

          {/* Analyze Content */}
          <div className="bg-gray-800/30 border border-gray-700/30 rounded p-3 hover:border-gray-600/50 transition-colors">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-gray-700/50 rounded flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-gray-300 font-medium text-sm">Smart Analysis</h3>
                <p className="text-gray-500 text-xs">Analyze video content & scenes</p>
              </div>
            </div>
            <button
              onClick={handleAnalyzeContent}
              disabled={isLoading}
              className="w-full bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/30 text-gray-300 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoading && activeFeature === 'analysis' ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Analyze Content</span>
                </>
              )}
            </button>
          </div>

          {/* Generate Text Overlays */}
          <div className="bg-gray-800/30 border border-gray-700/30 rounded p-3 hover:border-gray-600/50 transition-colors">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-gray-700/50 rounded flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-gray-300 font-medium text-sm">Text Overlays</h3>
                <p className="text-gray-500 text-xs">Create dynamic text elements</p>
              </div>
            </div>
            <button
              onClick={handleGenerateTextOverlays}
              disabled={isLoading}
              className="w-full bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/30 text-gray-300 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoading && activeFeature === 'overlays' ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate Overlays</span>
                </>
              )}
            </button>
          </div>

          {/* Color Correction */}
          <div className="bg-gray-800/30 border border-gray-700/30 rounded p-3 hover:border-gray-600/50 transition-colors">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-gray-700/50 rounded flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-gray-300 font-medium text-sm">Color Correction</h3>
                <p className="text-gray-500 text-xs">AI-powered color enhancement</p>
              </div>
            </div>
            <button
              onClick={handleSuggestColorCorrection}
              disabled={isLoading}
              className="w-full bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/30 text-gray-300 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoading && activeFeature === 'color' ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Enhance Colors</span>
                </>
              )}
            </button>
          </div>

          {/* Export Settings */}
          <div className="bg-gray-800/30 border border-gray-700/30 rounded p-3 hover:border-gray-600/50 transition-colors">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-gray-700/50 rounded flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-gray-300 font-medium text-sm">Export Settings</h3>
                <p className="text-gray-500 text-xs">Optimize output quality</p>
              </div>
            </div>
            <button
              onClick={handleSuggestExportSettings}
              disabled={isLoading}
              className="w-full bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/30 text-gray-300 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoading && activeFeature === 'export' ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                  <span>Optimizing...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Optimize Export</span>
                </>
              )}
            </button>
          </div>

          {/* Music Suggestions */}
          <div className="bg-gray-800/30 border border-gray-700/30 rounded p-3 hover:border-gray-600/50 transition-colors">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-gray-700/50 rounded flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div>
                <h3 className="text-gray-300 font-medium text-sm">Music Suggestions</h3>
                <p className="text-gray-500 text-xs">Find perfect background music</p>
              </div>
            </div>
            <button
              onClick={handleGenerateMusicSuggestions}
              disabled={isLoading}
              className="w-full bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/30 text-gray-300 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoading && activeFeature === 'music' ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                  <span>Finding...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Find Music</span>
                </>
              )}
            </button>
          </div>

          {/* Audio Cleanup */}
          <div className="bg-gray-800/30 border border-gray-700/30 rounded p-3 hover:border-gray-600/50 transition-colors">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-gray-700/50 rounded flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-gray-300 font-medium text-sm">Audio Cleanup</h3>
                <p className="text-gray-500 text-xs">AI-powered audio enhancement</p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (availableVideos.length > 0) {
                  setPendingAction('audio-cleanup')
                  setShowVideoSelection(true)
                } else {
                  const filePaths = await window.electronAPI?.ipc?.invoke('showOpenDialog')
                  if (filePaths && filePaths.length > 0) {
                    await processVideoFile('audio-cleanup', filePaths[0])
                  }
                }
              }}
              disabled={isLoading}
              className="w-full bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/30 text-gray-300 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoading && activeFeature === 'audio-cleanup' ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                  <span>Enhancing...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Clean Audio</span>
                </>
              )}
            </button>
          </div>

          {/* Workflow Automation */}
          <div className="bg-gray-800/30 border border-gray-700/30 rounded p-3 hover:border-gray-600/50 transition-colors">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-gray-700/50 rounded flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3 className="text-gray-300 font-medium text-sm">Workflow Automation</h3>
                <p className="text-gray-500 text-xs">Automate video editing workflow</p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (availableVideos.length > 0) {
                  setPendingAction('workflow')
                  setShowVideoSelection(true)
                } else {
                  const filePaths = await window.electronAPI?.ipc?.invoke('showOpenDialog')
                  if (filePaths && filePaths.length > 0) {
                    await processVideoFile('workflow', filePaths[0])
                  }
                }
              }}
              disabled={isLoading}
              className="w-full bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/30 text-gray-300 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoading && activeFeature === 'workflow' ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                  <span>Planning...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Automate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-gray-800/50 border border-gray-700 rounded p-3 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-300 font-medium text-sm">Result</h3>
              <button
                onClick={() => setResult('')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-gray-900 rounded p-2.5">
              <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">{result}</pre>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
      </div>
      )}
    </>
  )
}