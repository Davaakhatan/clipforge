import React from 'react'
import { useProject, TextOverlay } from '../context/ProjectContext'
import { v4 as uuidv4 } from 'uuid'

const RightSidebar: React.FC = () => {
  const { state, setPlaying, setCurrentTime, updateClip, addTextOverlay, updateTextOverlay, saveHistory } = useProject()

  const selectedClip = state.clips.find(c => c.id === state.selectedClipId)

  const handlePlayPause = () => {
    setPlaying(!state.isPlaying)
  }

  const handleStop = () => {
    setPlaying(false)
    setCurrentTime(0)
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  const totalDuration = state.clips.reduce((sum, clip) => sum + clip.duration, 0)

  return (
    <div className="w-full h-full border-l border-gray-800 bg-dark-secondary flex flex-col overflow-auto">
      {/* Playback Controls Section */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Playback</h3>
        
        {totalDuration > 0 ? (
          <>
            <button
              onClick={handlePlayPause}
              className="w-full h-12 bg-accent hover:bg-accent-hover rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl mb-3"
            >
              {state.isPlaying ? (
                <>
                  <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                  <span className="font-semibold">Pause</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 ml-1" fill="white" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="font-semibold">Play</span>
                </>
              )}
            </button>

            {/* Time display */}
            <div className="text-center text-xs text-gray-400 font-mono mb-3">
              {formatTime(state.currentTime)} / {formatTime(totalDuration)}
            </div>

            {/* Stop button */}
            <button
              onClick={handleStop}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm font-semibold transition-colors"
            >
              ⏹ Stop
            </button>
          </>
        ) : (
          <div className="text-gray-500 text-center text-sm">
            <div className="text-3xl mb-2">🎬</div>
            <p>Import a video to start</p>
          </div>
        )}
      </div>

      {/* Clip Properties Section - Only show when clip is selected */}
      {selectedClip && (
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-5">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-sm font-semibold text-white">Clip Properties</h3>
          </div>
          
          <div className="space-y-5">
            {/* Speed Control */}
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Speed</label>
              </div>
              
              {/* Speed Presets */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[0.25, 0.5, 1, 1.25, 1.5, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => {
                      updateClip(selectedClip.id, { speed })
                      saveHistory()
                    }}
                    title={`${speed}x speed`}
                    className={`px-2 py-1.5 text-xs font-bold rounded-md transition-all ${
                      selectedClip.speed === speed
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
              
              {/* Custom Speed Input */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={selectedClip.speed}
                  onChange={(e) => {
                    const newSpeed = parseFloat(e.target.value) || 1
                    if (newSpeed >= 0.1 && newSpeed <= 10) {
                      updateClip(selectedClip.id, { speed: newSpeed })
                      saveHistory()
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Custom speed"
                />
                <span className="text-xs text-gray-500 font-mono">x</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 010-7.072m-2.828 9.9a9 9 0 010-12.728" />
                </svg>
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Volume</label>
              </div>
              
              <div className="grid grid-cols-5 gap-2">
                {[0, 0.25, 0.5, 0.75, 1].map(volume => (
                  <button
                    key={volume}
                    onClick={() => {
                      updateClip(selectedClip.id, { volume })
                      saveHistory()
                    }}
                    title={`${volume * 100}% volume`}
                    className={`px-2 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center ${
                      selectedClip.volume === volume
                        ? 'bg-green-600 text-white shadow-lg shadow-green-500/30'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {volume === 0 ? '🔇' : volume === 0.25 ? '🔉' : volume === 0.5 ? '🔊' : volume === 0.75 ? '🔊' : '🔊'}
                  </button>
                ))}
              </div>
              
              <div className="mt-3 text-xs text-gray-500 text-center">
                {Math.round(selectedClip.volume * 100)}%
              </div>
            </div>

            {/* Fade Control */}
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Fade Transitions</label>
              </div>
              
              <div className="grid grid-cols-5 gap-2">
                {[0, 0.1, 0.2, 0.3, 0.5].map(fadeDuration => (
                  <button
                    key={fadeDuration}
                    onClick={() => {
                      updateClip(selectedClip.id, { fadeIn: fadeDuration, fadeOut: fadeDuration })
                      saveHistory()
                    }}
                    title={`${fadeDuration * 100}% fade`}
                    className={`px-2 py-2 text-xs font-bold rounded-md transition-all ${
                      (selectedClip.fadeIn === fadeDuration && selectedClip.fadeOut === fadeDuration)
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {fadeDuration === 0 ? 'Off' : `${fadeDuration * 100}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Effects */}
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Video Effects</label>
                </div>
                {(selectedClip.brightness !== 0 || selectedClip.contrast !== 0 || selectedClip.saturation !== 0) && (
                  <button
                    onClick={() => {
                      updateClip(selectedClip.id, { brightness: 0, contrast: 0, saturation: 0 })
                      saveHistory()
                    }}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 rounded transition-colors flex items-center gap-1"
                    title="Reset to default"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {/* Brightness */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">Brightness</span>
                    <span className="text-xs text-gray-500 font-mono">{selectedClip.brightness || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={selectedClip.brightness || 0}
                    onChange={(e) => {
                      updateClip(selectedClip.id, { brightness: parseInt(e.target.value) })
                      saveHistory()
                    }}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-orange"
                    style={{
                      background: `linear-gradient(to right, #ea580c 0%, #ea580c ${(selectedClip.brightness || 0) + 100}%, #1f2937 ${(selectedClip.brightness || 0) + 100}%, #1f2937 100%)`
                    }}
                  />
                </div>

                {/* Contrast */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">Contrast</span>
                    <span className="text-xs text-gray-500 font-mono">{selectedClip.contrast || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={selectedClip.contrast || 0}
                    onChange={(e) => {
                      updateClip(selectedClip.id, { contrast: parseInt(e.target.value) })
                      saveHistory()
                    }}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${(selectedClip.contrast || 0) + 100}%, #1f2937 ${(selectedClip.contrast || 0) + 100}%, #1f2937 100%)`
                    }}
                  />
                </div>

                {/* Saturation */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">Saturation</span>
                    <span className="text-xs text-gray-500 font-mono">{selectedClip.saturation || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={selectedClip.saturation || 0}
                    onChange={(e) => {
                      updateClip(selectedClip.id, { saturation: parseInt(e.target.value) })
                      saveHistory()
                    }}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(selectedClip.saturation || 0) + 100}%, #1f2937 ${(selectedClip.saturation || 0) + 100}%, #1f2937 100%)`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Transitions */}
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Transitions</label>
              </div>
              
              {/* Transition In */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1 block">Transition In</label>
                <select
                  value={selectedClip.transitionIn || 'none'}
                  onChange={(e) => {
                    updateClip(selectedClip.id, { transitionIn: e.target.value as any })
                    saveHistory()
                  }}
                  className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-xs"
                >
                  <option value="none">None</option>
                  <option value="fade">Fade In</option>
                  <option value="slide-left">Slide From Left</option>
                  <option value="slide-right">Slide From Right</option>
                  <option value="slide-up">Slide From Bottom</option>
                  <option value="slide-down">Slide From Top</option>
                  <option value="zoom-in">Zoom In</option>
                  <option value="zoom-out">Zoom Out</option>
                  <option value="blur">Blur</option>
                </select>
              </div>
              
              {/* Transition Out */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1 block">Transition Out</label>
                <select
                  value={selectedClip.transitionOut || 'none'}
                  onChange={(e) => {
                    updateClip(selectedClip.id, { transitionOut: e.target.value as any })
                    saveHistory()
                  }}
                  className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-xs"
                >
                  <option value="none">None</option>
                  <option value="fade">Fade Out</option>
                  <option value="slide-left">Slide To Left</option>
                  <option value="slide-right">Slide To Right</option>
                  <option value="slide-up">Slide To Top</option>
                  <option value="slide-down">Slide To Bottom</option>
                  <option value="zoom-in">Zoom In</option>
                  <option value="zoom-out">Zoom Out</option>
                  <option value="blur">Blur</option>
                </select>
              </div>
              
              {/* Transition Duration */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Duration (ms)</label>
                <input
                  type="number"
                  min="100"
                  max="2000"
                  step="100"
                  value={selectedClip.transitionDuration || 500}
                  onChange={(e) => {
                    updateClip(selectedClip.id, { transitionDuration: parseInt(e.target.value) || 500 })
                    saveHistory()
                  }}
                  className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-xs"
                />
              </div>
            </div>

            {/* Add Text Button */}
            <button
              onClick={() => {
                if (!selectedClip) return
                
                const newTextOverlay: TextOverlay = {
                  id: uuidv4(),
                  text: 'Double-click to edit',
                  startTime: state.currentTime - selectedClip.offset,
                  endTime: state.currentTime - selectedClip.offset + 5000, // 5 seconds duration by default
                  position: { x: 50, y: 50 }, // Centered by default
                  fontSize: 48,
                  fontFamily: 'Arial',
                  color: '#ffffff',
                  alignment: 'center',
                }
                addTextOverlay(selectedClip.id, newTextOverlay)
                saveHistory()
              }}
              className="w-full px-4 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white text-sm font-bold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
              title="Add text overlay at current playhead position"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Add Text Overlay</span>
            </button>
            
            {/* Helper text */}
            <p className="text-xs text-gray-500 text-center mt-2">
              💡 Double-click to edit • Drag to move
            </p>
            
            {/* Text Controls - Show if there are text overlays */}
            {selectedClip.textOverlays && selectedClip.textOverlays.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Text Overlays ({selectedClip.textOverlays.length})
                </h4>
                {selectedClip.textOverlays.map((overlay, idx) => (
                  <div key={overlay.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-300">Text #{idx + 1}</span>
                    </div>
                    
                    {/* Font Size */}
                    <div className="mb-2">
                      <label className="text-xs text-gray-500 mb-1 block">Font Size</label>
                      <input
                        type="range"
                        min="12"
                        max="120"
                        value={overlay.fontSize}
                        onChange={(e) => {
                          updateTextOverlay(selectedClip.id, overlay.id, { fontSize: parseInt(e.target.value) })
                          saveHistory()
                        }}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-400 ml-2">{overlay.fontSize}px</span>
                    </div>
                    
                    {/* Color */}
                    <div className="mb-2">
                      <label className="text-xs text-gray-500 mb-1 block">Color</label>
                      <input
                        type="color"
                        value={overlay.color}
                        onChange={(e) => {
                          updateTextOverlay(selectedClip.id, overlay.id, { color: e.target.value })
                          saveHistory()
                        }}
                        className="w-full h-8 rounded"
                      />
                    </div>
                    
                    {/* Position */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">X Position</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={overlay.position.x.toFixed(0)}
                          onChange={(e) => {
                            updateTextOverlay(selectedClip.id, overlay.id, { 
                              position: { ...overlay.position, x: parseFloat(e.target.value) || 0 }
                            })
                            saveHistory()
                          }}
                          className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Y Position</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={overlay.position.y.toFixed(0)}
                          onChange={(e) => {
                            updateTextOverlay(selectedClip.id, overlay.id, { 
                              position: { ...overlay.position, y: parseFloat(e.target.value) || 0 }
                            })
                            saveHistory()
                          }}
                          className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state when no clip selected */}
      {!selectedClip && state.clips.length > 0 && (
        <div className="p-4 text-center text-gray-400 text-sm">
          <p>Select a clip to edit its properties</p>
        </div>
      )}
    </div>
  )
}

export default RightSidebar

