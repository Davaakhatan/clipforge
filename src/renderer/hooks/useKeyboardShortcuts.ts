import { useEffect, useCallback } from 'react'
import { useProject } from '../context/ProjectContext'

export function useKeyboardShortcuts() {
  const { state, setCurrentTime, setPlaying, removeClip, removeAudioClip, splitClip, splitAudioClip, duplicateAudioClip, undo, redo, canUndo, canRedo, copyClip, pasteClip, copyAudioClip, pasteAudioClip, groupClips, ungroupClips, saveHistory } = useProject()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Cmd/Ctrl + Z: Undo
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) undo()
        return
      }

      // Cmd/Ctrl + Shift + Z: Redo (or Cmd/Ctrl + Y)
      if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && e.code === 'KeyZ') || e.code === 'KeyY')) {
        e.preventDefault()
        if (canRedo) redo()
        return
      }

      // Space: Play/Pause
      if (e.code === 'Space') {
        e.preventDefault()
        setPlaying(!state.isPlaying)
        return
      }

      // Left/Right arrows: Seek 1 second
      if (e.code === 'ArrowLeft') {
        e.preventDefault()
        setCurrentTime(Math.max(0, state.currentTime - 1000))
        return
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault()
        setCurrentTime(state.currentTime + 1000)
        return
      }

      // Home: Go to start
      if (e.code === 'Home') {
        e.preventDefault()
        setCurrentTime(0)
        return
      }

      // Delete: Remove selected clip (but not when editing text or in input fields)
      if ((e.code === 'Delete' || e.code === 'Backspace') && !state.isTextEditing && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        if (state.selectedClipId) {
          e.preventDefault()
          // Check if it's a video clip or audio clip
          const isVideoClip = state.tracks.some(track => track.clips.some(clip => clip.id === state.selectedClipId))
          const isAudioClip = state.audioTracks.some(track => track.clips.some(clip => clip.id === state.selectedClipId))
          
          if (isVideoClip) {
            removeClip(state.selectedClipId)
          } else if (isAudioClip) {
            removeAudioClip(state.selectedClipId)
          }
        }
        return
      }

      // Ctrl/Cmd + D: Duplicate selected audio clip
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        e.preventDefault()
        if (state.selectedClipId) {
          // Check if it's an audio clip
          const isAudioClip = state.audioTracks.some(track => track.clips.some(clip => clip.id === state.selectedClipId))
          if (isAudioClip) {
            duplicateAudioClip(state.selectedClipId)
          }
        }
        return
      }

      // Ctrl/Cmd + C: Copy selected clip
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        e.preventDefault()
        if (state.selectedClipId) {
          // Check if it's a video clip or audio clip
          const isVideoClip = state.tracks.some(track => track.clips.some(clip => clip.id === state.selectedClipId))
          const isAudioClip = state.audioTracks.some(track => track.clips.some(clip => clip.id === state.selectedClipId))
          
          if (isVideoClip) {
            copyClip(state.selectedClipId)
          } else if (isAudioClip) {
            copyAudioClip(state.selectedClipId)
          }
        }
        return
      }

      // Ctrl/Cmd + V: Paste clip at playhead
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault()
        pasteClip()
        pasteAudioClip()
        return
      }

      // S: Split clip at playhead
      if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        
        // Find video clip at current playhead position
        const videoClipAtPlayhead = state.tracks
          .flatMap(track => track.clips)
          .find(clip => {
            const startTime = clip.offset
            const endTime = startTime + clip.duration
            return state.currentTime >= startTime && state.currentTime <= endTime && state.currentTime > startTime && state.currentTime < endTime
          })

        // Find audio clip at current playhead position
        const audioClipAtPlayhead = state.audioTracks
          .flatMap(track => track.clips)
          .find(clip => {
            const startTime = clip.offset
            const endTime = startTime + clip.duration
            return state.currentTime >= startTime && state.currentTime <= endTime && state.currentTime > startTime && state.currentTime < endTime
          })

        if (videoClipAtPlayhead) {
          splitClip(videoClipAtPlayhead.id, state.currentTime)
          setCurrentTime(state.currentTime) // Keep playhead at split point
        } else if (audioClipAtPlayhead) {
          splitAudioClip(audioClipAtPlayhead.id, state.currentTime)
          setCurrentTime(state.currentTime) // Keep playhead at split point
        }
        return
      }

      // Ctrl/Cmd + G: Group/Ungroup selected clips
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyG' && !e.shiftKey) {
        e.preventDefault()
        const selectedVideoClips = state.clips.filter(clip => state.selectedClipIds.includes(clip.id))
        if (selectedVideoClips.length >= 2) {
          // Check if all selected clips are in the same group
          const firstGroupId = selectedVideoClips[0]?.groupId
          const allSameGroup = firstGroupId && selectedVideoClips.every(c => c.groupId === firstGroupId)
          
          if (allSameGroup) {
            ungroupClips(state.selectedClipIds)
          } else {
            groupClips(state.selectedClipIds)
          }
          saveHistory()
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [state.isPlaying, state.currentTime, state.tracks, state.audioTracks, state.selectedClipId, state.selectedClipIds, state.clips, state.isTextEditing, setPlaying, setCurrentTime, splitClip, splitAudioClip, removeClip, removeAudioClip, duplicateAudioClip, undo, redo, canUndo, canRedo, copyClip, pasteClip, copyAudioClip, pasteAudioClip, groupClips, ungroupClips, saveHistory])
}

