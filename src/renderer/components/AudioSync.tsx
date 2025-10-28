import React, { useState } from 'react'

interface AudioSyncProps {
  clipId: string
  syncOffset: number
  onSetSyncOffset: (clipId: string, offset: number) => void
}

const AudioSync: React.FC<AudioSyncProps> = ({
  clipId,
  syncOffset,
  onSetSyncOffset
}) => {
  const [isAdjusting, setIsAdjusting] = useState(false)

  const formatOffset = (offset: number) => {
    if (offset === 0) return '0ms'
    const absOffset = Math.abs(offset)
    if (absOffset >= 1000) {
      return `${offset > 0 ? '+' : '-'}${(absOffset / 1000).toFixed(1)}s`
    }
    return `${offset > 0 ? '+' : ''}${offset}ms`
  }

  const quickAdjustments = [
    { label: '-1s', value: -1000 },
    { label: '-100ms', value: -100 },
    { label: '-10ms', value: -10 },
    { label: 'Reset', value: 0 },
    { label: '+10ms', value: 10 },
    { label: '+100ms', value: 100 },
    { label: '+1s', value: 1000 },
  ]

  const handleQuickAdjust = (value: number) => {
    onSetSyncOffset(clipId, value)
  }

  const handleSliderChange = (value: number) => {
    onSetSyncOffset(clipId, value)
  }

  return (
    <div className="bg-gradient-to-br from-emerald-800/50 to-teal-800/50 rounded-lg p-3 border border-emerald-500/30 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <label className="text-xs font-bold text-white uppercase tracking-wider">Audio Sync</label>
      </div>

      {/* Current Offset Display */}
      <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-600/30 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-300">Sync Offset</span>
          <span className={`text-sm font-bold font-mono ${
            syncOffset === 0 ? 'text-gray-400' : 
            syncOffset > 0 ? 'text-red-400' : 'text-blue-400'
          }`}>
            {formatOffset(syncOffset)}
          </span>
        </div>
        
        <div className="text-xs text-gray-500 mb-2">
          {syncOffset === 0 ? 'Perfect sync' : 
           syncOffset > 0 ? 'Audio delayed (behind video)' : 
           'Audio advanced (ahead of video)'}
        </div>

        {/* Fine Adjustment Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Fine Adjust</span>
            <span className="text-xs text-emerald-400 font-bold">
              {formatOffset(syncOffset)}
            </span>
          </div>
          <input
            type="range"
            min="-2000"
            max="2000"
            step="10"
            value={syncOffset}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #10b981 50%, #ef4444 100%)`
            }}
          />
        </div>
      </div>

      {/* Quick Adjustment Buttons */}
      <div className="space-y-2">
        <div className="text-xs text-gray-400 mb-1">Quick Adjustments</div>
        <div className="grid grid-cols-4 gap-1.5">
          {quickAdjustments.map((adjustment) => (
            <button
              key={adjustment.label}
              onClick={() => handleQuickAdjust(adjustment.value)}
              className={`px-1.5 py-1.5 rounded text-xs font-bold transition-all ${
                adjustment.value === 0 
                  ? 'bg-gray-600 text-white hover:bg-gray-500' 
                  : adjustment.value > 0
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {adjustment.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sync Tips */}
      <div className="mt-3 text-xs text-gray-500 space-y-0.5">
        <div>🎬 <strong>Positive:</strong> Delay audio (move right)</div>
        <div>⚡ <strong>Negative:</strong> Advance audio (move left)</div>
        <div>🎯 <strong>Tip:</strong> Use fine slider for precise sync</div>
      </div>
    </div>
  )
}

export default AudioSync
