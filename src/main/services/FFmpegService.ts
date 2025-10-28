import ffmpeg from 'fluent-ffmpeg'
import * as fs from 'fs'
import * as path from 'path'

// Set FFmpeg and ffprobe paths
ffmpeg.setFfmpegPath('/usr/local/bin/ffmpeg')
ffmpeg.setFfprobePath('/usr/local/bin/ffprobe')

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  size: number
  format: string
}

export interface AudioMetadata {
  duration: number
  size: number
  format: string
  sampleRate?: number
  channels?: number
}

class FFmpegService {
  /**
   * Get video metadata (duration, resolution, file size)
   */
  getMetadata(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const stats = fs.statSync(filePath)
      
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err)
          return
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video')
        
        if (!videoStream) {
          reject(new Error('No video stream found'))
          return
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          size: stats.size,
          format: metadata.format.format_name || '',
        })
      })
    })
  }

  /**
   * Get audio metadata (duration, file size, format, sample rate, channels)
   */
  getAudioMetadata(filePath: string): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      const stats = fs.statSync(filePath)
      
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err)
          return
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio')
        
        if (!audioStream) {
          reject(new Error('No audio stream found'))
          return
        }

        resolve({
          duration: metadata.format.duration || 0,
          size: stats.size,
          format: metadata.format.format_name || '',
          sampleRate: audioStream.sample_rate || undefined,
          channels: audioStream.channels || undefined,
        })
      })
    })
  }

  /**
   * Generate a thumbnail at a specific timestamp
   */
  generateThumbnail(
    videoPath: string,
    outputPath: string,
    timestamp: number = 1
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
        })
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(err))
    })
  }

  /**
   * Trim a video to a specific duration
   */
  trimVideo(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(err))
        .run()
    })
  }

  /**
   * Export timeline to MP4 - trims clips and concatenates them
   */
  async exportProject(
    clips: Array<{ 
      filePath: string
      offset: number
      duration: number
      startTime: number
      endTime: number
    }>,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const tempDir = path.join(path.dirname(outputPath), 'temp_export')
    fs.mkdirSync(tempDir, { recursive: true })

    try {
      // Step 1: Trim each clip
      const trimmedClips: string[] = []
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i]
        const trimmedPath = path.join(tempDir, `clip_${i}.mp4`)
        
        await new Promise<void>((resolve, reject) => {
          const startSec = clip.startTime / 1000
          const durationSec = clip.duration / 1000
          
          ffmpeg(clip.filePath)
            .seekInput(startSec)
            .duration(durationSec)
            .outputOptions(['-c:v copy', '-c:a copy']) // Copy codecs for speed
            .output(trimmedPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run()
        })
        
        trimmedClips.push(trimmedPath)
      }

      // Step 2: Concatenate all trimmed clips
      await new Promise<void>((resolve, reject) => {
        const concatFilePath = path.join(tempDir, 'concat.txt')
        const concatLines = trimmedClips.map(clipPath => `file '${clipPath}'`)
        fs.writeFileSync(concatFilePath, concatLines.join('\n'))

        ffmpeg()
          .input(concatFilePath)
          .inputOptions(['-safe', '0', '-f', 'concat'])
          .outputOptions(['-c copy'])
          .on('progress', (progress) => {
            if (progress.percent && onProgress) {
              onProgress(progress.percent)
            }
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .save(outputPath)
      })

      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true })
      
      return outputPath
    } catch (error) {
      // Clean up on error
      try {
        fs.rmSync(tempDir, { recursive: true, force: true })
      } catch {}
      throw error
    }
  }
}

export const ffmpegService = new FFmpegService()
