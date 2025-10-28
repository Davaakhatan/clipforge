import { useEffect, useCallback } from 'react'
import { useProject } from '../context/ProjectContext'

export function useKeyboardShortcuts() {
  const { state, setCurrentTime, setPlaying, removeClip, splitClip, undo, redo, canUndo, canRedo } = useProject()

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
          removeClip(state.selectedClipId)
        }
        return
      }

      // S: Split clip at playhead
      if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        
        // Find clip at current playhead position
        const clipAtPlayhead = state.tracks
          .flatMap(track => track.clips)
          .find(clip => {
            const startTime = clip.offset
            const endTime = startTime + clip.duration
            return state.currentTime >= startTime && state.currentTime <= endTime && state.currentTime > startTime && state.currentTime < endTime
          })

        if (clipAtPlayhead) {
          splitClip(clipAtPlayhead.id, state.currentTime)
          setCurrentTime(state.currentTime) // Keep playhead at split point
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [state.isPlaying, state.currentTime, state.tracks, state.selectedClipId, state.isTextEditing, setPlaying, setCurrentTime, splitClip, removeClip, undo, redo, canUndo, canRedo])
}

