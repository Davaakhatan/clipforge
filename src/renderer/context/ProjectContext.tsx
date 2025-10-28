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
  muted?: boolean // Whether video audio is muted
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

export interface VolumeKeyframe {
  time: number // Time in milliseconds from clip start
  volume: number // Volume level 0-1
}

export interface AudioEffects {
  reverb?: {
    enabled: boolean
    roomSize: number // 0 to 1
    damping: number // 0 to 1
    wet: number // 0 to 1 (dry/wet mix)
  }
  echo?: {
    enabled: boolean
    delay: number // ms
    feedback: number // 0 to 1
    wet: number // 0 to 1
  }
  distortion?: {
    enabled: boolean
    amount: number // 0 to 1
    wet: number // 0 to 1
  }
  eq?: {
    enabled: boolean
    low: number // -12 to 12 dB
    mid: number // -12 to 12 dB
    high: number // -12 to 12 dB
  }
}

export interface AudioClip {
  id: string
  name: string
  filePath: string
  duration: number
  startTime: number
  endTime: number
  trackId: number
  offset: number
  volume: number // 0 to 1 (0% to 100%)
  fadeIn?: number // Duration of fade in transition in ms
  fadeOut?: number // Duration of fade out transition in ms
  normalized?: boolean // Whether audio has been normalized
  originalVolume?: number // Store original volume before normalization
  crossfadeIn?: number // Duration of crossfade in from previous clip in ms
  crossfadeOut?: number // Duration of crossfade out to next clip in ms
  effects?: AudioEffects // Audio effects applied to this clip
  volumeKeyframes?: VolumeKeyframe[] // Volume automation keyframes
  syncOffset?: number // Manual sync offset in milliseconds (positive for delay, negative for advance)
}

export interface AudioTrack {
  id: number
  clips: AudioClip[]
  volume: number // Track volume 0-1 (0% to 100%)
  pan: number // Pan position -1 to 1 (left to right)
  mute: boolean // Track mute state
  solo: boolean // Track solo state
}

interface ProjectState {
  tracks: TimelineTrack[]
  audioTracks: AudioTrack[]
  clips: Clip[]
  masterVolume: number // Master volume 0-1 (0% to 100%)
  masterMute: boolean // Master mute state
  audioClips: AudioClip[]
  currentTime: number
  isPlaying: boolean
  zoom: number
  selectedClipId: string | null
  selectedClipIds: string[] // Multi-select support
  isTextEditing: boolean // Flag to prevent accidental deletions when editing text
}

type ProjectAction =
  | { type: 'ADD_CLIP'; clip: Clip }
  | { type: 'REMOVE_CLIP'; clipId: string }
  | { type: 'UPDATE_CLIP'; clipId: string; updates: Partial<Clip> }
  | { type: 'ADD_AUDIO_CLIP'; clip: AudioClip }
  | { type: 'REMOVE_AUDIO_CLIP'; clipId: string }
  | { type: 'UPDATE_AUDIO_CLIP'; clipId: string; updates: Partial<AudioClip> }
  | { type: 'SPLIT_AUDIO_CLIP'; clipId: string; splitTime: number }
  | { type: 'DUPLICATE_AUDIO_CLIP'; clipId: string }
  | { type: 'NORMALIZE_AUDIO_CLIP'; clipId: string; targetLevel?: number }
  | { type: 'SET_CROSSFADE_AUDIO_CLIP'; clipId: string; crossfadeIn?: number; crossfadeOut?: number }
  | { type: 'SET_AUDIO_EFFECTS'; clipId: string; effects: AudioEffects }
  | { type: 'ADD_VOLUME_KEYFRAME'; clipId: string; keyframe: VolumeKeyframe }
  | { type: 'REMOVE_VOLUME_KEYFRAME'; clipId: string; keyframeTime: number }
  | { type: 'UPDATE_VOLUME_KEYFRAME'; clipId: string; keyframeTime: number; updates: Partial<VolumeKeyframe> }
  | { type: 'SET_AUDIO_SYNC_OFFSET'; clipId: string; offset: number }
  | { type: 'UPDATE_AUDIO_TRACK'; trackId: number; updates: Partial<AudioTrack> }
  | { type: 'SET_MASTER_VOLUME'; volume: number }
  | { type: 'SET_MASTER_MUTE'; mute: boolean }
  | { type: 'ADD_TEXT_OVERLAY'; clipId: string; overlay: TextOverlay }
  | { type: 'REMOVE_TEXT_OVERLAY'; clipId: string; overlayId: string }
  | { type: 'UPDATE_TEXT_OVERLAY'; clipId: string; overlayId: string; updates: Partial<TextOverlay> }
  | { type: 'SET_CURRENT_TIME'; time: number }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_SELECTED_CLIP'; clipId: string | null }
  | { type: 'SET_SELECTED_CLIPS'; clipIds: string[] }
  | { type: 'ADD_TO_SELECTION'; clipId: string }
  | { type: 'REMOVE_FROM_SELECTION'; clipId: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'BATCH_UPDATE_CLIPS'; clipIds: string[]; updates: Partial<Clip> }
  | { type: 'BATCH_UPDATE_AUDIO_CLIPS'; clipIds: string[]; updates: Partial<AudioClip> }
  | { type: 'SET_TEXT_EDITING'; isEditing: boolean }
  | { type: 'SPLIT_CLIP'; clipId: string; splitTime: number }
  | { type: 'SET_STATE'; state: ProjectState }

const initialState: ProjectState = {
  tracks: [
    { id: 0, clips: [] },
    { id: 1, clips: [] },
  ],
  audioTracks: [
    { id: 0, clips: [], volume: 1, pan: 0, mute: false, solo: false },
  ],
  clips: [],
  masterVolume: 1,
  masterMute: false,
  audioClips: [],
  currentTime: 0,
  isPlaying: false,
  zoom: 1,
  selectedClipId: null,
  selectedClipIds: [],
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

    case 'ADD_AUDIO_CLIP':
      return {
        ...state,
        audioClips: [...state.audioClips, action.clip],
        audioTracks: state.audioTracks.map(track =>
          track.id === action.clip.trackId
            ? { ...track, clips: [...track.clips, action.clip] }
            : track
        ),
      }

    case 'REMOVE_AUDIO_CLIP':
      return {
        ...state,
        audioClips: state.audioClips.filter(c => c.id !== action.clipId),
        audioTracks: state.audioTracks.map(track => ({
          ...track,
          clips: track.clips.filter(c => c.id !== action.clipId),
        })),
      }

    case 'UPDATE_AUDIO_CLIP':
      return {
        ...state,
        audioClips: state.audioClips.map(c => c.id === action.clipId ? { ...c, ...action.updates } : c),
        audioTracks: state.audioTracks.map(track => ({
          ...track,
          clips: track.clips.map(c => c.id === action.clipId ? { ...c, ...action.updates } : c),
        })),
      }

    case 'SPLIT_AUDIO_CLIP': {
      const clipToSplit = state.audioClips.find(clip => clip.id === action.clipId)
      if (!clipToSplit) return state

      const splitTimeInClip = action.splitTime - clipToSplit.offset
      if (splitTimeInClip <= 0 || splitTimeInClip >= clipToSplit.duration) return state

      // Create first part of the split clip
      const firstPart: AudioClip = {
        ...clipToSplit,
        id: generateId(),
        duration: splitTimeInClip,
        endTime: clipToSplit.startTime + splitTimeInClip,
      }

      // Create second part of the split clip
      const secondPart: AudioClip = {
        ...clipToSplit,
        id: generateId(),
        startTime: clipToSplit.startTime + splitTimeInClip,
        duration: clipToSplit.duration - splitTimeInClip,
        offset: clipToSplit.offset + splitTimeInClip,
      }

      return {
        ...state,
        audioClips: [
          ...state.audioClips.filter(clip => clip.id !== action.clipId),
          firstPart,
          secondPart,
        ],
        audioTracks: state.audioTracks.map(track =>
          track.id === clipToSplit.trackId
            ? {
                ...track,
                clips: [
                  ...track.clips.filter(clip => clip.id !== action.clipId),
                  firstPart,
                  secondPart,
                ],
              }
            : track
        ),
      }
    }

    case 'DUPLICATE_AUDIO_CLIP': {
      const clipToDuplicate = state.audioClips.find(clip => clip.id === action.clipId)
      if (!clipToDuplicate) return state

      const duplicatedClip: AudioClip = {
        ...clipToDuplicate,
        id: generateId(),
        offset: clipToDuplicate.offset + clipToDuplicate.duration + 1000, // Place 1 second after original
      }

      return {
        ...state,
        audioClips: [...state.audioClips, duplicatedClip],
        audioTracks: state.audioTracks.map(track =>
          track.id === clipToDuplicate.trackId
            ? { ...track, clips: [...track.clips, duplicatedClip] }
            : track
        ),
      }
    }

    case 'NORMALIZE_AUDIO_CLIP': {
      const clipToNormalize = state.audioClips.find(clip => clip.id === action.clipId)
      if (!clipToNormalize) return state

      const targetLevel = action.targetLevel || 0.8 // Default to 80% volume
      const normalizedClip: AudioClip = {
        ...clipToNormalize,
        volume: targetLevel,
        normalized: true,
        originalVolume: clipToNormalize.normalized ? clipToNormalize.originalVolume : clipToNormalize.volume,
      }

      return {
        ...state,
        audioClips: state.audioClips.map(clip => 
          clip.id === action.clipId ? normalizedClip : clip
        ),
        audioTracks: state.audioTracks.map(track =>
          track.id === clipToNormalize.trackId
            ? {
                ...track,
                clips: track.clips.map(clip => 
                  clip.id === action.clipId ? normalizedClip : clip
                ),
              }
            : track
        ),
      }
    }

    case 'SET_CROSSFADE_AUDIO_CLIP': {
      const clipToUpdate = state.audioClips.find(clip => clip.id === action.clipId)
      if (!clipToUpdate) return state

      const updatedClip: AudioClip = {
        ...clipToUpdate,
        crossfadeIn: action.crossfadeIn,
        crossfadeOut: action.crossfadeOut,
      }

      return {
        ...state,
        audioClips: state.audioClips.map(clip => 
          clip.id === action.clipId ? updatedClip : clip
        ),
        audioTracks: state.audioTracks.map(track =>
          track.id === clipToUpdate.trackId
            ? {
                ...track,
                clips: track.clips.map(clip => 
                  clip.id === action.clipId ? updatedClip : clip
                ),
              }
            : track
        ),
      }
    }

    case 'SET_AUDIO_EFFECTS': {
      const clipToUpdate = state.audioClips.find(clip => clip.id === action.clipId)
      if (!clipToUpdate) return state

      const updatedClip: AudioClip = {
        ...clipToUpdate,
        effects: action.effects,
      }

      return {
        ...state,
        audioClips: state.audioClips.map(clip => 
          clip.id === action.clipId ? updatedClip : clip
        ),
        audioTracks: state.audioTracks.map(track =>
          track.id === clipToUpdate.trackId
            ? {
                ...track,
                clips: track.clips.map(clip => 
                  clip.id === action.clipId ? updatedClip : clip
                ),
              }
            : track
        ),
      }
    }

    case 'ADD_VOLUME_KEYFRAME': {
      const clipToUpdate = state.audioClips.find(clip => clip.id === action.clipId)
      if (!clipToUpdate) return state

      const updatedClip: AudioClip = {
        ...clipToUpdate,
        volumeKeyframes: [...(clipToUpdate.volumeKeyframes || []), action.keyframe].sort((a, b) => a.time - b.time),
      }

      return {
        ...state,
        audioClips: state.audioClips.map(clip => 
          clip.id === action.clipId ? updatedClip : clip
        ),
        audioTracks: state.audioTracks.map(track =>
          track.id === clipToUpdate.trackId
            ? {
                ...track,
                clips: track.clips.map(clip => 
                  clip.id === action.clipId ? updatedClip : clip
                ),
              }
            : track
        ),
      }
    }

    case 'REMOVE_VOLUME_KEYFRAME': {
      const clipToUpdate = state.audioClips.find(clip => clip.id === action.clipId)
      if (!clipToUpdate) return state

      const updatedClip: AudioClip = {
        ...clipToUpdate,
        volumeKeyframes: clipToUpdate.volumeKeyframes?.filter(kf => kf.time !== action.keyframeTime) || [],
      }

      return {
        ...state,
        audioClips: state.audioClips.map(clip => 
          clip.id === action.clipId ? updatedClip : clip
        ),
        audioTracks: state.audioTracks.map(track =>
          track.id === clipToUpdate.trackId
            ? {
                ...track,
                clips: track.clips.map(clip => 
                  clip.id === action.clipId ? updatedClip : clip
                ),
              }
            : track
        ),
      }
    }

    case 'UPDATE_VOLUME_KEYFRAME': {
      const clipToUpdate = state.audioClips.find(clip => clip.id === action.clipId)
      if (!clipToUpdate) return state

      const updatedClip: AudioClip = {
        ...clipToUpdate,
        volumeKeyframes: clipToUpdate.volumeKeyframes?.map(kf => 
          kf.time === action.keyframeTime ? { ...kf, ...action.updates } : kf
        ) || [],
      }

      return {
        ...state,
        audioClips: state.audioClips.map(clip => 
          clip.id === action.clipId ? updatedClip : clip
        ),
        audioTracks: state.audioTracks.map(track =>
          track.id === clipToUpdate.trackId
            ? {
                ...track,
                clips: track.clips.map(clip => 
                  clip.id === action.clipId ? updatedClip : clip
                ),
              }
            : track
        ),
      }
    }

    case 'SET_AUDIO_SYNC_OFFSET': {
      const clipToUpdate = state.audioClips.find(clip => clip.id === action.clipId)
      if (!clipToUpdate) return state

      const updatedClip: AudioClip = {
        ...clipToUpdate,
        syncOffset: action.offset,
      }

      return {
        ...state,
        audioClips: state.audioClips.map(clip => 
          clip.id === action.clipId ? updatedClip : clip
        ),
        audioTracks: state.audioTracks.map(track =>
          track.id === clipToUpdate.trackId
            ? {
                ...track,
                clips: track.clips.map(clip => 
                  clip.id === action.clipId ? updatedClip : clip
                ),
              }
            : track
        ),
      }
    }

    case 'UPDATE_AUDIO_TRACK': {
      return {
        ...state,
        audioTracks: state.audioTracks.map(track =>
          track.id === action.trackId ? { ...track, ...action.updates } : track
        ),
      }
    }

    case 'SET_MASTER_VOLUME': {
      return {
        ...state,
        masterVolume: action.volume,
      }
    }

    case 'SET_MASTER_MUTE': {
      return {
        ...state,
        masterMute: action.mute,
      }
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

          case 'SET_SELECTED_CLIPS':
            return { ...state, selectedClipIds: action.clipIds }

          case 'ADD_TO_SELECTION':
            return { 
              ...state, 
              selectedClipIds: state.selectedClipIds.includes(action.clipId) 
                ? state.selectedClipIds 
                : [...state.selectedClipIds, action.clipId]
            }

          case 'REMOVE_FROM_SELECTION':
            return { 
              ...state, 
              selectedClipIds: state.selectedClipIds.filter(id => id !== action.clipId)
            }

          case 'CLEAR_SELECTION':
            return { ...state, selectedClipIds: [] }

          case 'BATCH_UPDATE_CLIPS': {
            return {
              ...state,
              clips: state.clips.map(clip => 
                action.clipIds.includes(clip.id) 
                  ? { ...clip, ...action.updates }
                  : clip
              ),
              tracks: state.tracks.map(track => ({
                ...track,
                clips: track.clips.map(clip => 
                  action.clipIds.includes(clip.id) 
                    ? { ...clip, ...action.updates }
                    : clip
                ),
              })),
            }
          }

          case 'BATCH_UPDATE_AUDIO_CLIPS': {
            return {
              ...state,
              audioClips: state.audioClips.map(clip => 
                action.clipIds.includes(clip.id) 
                  ? { ...clip, ...action.updates }
                  : clip
              ),
              audioTracks: state.audioTracks.map(track => ({
                ...track,
                clips: track.clips.map(clip => 
                  action.clipIds.includes(clip.id) 
                    ? { ...clip, ...action.updates }
                    : clip
                ),
              })),
            }
          }

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
  addAudioClip: (clip: AudioClip) => void
  removeAudioClip: (clipId: string) => void
  updateAudioClip: (clipId: string, updates: Partial<AudioClip>) => void
  splitAudioClip: (clipId: string, splitTime: number) => void
  duplicateAudioClip: (clipId: string) => void
  normalizeAudioClip: (clipId: string, targetLevel?: number) => void
  setCrossfadeAudioClip: (clipId: string, crossfadeIn?: number, crossfadeOut?: number) => void
  setAudioEffects: (clipId: string, effects: AudioEffects) => void
  addVolumeKeyframe: (clipId: string, keyframe: VolumeKeyframe) => void
  removeVolumeKeyframe: (clipId: string, keyframeTime: number) => void
  updateVolumeKeyframe: (clipId: string, keyframeTime: number, updates: Partial<VolumeKeyframe>) => void
  setAudioSyncOffset: (clipId: string, offset: number) => void
  updateAudioTrack: (trackId: number, updates: Partial<AudioTrack>) => void
  setMasterVolume: (volume: number) => void
  setMasterMute: (mute: boolean) => void
  setSelectedClips: (clipIds: string[]) => void
  addToSelection: (clipId: string) => void
  removeFromSelection: (clipId: string) => void
  clearSelection: () => void
  batchUpdateClips: (clipIds: string[], updates: Partial<Clip>) => void
  batchUpdateAudioClips: (clipIds: string[], updates: Partial<AudioClip>) => void
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

  const addAudioClip = useCallback((clip: AudioClip) => {
    dispatch({ type: 'ADD_AUDIO_CLIP', clip })
  }, [])

  const removeAudioClip = useCallback((clipId: string) => {
    dispatch({ type: 'REMOVE_AUDIO_CLIP', clipId })
  }, [])

  const updateAudioClip = useCallback((clipId: string, updates: Partial<AudioClip>) => {
    dispatch({ type: 'UPDATE_AUDIO_CLIP', clipId, updates })
  }, [])

  const splitAudioClip = useCallback((clipId: string, splitTime: number) => {
    dispatch({ type: 'SPLIT_AUDIO_CLIP', clipId, splitTime })
  }, [])

  const duplicateAudioClip = useCallback((clipId: string) => {
    dispatch({ type: 'DUPLICATE_AUDIO_CLIP', clipId })
  }, [])

  const normalizeAudioClip = useCallback((clipId: string, targetLevel?: number) => {
    dispatch({ type: 'NORMALIZE_AUDIO_CLIP', clipId, targetLevel })
  }, [])

  const setCrossfadeAudioClip = useCallback((clipId: string, crossfadeIn?: number, crossfadeOut?: number) => {
    dispatch({ type: 'SET_CROSSFADE_AUDIO_CLIP', clipId, crossfadeIn, crossfadeOut })
  }, [])

  const setAudioEffects = useCallback((clipId: string, effects: AudioEffects) => {
    dispatch({ type: 'SET_AUDIO_EFFECTS', clipId, effects })
  }, [])

  const addVolumeKeyframe = useCallback((clipId: string, keyframe: VolumeKeyframe) => {
    dispatch({ type: 'ADD_VOLUME_KEYFRAME', clipId, keyframe })
  }, [])

  const removeVolumeKeyframe = useCallback((clipId: string, keyframeTime: number) => {
    dispatch({ type: 'REMOVE_VOLUME_KEYFRAME', clipId, keyframeTime })
  }, [])

  const updateVolumeKeyframe = useCallback((clipId: string, keyframeTime: number, updates: Partial<VolumeKeyframe>) => {
    dispatch({ type: 'UPDATE_VOLUME_KEYFRAME', clipId, keyframeTime, updates })
  }, [])

  const setAudioSyncOffset = useCallback((clipId: string, offset: number) => {
    dispatch({ type: 'SET_AUDIO_SYNC_OFFSET', clipId, offset })
  }, [])

  const updateAudioTrack = useCallback((trackId: number, updates: Partial<AudioTrack>) => {
    dispatch({ type: 'UPDATE_AUDIO_TRACK', trackId, updates })
  }, [])

  const setMasterVolume = useCallback((volume: number) => {
    dispatch({ type: 'SET_MASTER_VOLUME', volume })
  }, [])

  const setMasterMute = useCallback((mute: boolean) => {
    dispatch({ type: 'SET_MASTER_MUTE', mute })
  }, [])

  const setSelectedClips = useCallback((clipIds: string[]) => {
    dispatch({ type: 'SET_SELECTED_CLIPS', clipIds })
  }, [])

  const addToSelection = useCallback((clipId: string) => {
    dispatch({ type: 'ADD_TO_SELECTION', clipId })
  }, [])

  const removeFromSelection = useCallback((clipId: string) => {
    dispatch({ type: 'REMOVE_FROM_SELECTION', clipId })
  }, [])

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' })
  }, [])

  const batchUpdateClips = useCallback((clipIds: string[], updates: Partial<Clip>) => {
    dispatch({ type: 'BATCH_UPDATE_CLIPS', clipIds, updates })
  }, [])

  const batchUpdateAudioClips = useCallback((clipIds: string[], updates: Partial<AudioClip>) => {
    dispatch({ type: 'BATCH_UPDATE_AUDIO_CLIPS', clipIds, updates })
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
        addAudioClip,
        removeAudioClip,
        updateAudioClip,
        splitAudioClip,
        duplicateAudioClip,
        normalizeAudioClip,
        setCrossfadeAudioClip,
        setAudioEffects,
        addVolumeKeyframe,
        removeVolumeKeyframe,
        updateVolumeKeyframe,
        setAudioSyncOffset,
        updateAudioTrack,
        setMasterVolume,
        setMasterMute,
        setSelectedClips,
        addToSelection,
        removeFromSelection,
        clearSelection,
        batchUpdateClips,
        batchUpdateAudioClips,
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
