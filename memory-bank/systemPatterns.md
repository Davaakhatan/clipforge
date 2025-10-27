# System Patterns: ClipForge

## Architecture Overview
```
┌─────────────────────────────────────────────┐
│           Electron Main Process             │
│  ┌───────────────────────────────────────┐  │
│  │      File System Access               │  │
│  │      FFmpeg Processing                │  │
│  │      Screen Capture APIs               │  │
│  └───────────────────────────────────────┘  │
└─────────────────┬───────────────────────────┘
                  │ IPC
┌─────────────────┴───────────────────────────┐
│        Electron Renderer Process           │
│  ┌───────────────────────────────────────┐  │
│  │         React UI Layer                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────┐ │  │
│  │  │Timeline  │  │ Preview  │  │      │ │  │
│  │  │Editor    │  │ Player   │  │Tools │ │  │
│  │  └──────────┘  └──────────┘  └──────┘ │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Core Modules

### 1. Project State Management
**Pattern**: Centralized state with React Context + useReducer
**Location**: `src/state/ProjectState.tsx`
- Stores timeline composition
- Manages clip metadata
- Tracks playhead position
- Handles undo/redo

### 2. Media Processing
**Pattern**: Service layer for FFmpeg operations
**Location**: `src/services/FFmpegService.ts`
- Import video files
- Extract thumbnails
- Trim and split clips
- Export final composition
- Progress callbacks via events

### 3. Timeline Rendering
**Pattern**: Virtualized canvas rendering
**Location**: `src/components/Timeline/TimelineCanvas.tsx`
- Render only visible region
- Handle zoom/pan
- Clip drag and drop
- Playhead synchronization

### 4. Recording Pipeline
**Pattern**: MediaStream API + canvas recording
**Location**: `src/services/RecorderService.ts`
- Screen capture via desktopCapturer
- Webcam capture via getUserMedia
- Combine streams on canvas
- Record to MediaRecorder
- Save to timeline

### 5. Preview Synchronization
**Pattern**: Event-driven updates
**Location**: `src/components/Preview/VideoPlayer.tsx`
- Listen to playhead changes
- Seek to frame
- Play/pause synchronization
- Audio sync handling

## Data Flow Patterns

### Import Flow
1. User drags file → `FileDrop` component
2. Main process validates file
3. FFmpeg extracts metadata (duration, resolution)
4. Generate thumbnails at intervals
5. Add clip to project state
6. Update timeline

### Editing Flow
1. User interacts with timeline → Update project state
2. State change triggers preview update
3. Preview renders current frame
4. Timeline re-renders with new clip positions

### Export Flow
1. User clicks export → Collect all clips
2. Build FFmpeg command sequence
3. Show progress dialog
4. Stream progress updates via IPC
5. Save final file to disk

## Key Design Decisions

### Why Electron?
- Mature screen capture APIs
- Better file system access
- Proven video editing apps (OBS, Discord)
- TypeScript support throughout

### Why React?
- Component-based architecture for UI
- Rich state management options
- Strong ecosystem
- Fast development iteration

### Why FFmpeg?
- Industry standard for video processing
- Cross-platform
- Powerful and flexible
- Well-documented

### State Management Pattern
**Chosen**: Context + useReducer
**Reason**: Simpler than Redux for MVP, easier debugging
**Alternative**: Zustand or Jotai for more complex scenarios

### Timeline Rendering Strategy
**Chosen**: Canvas-based rendering
**Reason**: Performance with many clips, smooth scrolling
**Alternative**: DOM-based (easier but slower)

## IPC Communication Patterns
```
Renderer → Main: ipcRenderer.invoke('action', data)
Main → Renderer: webContents.send('event', data)
Renderer Listener: ipcRenderer.on('event', callback)
```

Example:
```typescript
// In renderer
await window.electron.ipc.invoke('importVideo', { filePath })

// In main
ipcMain.handle('importVideo', async (event, { filePath }) => {
  // Process file
  event.sender.send('importProgress', { progress: 0.5 })
})
```

## Error Handling Strategy
- **UI Errors**: Show toast notifications
- **Processing Errors**: Show modal with details
- **Fatal Errors**: Log to file, allow restart
- **Network Errors**: Retry with exponential backoff

## Performance Optimization Patterns

### Lazy Loading
- Load media thumbnails on demand
- Generate preview frames only when needed
- Lazy load heavy UI components

### Memoization
- Memoize expensive render calculations
- Cache FFmpeg operations
- Debounce timeline updates

### Virtualization
- Render only visible timeline region
- Limit preview resolution
- Stream large files
