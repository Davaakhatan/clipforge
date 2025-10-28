import React, { useState } from 'react'

interface AIFeaturesProps {
  isOpen: boolean
  onClose: () => void
}

export const AIFeatures: React.FC<AIFeaturesProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState('')
  const [activeFeature, setActiveFeature] = useState('')

  const handleGenerateCaptions = async () => {
    setIsLoading(true)
    setResult('')
    setActiveFeature('captions')
    
    try {
      if (!window.electronAPI) {
        throw new Error('AI API not available')
      }

      const captions = await window.electronAPI.generateCaptions('/path/to/audio.mp3')
      setResult(`Generated captions:\n${captions.join('\n')}`)
    } catch (error: any) {
      setResult(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
      setActiveFeature('')
    }
  }

  const handleAnalyzeContent = async () => {
    setIsLoading(true)
    setResult('')
    setActiveFeature('analysis')
    
    try {
      if (!window.electronAPI) {
        throw new Error('AI API not available')
      }

      const analysis = await window.electronAPI.analyzeVideoContent('/path/to/video.mp4')
      setResult(`Content analysis:\n${JSON.stringify(analysis, null, 2)}`)
    } catch (error: any) {
      setResult(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
      setActiveFeature('')
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
      setResult(`Generated text overlays:\n${JSON.stringify(overlays, null, 2)}`)
    } catch (error: any) {
      setResult(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
      setActiveFeature('')
    }
  }

  const handleSuggestColorCorrection = async () => {
    setIsLoading(true)
    setResult('')
    setActiveFeature('color')
    
    try {
      if (!window.electronAPI) {
        throw new Error('AI API not available')
      }

      const suggestions = await window.electronAPI.suggestColorCorrection('/path/to/video.mp4')
      setResult(`Color correction suggestions:\n${JSON.stringify(suggestions, null, 2)}`)
    } catch (error: any) {
      setResult(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
      setActiveFeature('')
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
      setResult(`Export settings suggestions:\n${JSON.stringify(suggestions, null, 2)}`)
    } catch (error: any) {
      setResult(`Error: ${error.message}`)
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
      setResult(`Music suggestions:\n${suggestions.join('\n')}`)
    } catch (error: any) {
      setResult(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
      setActiveFeature('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-8 w-full max-w-4xl mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">AI-Powered Video Tools</h2>
            <p className="text-gray-400 text-sm">Enhance your videos with intelligent automation</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Generate Captions */}
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-6 hover:border-blue-400/50 transition-all group">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Auto Captions</h3>
                <p className="text-gray-400 text-sm">Generate subtitles from audio</p>
              </div>
            </div>
            <button
              onClick={handleGenerateCaptions}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading && activeFeature === 'captions' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate Captions</span>
                </>
              )}
            </button>
          </div>

          {/* Analyze Content */}
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-6 hover:border-purple-400/50 transition-all group">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Smart Analysis</h3>
                <p className="text-gray-400 text-sm">Analyze video content & scenes</p>
              </div>
            </div>
            <button
              onClick={handleAnalyzeContent}
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading && activeFeature === 'analysis' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Analyze Content</span>
                </>
              )}
            </button>
          </div>

          {/* Generate Text Overlays */}
          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-xl p-6 hover:border-green-400/50 transition-all group">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Text Overlays</h3>
                <p className="text-gray-400 text-sm">Create dynamic text elements</p>
              </div>
            </div>
            <button
              onClick={handleGenerateTextOverlays}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading && activeFeature === 'overlays' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate Overlays</span>
                </>
              )}
            </button>
          </div>

          {/* Color Correction */}
          <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border border-orange-500/30 rounded-xl p-6 hover:border-orange-400/50 transition-all group">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Color Correction</h3>
                <p className="text-gray-400 text-sm">AI-powered color enhancement</p>
              </div>
            </div>
            <button
              onClick={handleSuggestColorCorrection}
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading && activeFeature === 'color' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Enhance Colors</span>
                </>
              )}
            </button>
          </div>

          {/* Export Settings */}
          <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-800/20 border border-indigo-500/30 rounded-xl p-6 hover:border-indigo-400/50 transition-all group">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Export Settings</h3>
                <p className="text-gray-400 text-sm">Optimize output quality</p>
              </div>
            </div>
            <button
              onClick={handleSuggestExportSettings}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading && activeFeature === 'export' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Optimizing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Optimize Export</span>
                </>
              )}
            </button>
          </div>

          {/* Music Suggestions */}
          <div className="bg-gradient-to-br from-pink-600/20 to-pink-800/20 border border-pink-500/30 rounded-xl p-6 hover:border-pink-400/50 transition-all group">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Music Suggestions</h3>
                <p className="text-gray-400 text-sm">Find perfect background music</p>
              </div>
            </div>
            <button
              onClick={handleGenerateMusicSuggestions}
              disabled={isLoading}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-pink-600/50 text-white px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading && activeFeature === 'music' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Finding...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Find Music</span>
                </>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Result</h3>
              <button
                onClick={() => setResult('')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
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
  )
}