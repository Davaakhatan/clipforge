import React from 'react'

interface AudioWaveformProps {
  duration: number
  width: number
  height: number
  color?: string
  backgroundColor?: string
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({
  duration,
  width,
  height,
  color = '#ec4899',
  backgroundColor = 'transparent'
}) => {
  // Generate a simple waveform pattern
  const generateWaveform = () => {
    const bars = Math.floor(width / 4) // 4px per bar
    const waveform = []
    
    for (let i = 0; i < bars; i++) {
      // Create a simple sine wave pattern with some randomness
      const progress = i / bars
      const amplitude = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5
      const randomFactor = 0.3 + Math.random() * 0.4 // 0.3 to 0.7
      const barHeight = Math.max(2, height * amplitude * randomFactor)
      
      waveform.push({
        x: i * 4,
        height: barHeight,
        y: (height - barHeight) / 2
      })
    }
    
    return waveform
  }

  const waveform = generateWaveform()

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0"
    >
      <rect
        width={width}
        height={height}
        fill={backgroundColor}
      />
      {waveform.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y={bar.y}
          width="2"
          height={bar.height}
          fill={color}
          opacity={0.8}
        />
      ))}
    </svg>
  )
}

export default AudioWaveform
