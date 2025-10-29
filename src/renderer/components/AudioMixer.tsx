import React from 'react'
import { AudioTrack } from '../context/ProjectContext'

interface AudioMixerProps {
  audioTracks: AudioTrack[]
  masterVolume: number
  masterMute: boolean
  onUpdateTrack: (trackId: number, updates: Partial<AudioTrack>) => void
  onSetMasterVolume: (volume: number) => void
  onSetMasterMute: (mute: boolean) => void
}

const AudioMixer: React.FC<AudioMixerProps> = ({
  audioTracks,
  masterVolume,
  masterMute,
  onUpdateTrack,
  onSetMasterVolume,
  onSetMasterMute
}) => {
  const formatVolume = (volume: number) => {
    return Math.round(volume * 100)
  }

  const formatPan = (pan: number) => {
    if (pan === 0) return 'C'
    if (pan < 0) return `L${Math.round(Math.abs(pan) * 100)}`
    return `R${Math.round(pan * 100)}`
  }

  const handleReset = () => {
    // Reset master controls
    onSetMasterVolume(1)
    onSetMasterMute(false)
    
    // Reset all tracks to defaults
    audioTracks.forEach(track => {
      onUpdateTrack(track.id, {
        volume: 1,
        pan: 0,
        mute: false,
        solo: false
      })
    })
  }

  return (
    <div className="bg-gray-800/30 rounded p-2.5 border border-gray-700/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Audio Mixer</label>
        </div>
        <button
          onClick={handleReset}
          className="px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 text-xs text-gray-300 rounded transition-colors flex items-center gap-1"
          title="Reset all mixer settings to defaults"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
      </div>

      {/* Master Controls */}
      <div className="bg-gray-800/30 rounded p-2 border border-gray-700/30 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs font-medium text-gray-300">Master</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSetMasterMute(!masterMute)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors border ${
                masterMute 
                  ? 'bg-gray-700/50 border-gray-600/50 text-gray-300' 
                  : 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              MUTE
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          {/* Master Volume */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Volume</span>
              <span className="text-[10px] text-gray-300 font-medium">
                {formatVolume(masterVolume)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onSetMasterVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #4b5563 0%, #4b5563 ${masterVolume * 100}%, #1f2937 ${masterVolume * 100}%, #1f2937 100%)`
              }}
            />
          </div>
        </div>
      </div>

      {/* Track Controls */}
      <div className="space-y-2">
        {audioTracks.map((track) => (
          <div key={track.id} className="bg-gray-800/30 rounded p-2 border border-gray-700/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-xs font-medium text-gray-300">Track {track.id}</span>
                <span className="text-xs text-gray-500">({track.clips.length} clips)</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateTrack(track.id, { solo: !track.solo })}
                  className={`px-1.5 py-1 rounded text-xs font-medium transition-colors border ${
                    track.solo 
                      ? 'bg-gray-700/50 border-gray-600/50 text-gray-300' 
                      : 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  SOLO
                </button>
                <button
                  onClick={() => onUpdateTrack(track.id, { mute: !track.mute })}
                  className={`px-1.5 py-1 rounded text-xs font-medium transition-colors border ${
                    track.mute 
                      ? 'bg-gray-700/50 border-gray-600/50 text-gray-300' 
                      : 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  MUTE
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {/* Track Volume */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Volume</span>
                  <span className="text-[10px] text-gray-300 font-medium">
                    {formatVolume(track.volume)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => onUpdateTrack(track.id, { volume: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-gray-700 rounded appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #4b5563 0%, #4b5563 ${track.volume * 100}%, #1f2937 ${track.volume * 100}%, #1f2937 100%)`
                  }}
                />
              </div>

              {/* Track Pan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Pan</span>
                  <span className="text-[10px] text-gray-300 font-medium">
                    {formatPan(track.pan)}
                  </span>
                </div>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={track.pan}
                  onChange={(e) => onUpdateTrack(track.id, { pan: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-gray-700 rounded appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #4b5563 0%, #6b7280 50%, #4b5563 100%)`
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mixer Tips */}
      <div className="mt-2 text-xs text-gray-500 space-y-0.5">
        <div><strong>SOLO:</strong> Play only this track</div>
        <div><strong>MUTE:</strong> Silence this track</div>
        <div><strong>PAN:</strong> L=Left, C=Center, R=Right</div>
      </div>
    </div>
  )
}

export default AudioMixer
