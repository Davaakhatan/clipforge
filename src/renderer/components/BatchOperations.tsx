import React, { useState } from 'react'
import { Clip, AudioClip } from '../context/ProjectContext'

interface BatchOperationsProps {
  selectedClipIds: string[]
  clips: Clip[]
  audioClips: AudioClip[]
  onBatchUpdateClips: (clipIds: string[], updates: Partial<Clip>) => void
  onBatchUpdateAudioClips: (clipIds: string[], updates: Partial<AudioClip>) => void
  onClearSelection: () => void
}

const BatchOperations: React.FC<BatchOperationsProps> = ({
  selectedClipIds,
  clips,
  audioClips,
  onBatchUpdateClips,
  onBatchUpdateAudioClips,
  onClearSelection
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const selectedClips = clips.filter(clip => selectedClipIds.includes(clip.id))
  const selectedAudioClips = audioClips.filter(clip => selectedClipIds.includes(clip.id))
  const totalSelected = selectedClipIds.length

  const handleBatchVolumeChange = (volume: number) => {
    if (selectedClips.length > 0) {
      onBatchUpdateClips(selectedClipIds, { volume })
    }
    if (selectedAudioClips.length > 0) {
      onBatchUpdateAudioClips(selectedClipIds, { volume })
    }
  }

  const handleBatchSpeedChange = (speed: number) => {
    if (selectedClips.length > 0) {
      onBatchUpdateClips(selectedClipIds, { speed })
    }
  }

  const handleBatchOpacityChange = (opacity: number) => {
    if (selectedClips.length > 0) {
      onBatchUpdateClips(selectedClipIds, { opacity })
    }
  }

  const handleBatchEffects = (effects: any) => {
    if (selectedClips.length > 0) {
      onBatchUpdateClips(selectedClipIds, { effects })
    }
    if (selectedAudioClips.length > 0) {
      onBatchUpdateAudioClips(selectedClipIds, { effects })
    }
  }

  if (totalSelected === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-orange-800/50 to-red-800/50 rounded-lg p-3 border border-orange-500/30 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <label className="text-xs font-bold text-white uppercase tracking-wider">Batch Operations</label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-orange-400 font-bold">{totalSelected} selected</span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <button
            onClick={onClearSelection}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Batch Volume */}
          {(selectedClips.length > 0 || selectedAudioClips.length > 0) && (
            <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-600/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-300">Volume</span>
                <span className="text-xs text-orange-400 font-bold">
                  {selectedClips.length > 0 ? `${Math.round((selectedClips[0]?.volume || 1) * 100)}%` : 
                   selectedAudioClips.length > 0 ? `${Math.round((selectedAudioClips[0]?.volume || 1) * 100)}%` : '100%'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedClips.length > 0 ? selectedClips[0]?.volume || 1 : selectedAudioClips[0]?.volume || 1}
                onChange={(e) => handleBatchVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #f97316 0%, #f97316 ${((selectedClips.length > 0 ? selectedClips[0]?.volume || 1 : selectedAudioClips[0]?.volume || 1) * 100)}%, #1f2937 ${((selectedClips.length > 0 ? selectedClips[0]?.volume || 1 : selectedAudioClips[0]?.volume || 1) * 100)}%, #1f2937 100%)`
                }}
              />
            </div>
          )}

          {/* Batch Speed (Video only) */}
          {selectedClips.length > 0 && (
            <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-600/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-300">Speed</span>
                <span className="text-xs text-orange-400 font-bold">
                  {selectedClips[0]?.speed || 1}x
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleBatchSpeedChange(speed)}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                      (selectedClips[0]?.speed || 1) === speed
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Batch Opacity (Video only) */}
          {selectedClips.length > 0 && (
            <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-600/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-300">Opacity</span>
                <span className="text-xs text-orange-400 font-bold">
                  {Math.round((selectedClips[0]?.opacity || 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedClips[0]?.opacity || 1}
                onChange={(e) => handleBatchOpacityChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #f97316 0%, #f97316 ${((selectedClips[0]?.opacity || 1) * 100)}%, #1f2937 ${((selectedClips[0]?.opacity || 1) * 100)}%, #1f2937 100%)`
                }}
              />
            </div>
          )}

          {/* Batch Effects Reset */}
          <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-600/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-300">Effects</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleBatchEffects({
                  brightness: 1,
                  contrast: 1,
                  saturation: 1
                })}
                className="px-2 py-1 rounded text-xs font-bold bg-gray-600 text-gray-300 hover:bg-gray-500 transition-all"
              >
                Reset Video
              </button>
              <button
                onClick={() => handleBatchEffects({
                  reverb: { enabled: false },
                  echo: { enabled: false },
                  distortion: { enabled: false }
                })}
                className="px-2 py-1 rounded text-xs font-bold bg-gray-600 text-gray-300 hover:bg-gray-500 transition-all"
              >
                Reset Audio
              </button>
            </div>
          </div>

          {/* Selection Info */}
          <div className="text-xs text-gray-500 space-y-0.5">
            <div>📹 <strong>Video:</strong> {selectedClips.length} clips</div>
            <div>🎵 <strong>Audio:</strong> {selectedAudioClips.length} clips</div>
            <div>⚡ <strong>Tip:</strong> Changes apply to all selected clips</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BatchOperations
