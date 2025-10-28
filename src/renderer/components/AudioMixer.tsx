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

  return (
    <div className="bg-gradient-to-br from-purple-800/50 to-indigo-800/50 rounded-lg p-3 border border-purple-500/30 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <label className="text-xs font-bold text-white uppercase tracking-wider">Audio Mixer</label>
      </div>

      {/* Master Controls */}
      <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-600/30 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs font-semibold text-gray-300">Master</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSetMasterMute(!masterMute)}
              className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                masterMute 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
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
              <span className="text-[10px] text-yellow-400 font-bold">
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
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #eab308 0%, #eab308 ${masterVolume * 100}%, #1f2937 ${masterVolume * 100}%, #1f2937 100%)`
              }}
            />
          </div>
        </div>
      </div>

      {/* Track Controls */}
      <div className="space-y-2">
        {audioTracks.map((track) => (
          <div key={track.id} className="bg-gray-800/30 rounded-lg p-2 border border-gray-600/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-xs font-semibold text-gray-300">Track {track.id}</span>
                <span className="text-xs text-gray-500">({track.clips.length} clips)</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateTrack(track.id, { solo: !track.solo })}
                  className={`px-1.5 py-1 rounded text-xs font-bold transition-all ${
                    track.solo 
                      ? 'bg-yellow-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  SOLO
                </button>
                <button
                  onClick={() => onUpdateTrack(track.id, { mute: !track.mute })}
                  className={`px-1.5 py-1 rounded text-xs font-bold transition-all ${
                    track.mute 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
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
                  <span className="text-[10px] text-blue-400 font-bold">
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
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${track.volume * 100}%, #1f2937 ${track.volume * 100}%, #1f2937 100%)`
                  }}
                />
              </div>

              {/* Track Pan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Pan</span>
                  <span className="text-[10px] text-green-400 font-bold">
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
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ef4444 0%, #10b981 50%, #3b82f6 100%)`
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mixer Tips */}
      <div className="mt-3 text-xs text-gray-500 space-y-0.5">
        <div>💡 <strong>SOLO:</strong> Play only this track</div>
        <div>🔇 <strong>MUTE:</strong> Silence this track</div>
        <div>🎚️ <strong>PAN:</strong> L=Left, C=Center, R=Right</div>
      </div>
    </div>
  )
}

export default AudioMixer
