import React, { createContext, useContext, useReducer, useCallback, useState, useEffect, ReactNode, useRef } from 'react'

// Helper to generate unique ID
const generateId = () => Math.random().toString(36).substring(7)

export interface TextOverlay {
  id: string
  text: string
  startTime: number
  endTime: number
  position: { x: number; y: number } // Position in percentage (0-100)
  fontSize: number
  fontFamily: string
  color: string
  alignment: 'left' | 'center' | 'right'
}

export type TransitionType = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out' | 'blur'

export interface Clip {
  id: string
  name: string
  filePath: string
  duration: number
  startTime: number
  endTime: number
  trackId: number
  offset: number
  thumbnail?: string
  speed: number // 0.25x, 0.5x, 1x (normal), 1.5x, 2x
  volume: number // 0 to 1 (0% to 100%)
  fadeIn?: number // Duration of fade in transition in ms
  fadeOut?: number // Duration of fade out transition in ms
  transitionIn?: TransitionType // Transition when clip starts
  transitionOut?: TransitionType // Transition when clip ends
  transitionDuration?: number // Duration of transition in ms (default: 500)
  textOverlays?: TextOverlay[] // Text overlays for this clip
  // Video effects
  brightness?: number // -100 to 100 (default: 0)
  contrast?: number // -100 to 100 (default: 0)
  saturation?: number // -100 to 100 (default: 0)
}

export interface TimelineTrack {
  id: number
  clips: Clip[]
}

interface ProjectState {
  tracks: TimelineTrack[]
  clips: Clip[]
  currentTime: number
  isPlaying: boolean
  zoom: number
  selectedClipId: string | null
  isTextEditing: boolean // Flag to prevent accidental deletions when editing text
}

type ProjectAction =
  | { type: 'ADD_CLIP'; clip: Clip }
  | { type: 'REMOVE_CLIP'; clipId: string }
  | { type: 'UPDATE_CLIP'; clipId: string; updates: Partial<Clip> }
  | { type: 'ADD_TEXT_OVERLAY'; clipId: string; overlay: TextOverlay }
  | { type: 'REMOVE_TEXT_OVERLAY'; clipId: string; overlayId: string }
  | { type: 'UPDATE_TEXT_OVERLAY'; clipId: string; overlayId: string; updates: Partial<TextOverlay> }
  | { type: 'SET_CURRENT_TIME'; time: number }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_SELECTED_CLIP'; clipId: string | null }
  | { type: 'SET_TEXT_EDITING'; isEditing: boolean }
  | { type: 'SPLIT_CLIP'; clipId: string; splitTime: number }
  | { type: 'SET_STATE'; state: ProjectState }

const initialState: ProjectState = {
  tracks: [
    { id: 0, clips: [] },
    { id: 1, clips: [] },
  ],
  clips: [],
  currentTime: 0,
  isPlaying: false,
  zoom: 1,
  selectedClipId: null,
  isTextEditing: false,
}

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'ADD_CLIP':
      return {
        ...state,
        clips: [...state.clips, action.clip],
        tracks: state.tracks.map(track =>
          track.id === action.clip.trackId
            ? { ...track, clips: [...track.clips, action.clip] }
            : track
        ),
      }

    case 'REMOVE_CLIP':
      return {
        ...state,
        clips: state.clips.filter(c => c.id !== action.clipId),
        tracks: state.tracks.map(track => ({
          ...track,
          clips: track.clips.filter(c => c.id !== action.clipId),
        })),
      }

    case 'UPDATE_CLIP':
      return {
        ...state,
        clips: state.clips.map(c => c.id === action.clipId ? { ...c, ...action.updates } : c),
        tracks: state.tracks.map(track => ({
          ...track,
          clips: track.clips.map(c => c.id === action.clipId ? { ...c, ...action.updates } : c),
        })),
      }

    case 'ADD_TEXT_OVERLAY': {
      return {
        ...state,
        clips: state.clips.map(c => 
          c.id === action.clipId 
            ? { ...c, textOverlays: [...(c.textOverlays || []), action.overlay] }
            : c
        ),
        tracks: state.tracks.map(track => ({
          ...track,
          clips: track.clips.map(c => 
            c.id === action.clipId 
              ? { ...c, textOverlays: [...(c.textOverlays || []), action.overlay] }
              : c
          ),
        })),
      }
    }

    case 'REMOVE_TEXT_OVERLAY': {
      return {
        ...state,
        clips: state.clips.map(c => 
          c.id === action.clipId 
            ? { ...c, textOverlays: c.textOverlays?.filter(o => o.id !== action.overlayId) || [] }
            : c
        ),
        tracks: state.tracks.map(track => ({
          ...track,
          clips: track.clips.map(c => 
            c.id === action.clipId 
              ? { ...c, textOverlays: c.textOverlays?.filter(o => o.id !== action.overlayId) || [] }
              : c
          ),
        })),
      }
    }

    case 'UPDATE_TEXT_OVERLAY': {
      return {
        ...state,
        clips: state.clips.map(c => 
          c.id === action.clipId 
            ? { ...c, textOverlays: c.textOverlays?.map(o => o.id === action.overlayId ? { ...o, ...action.updates } : o) || [] }
            : c
        ),
        tracks: state.tracks.map(track => ({
          ...track,
          clips: track.clips.map(c => 
            c.id === action.clipId 
              ? { ...c, textOverlays: c.textOverlays?.map(o => o.id === action.overlayId ? { ...o, ...action.updates } : o) || [] }
              : c
          ),
        })),
      }
    }

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.time }

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.isPlaying }

          case 'SET_ZOOM':
            return { ...state, zoom: action.zoom }

          case 'SET_SELECTED_CLIP':
            return { ...state, selectedClipId: action.clipId }

          case 'SET_TEXT_EDITING':
            return { ...state, isTextEditing: action.isEditing }

          case 'SPLIT_CLIP': {
            const clip = state.clips.find(c => c.id === action.clipId)
            if (!clip) return state

            // Calculate split position relative to clip start
            const clipStart = clip.offset
            const splitRelativeToClip = action.splitTime - clipStart

            // Check if split is within clip bounds
            if (splitRelativeToClip <= 0 || splitRelativeToClip >= clip.duration) {
              return state
            }

            // Create two new clips
            const leftClip: Clip = {
              ...clip,
              id: generateId(),
              duration: splitRelativeToClip,
              startTime: clip.startTime,
              endTime: clip.startTime + splitRelativeToClip,
            }

            const rightClip: Clip = {
              ...clip,
              id: generateId(),
              offset: clipStart + splitRelativeToClip,
              duration: clip.duration - splitRelativeToClip,
              startTime: clip.startTime + splitRelativeToClip,
              endTime: clip.endTime,
            }

            // Remove original and add split clips
            const newClips = state.clips
              .filter(c => c.id !== action.clipId)
              .concat([leftClip, rightClip])

            // Update tracks
            const newTracks = state.tracks.map(track => {
              if (track.clips.find(c => c.id === action.clipId)) {
                return {
                  ...track,
                  clips: track.clips
                    .filter(c => c.id !== action.clipId)
                    .concat([leftClip, rightClip])
                }
              }
              return track
            })

            return {
              ...state,
              clips: newClips,
              tracks: newTracks,
            }
          }

          case 'SET_STATE':
            return action.state

          default:
            return state
        }
      }

interface ProjectContextType {
  state: ProjectState
  addClip: (clip: Clip) => void
  removeClip: (clipId: string) => void
  updateClip: (clipId: string, updates: Partial<Clip>) => void
  addTextOverlay: (clipId: string, overlay: TextOverlay) => void
  removeTextOverlay: (clipId: string, overlayId: string) => void
  updateTextOverlay: (clipId: string, overlayId: string, updates: Partial<TextOverlay>) => void
  setCurrentTime: (time: number) => void
  setPlaying: (isPlaying: boolean) => void
  setZoom: (zoom: number) => void
  setSelectedClipId: (clipId: string | null) => void
  setTextEditing: (isEditing: boolean) => void
  splitClip: (clipId: string, splitTime: number) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  saveHistory: () => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState)
  const [history, setHistory] = useState<ProjectState[]>([initialState])
  const [historyIndex, setHistoryIndex] = useState(0)
  const isUpdatingRef = useRef(false)
  const isInitialMount = useRef(true)
  const skipHistoryUpdateRef = useRef(false)

  // Track history changes - only save significant changes, not every tiny trim update
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Skip history update during active trimming/dragging (saves history on mouse up instead)
    if (skipHistoryUpdateRef.current) {
      return
    }

    if (!isUpdatingRef.current && state !== history[historyIndex]) {
      // Save new state to history (truncate future if we're in the middle)
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(state)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
    
    // Reset the updating flag after state has been applied
    if (isUpdatingRef.current) {
      isUpdatingRef.current = false
    }
  }, [state, history, historyIndex])

  const addClip = useCallback((clip: Clip) => {
    dispatch({ type: 'ADD_CLIP', clip })
  }, [])

  const removeClip = useCallback((clipId: string) => {
    dispatch({ type: 'REMOVE_CLIP', clipId })
  }, [])

  const updateClip = useCallback((clipId: string, updates: Partial<Clip>) => {
    dispatch({ type: 'UPDATE_CLIP', clipId, updates })
  }, [])

  const setCurrentTime = useCallback((time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', time })
  }, [])

  const setPlaying = useCallback((isPlaying: boolean) => {
    dispatch({ type: 'SET_PLAYING', isPlaying })
  }, [])

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', zoom })
  }, [])

  const splitClip = useCallback((clipId: string, splitTime: number) => {
    dispatch({ type: 'SPLIT_CLIP', clipId, splitTime })
  }, [])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUpdatingRef.current = true
      const newIndex = historyIndex - 1
      dispatch({ type: 'SET_STATE', state: history[newIndex] })
      setHistoryIndex(newIndex)
      // isUpdatingRef will be reset when state updates
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUpdatingRef.current = true
      const newIndex = historyIndex + 1
      dispatch({ type: 'SET_STATE', state: history[newIndex] })
      setHistoryIndex(newIndex)
      // isUpdatingRef will be reset when state updates
    }
  }, [history, historyIndex])

  const saveHistory = useCallback(() => {
    // Force save current state to history
    if (state !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(state)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
  }, [state, history, historyIndex])

  return (
    <ProjectContext.Provider
      value={{
        state,
        addClip,
        removeClip,
        updateClip,
        addTextOverlay: useCallback((clipId: string, overlay: TextOverlay) => {
          dispatch({ type: 'ADD_TEXT_OVERLAY', clipId, overlay })
        }, []),
        removeTextOverlay: useCallback((clipId: string, overlayId: string) => {
          dispatch({ type: 'REMOVE_TEXT_OVERLAY', clipId, overlayId })
        }, []),
        updateTextOverlay: useCallback((clipId: string, overlayId: string, updates: Partial<TextOverlay>) => {
          dispatch({ type: 'UPDATE_TEXT_OVERLAY', clipId, overlayId, updates })
        }, []),
        setCurrentTime,
        setPlaying,
        setZoom,
        setSelectedClipId: useCallback((clipId: string | null) => {
          dispatch({ type: 'SET_SELECTED_CLIP', clipId })
        }, []),
        setTextEditing: useCallback((isEditing: boolean) => {
          dispatch({ type: 'SET_TEXT_EDITING', isEditing })
        }, []),
        splitClip,
        undo,
        redo,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        saveHistory,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}
