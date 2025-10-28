import React, { useState } from 'react'
import { useProject, TextOverlay } from '../context/ProjectContext'
import { v4 as uuidv4 } from 'uuid'
import VolumeAutomation from './VolumeAutomation'
import AudioMixer from './AudioMixer'
import AudioSync from './AudioSync'
import BatchOperations from './BatchOperations'
import { AISettings } from './AISettings'
import { AIFeatures } from './AIFeatures'

const RightSidebar: React.FC = () => {
  const { state, setPlaying, setCurrentTime, updateClip, addTextOverlay, updateTextOverlay, saveHistory, updateAudioClip, splitClip, splitAudioClip, duplicateAudioClip, normalizeAudioClip, setCrossfadeAudioClip, setAudioEffects, addVolumeKeyframe, removeVolumeKeyframe, updateVolumeKeyframe, setAudioSyncOffset, updateAudioTrack, setMasterVolume, setMasterMute, setSelectedClips, addToSelection, removeFromSelection, clearSelection, batchUpdateClips, batchUpdateAudioClips } = useProject()

  const selectedClip = state.clips.find(c => c.id === state.selectedClipId)
  const selectedAudioClip = state.audioClips.find(c => c.id === state.selectedClipId)

  // AI state
  const [showAISettings, setShowAISettings] = useState(false)
  const [showAIFeatures, setShowAIFeatures] = useState(false)

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

  const handleSplitClip = () => {
    if (selectedClip) {
      splitClip(selectedClip.id, state.currentTime)
      saveHistory()
    }
  }

  const handleSplitAudioClip = () => {
    if (selectedAudioClip) {
      splitAudioClip(selectedAudioClip.id, state.currentTime)
      saveHistory()
    }
  }

  const handleDuplicateAudioClip = () => {
    if (selectedAudioClip) {
      duplicateAudioClip(selectedAudioClip.id)
      saveHistory()
    }
  }

  const handleNormalizeAudioClip = () => {
    if (selectedAudioClip) {
      normalizeAudioClip(selectedAudioClip.id, 0.8) // Normalize to 80% volume
      saveHistory()
    }
  }

  const totalDuration = state.clips.reduce((sum, clip) => sum + clip.duration, 0)

  return (
    <div className="w-full h-full border-l border-gray-800 bg-dark-secondary flex flex-col overflow-auto">
      {/* Batch Operations Section */}
      <div className="p-4 border-b border-gray-800">
        <BatchOperations
          selectedClipIds={state.selectedClipIds}
          clips={state.clips}
          audioClips={state.audioClips}
          onBatchUpdateClips={batchUpdateClips}
          onBatchUpdateAudioClips={batchUpdateAudioClips}
          onClearSelection={clearSelection}
        />
      </div>

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

            {/* Mute Video Audio Control */}
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.67l5.89 5.89a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zm5.8 5.8l-1.39 1.39 4.6 4.6v-2.22l2.81 2.81c.28-.95.13-2.12-.53-3.12L13 8.44V5.16l0 0 3.46 2.26c.26.17.51.31.77.44 1.12.57 1.73 1.04 2.01 1.3L21 12l-4.37 3.71-.92.91C15.16 16.3 14.28 16 13.37 16h-.37l-3.77-2.57z"/>
                  </svg>
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Video Audio</label>
                </div>
                <button
                  onClick={() => {
                    updateClip(selectedClip.id, { muted: !selectedClip.muted })
                    saveHistory()
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                    selectedClip.muted
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'bg-green-600 text-white shadow-lg'
                  }`}
                >
                  {selectedClip.muted ? '🔇 Muted' : '🔊 On'}
                </button>
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
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl p-4 border border-purple-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <label className="text-xs font-bold text-white uppercase tracking-wider">Transitions</label>
              </div>
              
              {/* Transition In */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 mb-2 block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  Transition In
                </label>
                <select
                  value={selectedClip.transitionIn || 'none'}
                  onChange={(e) => {
                    updateClip(selectedClip.id, { transitionIn: e.target.value as any })
                    saveHistory()
                  }}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white text-xs hover:border-purple-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="none">None</option>
                  <option value="fade">✨ Fade In</option>
                  <option value="slide-left">⬅️ Slide From Left</option>
                  <option value="slide-right">➡️ Slide From Right</option>
                  <option value="slide-up">⬆️ Slide From Top</option>
                  <option value="slide-down">⬇️ Slide From Bottom</option>
                  <option value="zoom-in">🔍 Zoom In</option>
                  <option value="zoom-out">🔎 Zoom Out</option>
                  <option value="blur">🌫️ Blur</option>
                </select>
              </div>
              
              {/* Transition Out */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 mb-2 block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  Transition Out
                </label>
                <select
                  value={selectedClip.transitionOut || 'none'}
                  onChange={(e) => {
                    updateClip(selectedClip.id, { transitionOut: e.target.value as any })
                    saveHistory()
                  }}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white text-xs hover:border-purple-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="none">None</option>
                  <option value="fade">✨ Fade Out</option>
                  <option value="slide-left">⬅️ Slide To Left</option>
                  <option value="slide-right">➡️ Slide To Right</option>
                  <option value="slide-up">⬆️ Slide To Top</option>
                  <option value="slide-down">⬇️ Slide To Bottom</option>
                  <option value="zoom-in">🔍 Zoom In</option>
                  <option value="zoom-out">🔎 Zoom Out</option>
                  <option value="blur">🌫️ Blur</option>
                </select>
              </div>
              
              {/* Transition Duration */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  Duration (ms)
                </label>
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
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white text-xs hover:border-purple-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <div className="flex items-center gap-2 mt-2">
                  {[100, 300, 500, 1000].map(val => (
                    <button
                      key={val}
                      onClick={() => {
                        updateClip(selectedClip.id, { transitionDuration: val })
                        saveHistory()
                      }}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        selectedClip.transitionDuration === val
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
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

            {/* Split Video Button */}
            <button
              onClick={handleSplitClip}
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white text-sm font-bold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
              title="Split video at current playhead position"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Split Video</span>
            </button>
            
            {/* Helper text */}
            <p className="text-xs text-gray-500 text-center mt-2">
              💡 Double-click to edit • Drag to move • Split at playhead
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

      {/* Audio Clip Properties Section - Only show when audio clip is selected */}
      {selectedAudioClip && (
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-5">
            <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <h3 className="text-sm font-semibold text-white">Audio Properties</h3>
            <div className="ml-auto text-xs text-green-400 font-bold">
              ✓ Selected
            </div>
          </div>
          
          <div className="space-y-5">
            {/* Audio Volume Control */}
            <div className="bg-gradient-to-br from-pink-800/50 to-purple-800/50 rounded-xl p-4 border border-pink-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                <label className="text-xs font-bold text-white uppercase tracking-wider">Volume</label>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-300">Volume Level</span>
                  <span className="text-xs text-pink-400 font-bold font-mono">{Math.round(selectedAudioClip.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={selectedAudioClip.volume}
                  onChange={(e) => {
                    updateAudioClip(selectedAudioClip.id, { volume: parseFloat(e.target.value) })
                    saveHistory()
                  }}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${selectedAudioClip.volume * 100}%, #1f2937 ${selectedAudioClip.volume * 100}%, #1f2937 100%)`
                  }}
                />
                
                {/* Quick Volume Presets */}
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  {[0, 0.25, 0.5, 0.75, 1].map(vol => (
                    <button
                      key={vol}
                      onClick={() => {
                        updateAudioClip(selectedAudioClip.id, { volume: vol })
                        saveHistory()
                      }}
                      className={`text-[10px] px-2 py-1 rounded transition-colors font-bold min-w-[2.5rem] ${
                        Math.abs(selectedAudioClip.volume - vol) < 0.01
                          ? 'bg-pink-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                      title={vol === 0 ? 'Mute' : `${Math.round(vol * 100)}%`}
                    >
                      {vol === 0 ? '🔇' : `${Math.round(vol * 100)}%`}
                    </button>
                  ))}
                </div>
              </div>

                {/* Fade Controls */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4l-2 16h14l-2-16M9 9v6M15 9v6" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-300">Fade Effects</span>
                  </div>
                  
                  {/* Fade In */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">Fade In</span>
                      <span className="text-xs text-pink-400 font-bold">
                        {selectedAudioClip.fadeIn ? `${selectedAudioClip.fadeIn}ms` : '0ms'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2000"
                      step="100"
                      value={selectedAudioClip.fadeIn || 0}
                      onChange={(e) => {
                        updateAudioClip(selectedAudioClip.id, { fadeIn: parseInt(e.target.value) })
                        saveHistory()
                      }}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${((selectedAudioClip.fadeIn || 0) / 2000) * 100}%, #1f2937 ${((selectedAudioClip.fadeIn || 0) / 2000) * 100}%, #1f2937 100%)`
                      }}
                    />
                  </div>

                  {/* Fade Out */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">Fade Out</span>
                      <span className="text-xs text-pink-400 font-bold">
                        {selectedAudioClip.fadeOut ? `${selectedAudioClip.fadeOut}ms` : '0ms'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2000"
                      step="100"
                      value={selectedAudioClip.fadeOut || 0}
                      onChange={(e) => {
                        updateAudioClip(selectedAudioClip.id, { fadeOut: parseInt(e.target.value) })
                        saveHistory()
                      }}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${((selectedAudioClip.fadeOut || 0) / 2000) * 100}%, #1f2937 ${((selectedAudioClip.fadeOut || 0) / 2000) * 100}%, #1f2937 100%)`
                      }}
                    />
                  </div>

                  {/* Quick Fade Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: 'None', fadeIn: 0, fadeOut: 0 },
                      { label: 'Quick', fadeIn: 200, fadeOut: 200 },
                      { label: 'Smooth', fadeIn: 500, fadeOut: 500 },
                      { label: 'Long', fadeIn: 1000, fadeOut: 1000 }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          updateAudioClip(selectedAudioClip.id, { 
                            fadeIn: preset.fadeIn, 
                            fadeOut: preset.fadeOut 
                          })
                          saveHistory()
                        }}
                        className={`text-[10px] px-2 py-1 rounded transition-colors font-bold min-w-[2.5rem] ${
                          (selectedAudioClip.fadeIn || 0) === preset.fadeIn && 
                          (selectedAudioClip.fadeOut || 0) === preset.fadeOut
                            ? 'bg-pink-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Crossfade Controls */}
                <div className="bg-gradient-to-br from-blue-800/50 to-cyan-800/50 rounded-xl p-4 border border-blue-500/30 backdrop-blur-sm mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <label className="text-xs font-bold text-white uppercase tracking-wider">Crossfade</label>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Crossfade In */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Crossfade In</span>
                        <span className="text-xs text-blue-400 font-bold">
                          {selectedAudioClip.crossfadeIn ? `${selectedAudioClip.crossfadeIn}ms` : '0ms'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="100"
                        value={selectedAudioClip.crossfadeIn || 0}
                        onChange={(e) => {
                          setCrossfadeAudioClip(selectedAudioClip.id, parseInt(e.target.value), selectedAudioClip.crossfadeOut)
                          saveHistory()
                        }}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((selectedAudioClip.crossfadeIn || 0) / 2000) * 100}%, #1f2937 ${((selectedAudioClip.crossfadeIn || 0) / 2000) * 100}%, #1f2937 100%)`
                        }}
                      />
                    </div>

                    {/* Crossfade Out */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Crossfade Out</span>
                        <span className="text-xs text-blue-400 font-bold">
                          {selectedAudioClip.crossfadeOut ? `${selectedAudioClip.crossfadeOut}ms` : '0ms'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="100"
                        value={selectedAudioClip.crossfadeOut || 0}
                        onChange={(e) => {
                          setCrossfadeAudioClip(selectedAudioClip.id, selectedAudioClip.crossfadeIn, parseInt(e.target.value))
                          saveHistory()
                        }}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((selectedAudioClip.crossfadeOut || 0) / 2000) * 100}%, #1f2937 ${((selectedAudioClip.crossfadeOut || 0) / 2000) * 100}%, #1f2937 100%)`
                        }}
                      />
                    </div>

                    {/* Quick Crossfade Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { label: 'None', crossfadeIn: 0, crossfadeOut: 0 },
                        { label: 'Quick', crossfadeIn: 200, crossfadeOut: 200 },
                        { label: 'Smooth', crossfadeIn: 500, crossfadeOut: 500 },
                        { label: 'Long', crossfadeIn: 1000, crossfadeOut: 1000 }
                      ].map(preset => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            setCrossfadeAudioClip(selectedAudioClip.id, preset.crossfadeIn, preset.crossfadeOut)
                            saveHistory()
                          }}
                          className={`text-[10px] px-2 py-1 rounded transition-colors font-bold min-w-[2.5rem] ${
                            (selectedAudioClip.crossfadeIn || 0) === preset.crossfadeIn && 
                            (selectedAudioClip.crossfadeOut || 0) === preset.crossfadeOut
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              
              {/* Audio Info */}
              <div className="bg-gray-900/50 rounded-lg p-3 mt-4 border border-gray-700/30">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">📝 Name:</span>
                    <span className="text-gray-300 font-medium truncate">{selectedAudioClip.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">⏱️ Duration:</span>
                    <span className="text-gray-300 font-mono">{Math.floor(selectedAudioClip.duration / 1000)}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">🎵 File:</span>
                    <span className="text-gray-400 truncate">{selectedAudioClip.filePath.split('/').pop()}</span>
                  </div>
                  {selectedAudioClip.normalized && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">🎚️ Status:</span>
                      <span className="text-purple-400 font-bold">Normalized</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Audio Effects */}
              <div className="bg-gradient-to-br from-indigo-800/50 to-purple-800/50 rounded-xl p-4 mt-4 border border-indigo-500/30 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <label className="text-xs font-bold text-white uppercase tracking-wider">Audio Effects</label>
                </div>
                
                <div className="space-y-4">
                  {/* Reverb */}
                  <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-600/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-300">Reverb</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAudioClip.effects?.reverb?.enabled || false}
                          onChange={(e) => {
                            const effects = selectedAudioClip.effects || {}
                            setAudioEffects(selectedAudioClip.id, {
                              ...effects,
                              reverb: {
                                enabled: e.target.checked,
                                roomSize: effects.reverb?.roomSize || 0.5,
                                damping: effects.reverb?.damping || 0.5,
                                wet: effects.reverb?.wet || 0.3,
                              }
                            })
                            saveHistory()
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                    
                    {selectedAudioClip.effects?.reverb?.enabled && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">Room Size</span>
                            <span className="text-xs text-indigo-400 font-bold">
                              {Math.round((selectedAudioClip.effects.reverb.roomSize || 0.5) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={selectedAudioClip.effects.reverb.roomSize || 0.5}
                            onChange={(e) => {
                              const effects = selectedAudioClip.effects || {}
                              setAudioEffects(selectedAudioClip.id, {
                                ...effects,
                                reverb: {
                                  ...effects.reverb!,
                                  roomSize: parseFloat(e.target.value)
                                }
                              })
                              saveHistory()
                            }}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(selectedAudioClip.effects.reverb.roomSize || 0.5) * 100}%, #1f2937 ${(selectedAudioClip.effects.reverb.roomSize || 0.5) * 100}%, #1f2937 100%)`
                            }}
                          />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">Wet Mix</span>
                            <span className="text-xs text-indigo-400 font-bold">
                              {Math.round((selectedAudioClip.effects.reverb.wet || 0.3) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={selectedAudioClip.effects.reverb.wet || 0.3}
                            onChange={(e) => {
                              const effects = selectedAudioClip.effects || {}
                              setAudioEffects(selectedAudioClip.id, {
                                ...effects,
                                reverb: {
                                  ...effects.reverb!,
                                  wet: parseFloat(e.target.value)
                                }
                              })
                              saveHistory()
                            }}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(selectedAudioClip.effects.reverb.wet || 0.3) * 100}%, #1f2937 ${(selectedAudioClip.effects.reverb.wet || 0.3) * 100}%, #1f2937 100%)`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Echo */}
                  <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-600/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-300">Echo</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAudioClip.effects?.echo?.enabled || false}
                          onChange={(e) => {
                            const effects = selectedAudioClip.effects || {}
                            setAudioEffects(selectedAudioClip.id, {
                              ...effects,
                              echo: {
                                enabled: e.target.checked,
                                delay: effects.echo?.delay || 250,
                                feedback: effects.echo?.feedback || 0.3,
                                wet: effects.echo?.wet || 0.3,
                              }
                            })
                            saveHistory()
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                      </label>
                    </div>
                    
                    {selectedAudioClip.effects?.echo?.enabled && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">Delay</span>
                            <span className="text-xs text-cyan-400 font-bold">
                              {selectedAudioClip.effects.echo.delay || 250}ms
                            </span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="1000"
                            step="10"
                            value={selectedAudioClip.effects.echo.delay || 250}
                            onChange={(e) => {
                              const effects = selectedAudioClip.effects || {}
                              setAudioEffects(selectedAudioClip.id, {
                                ...effects,
                                echo: {
                                  ...effects.echo!,
                                  delay: parseInt(e.target.value)
                                }
                              })
                              saveHistory()
                            }}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((selectedAudioClip.effects.echo.delay || 250) - 50) / 9.5}%, #1f2937 ${((selectedAudioClip.effects.echo.delay || 250) - 50) / 9.5}%, #1f2937 100%)`
                            }}
                          />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">Feedback</span>
                            <span className="text-xs text-cyan-400 font-bold">
                              {Math.round((selectedAudioClip.effects.echo.feedback || 0.3) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="0.9"
                            step="0.01"
                            value={selectedAudioClip.effects.echo.feedback || 0.3}
                            onChange={(e) => {
                              const effects = selectedAudioClip.effects || {}
                              setAudioEffects(selectedAudioClip.id, {
                                ...effects,
                                echo: {
                                  ...effects.echo!,
                                  feedback: parseFloat(e.target.value)
                                }
                              })
                              saveHistory()
                            }}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((selectedAudioClip.effects.echo.feedback || 0.3) / 0.9) * 100}%, #1f2937 ${((selectedAudioClip.effects.echo.feedback || 0.3) / 0.9) * 100}%, #1f2937 100%)`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Distortion */}
                  <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-600/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-300">Distortion</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAudioClip.effects?.distortion?.enabled || false}
                          onChange={(e) => {
                            const effects = selectedAudioClip.effects || {}
                            setAudioEffects(selectedAudioClip.id, {
                              ...effects,
                              distortion: {
                                enabled: e.target.checked,
                                amount: effects.distortion?.amount || 0.5,
                                wet: effects.distortion?.wet || 0.3,
                              }
                            })
                            saveHistory()
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                    
                    {selectedAudioClip.effects?.distortion?.enabled && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">Amount</span>
                            <span className="text-xs text-red-400 font-bold">
                              {Math.round((selectedAudioClip.effects.distortion.amount || 0.5) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={selectedAudioClip.effects.distortion.amount || 0.5}
                            onChange={(e) => {
                              const effects = selectedAudioClip.effects || {}
                              setAudioEffects(selectedAudioClip.id, {
                                ...effects,
                                distortion: {
                                  ...effects.distortion!,
                                  amount: parseFloat(e.target.value)
                                }
                              })
                              saveHistory()
                            }}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${(selectedAudioClip.effects.distortion.amount || 0.5) * 100}%, #1f2937 ${(selectedAudioClip.effects.distortion.amount || 0.5) * 100}%, #1f2937 100%)`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Volume Automation */}
              <div className="mt-6">
                <VolumeAutomation
                clipId={selectedAudioClip.id}
                duration={selectedAudioClip.duration}
                keyframes={selectedAudioClip.volumeKeyframes || []}
                onAddKeyframe={(clipId, keyframe) => {
                  addVolumeKeyframe(clipId, keyframe)
                  saveHistory()
                }}
                onRemoveKeyframe={(clipId, keyframeTime) => {
                  removeVolumeKeyframe(clipId, keyframeTime)
                  saveHistory()
                }}
                onUpdateKeyframe={(clipId, keyframeTime, updates) => {
                  updateVolumeKeyframe(clipId, keyframeTime, updates)
                  saveHistory()
                }}
                currentTime={state.currentTime - selectedAudioClip.offset}
                />
              </div>

              {/* Audio Sync */}
              <div className="mt-6">
                <AudioSync
                  clipId={selectedAudioClip.id}
                  syncOffset={selectedAudioClip.syncOffset || 0}
                  onSetSyncOffset={(clipId, offset) => {
                    setAudioSyncOffset(clipId, offset)
                    saveHistory()
                  }}
                />
              </div>

              {/* Audio Mixer */}
              <div className="mt-6">
                <AudioMixer
                  audioTracks={state.audioTracks}
                  masterVolume={state.masterVolume}
                  masterMute={state.masterMute}
                  onUpdateTrack={(trackId, updates) => {
                    updateAudioTrack(trackId, updates)
                    saveHistory()
                  }}
                  onSetMasterVolume={(volume) => {
                    setMasterVolume(volume)
                    saveHistory()
                  }}
                  onSetMasterMute={(mute) => {
                    setMasterMute(mute)
                    saveHistory()
                  }}
                />
              </div>

              {/* Audio Action Buttons */}
              <div className="mt-4 space-y-2">
                {/* Split Audio Button */}
                <button
                  onClick={handleSplitAudioClip}
                  className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white text-sm font-bold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                  title="Split audio at current playhead position"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Split Audio</span>
                </button>

                {/* Duplicate Audio Button */}
                <button
                  onClick={handleDuplicateAudioClip}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-bold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                  title="Duplicate this audio clip"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Duplicate Audio</span>
                </button>

                {/* Normalize Audio Button */}
                <button
                  onClick={handleNormalizeAudioClip}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-bold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                  title="Normalize audio to consistent volume level"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <span>Normalize Audio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state when no clip selected */}
      {!selectedClip && !selectedAudioClip && (state.clips.length > 0 || state.audioClips.length > 0) && (
        <div className="p-4 text-center text-gray-400 text-sm">
          <div className="space-y-2">
            <p>Select a clip to edit its properties</p>
            {state.audioClips.length > 0 && (
              <div className="text-xs text-gray-500">
                <p>🎵 Audio clips available: {state.audioClips.length}</p>
                <p>Click on an audio clip to see:</p>
                <p>• Volume controls • Fade effects • Crossfade</p>
                <p>• Split • Duplicate • Normalize</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Features Section */}
      <div className="p-4 border-t border-gray-800">
        <h3 className="text-sm font-semibold text-white mb-3">AI Features</h3>
        <div className="flex gap-1.5">
          <button
            onClick={() => setShowAIFeatures(true)}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-1.5 px-2 rounded-md transition-colors text-xs flex items-center justify-center gap-1"
          >
            <span>AI Tools</span>
          </button>
          <button
            onClick={() => setShowAISettings(true)}
            className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-1.5 px-2 rounded-md transition-colors text-xs flex items-center justify-center gap-1"
          >
            <span>Settings</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Auto captions, smart editing, AI suggestions</p>
      </div>

      {/* AI Modals */}
      <AISettings isOpen={showAISettings} onClose={() => setShowAISettings(false)} />
      <AIFeatures isOpen={showAIFeatures} onClose={() => setShowAIFeatures(false)} />
    </div>
  )
}

export default RightSidebar

