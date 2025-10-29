# ClipForge - Desktop Video Editor

A professional desktop video editor built with Electron, React, and FFmpeg. Import videos, edit on a timeline, trim, split, and export to MP4.

## 🎯 Project Overview

ClipForge is a professional desktop video editor inspired by CapCut, built for the Gauntlet AI cohort challenge. It features industry-standard video and audio editing capabilities:

### 🎬 Core Video Features
- ✅ **Video Import** - Drag & drop or file picker (MP4, MOV, WebM)
- ✅ **CapCut-style Timeline** - Interactive timeline with adaptive zoom
- ✅ **Clip Trimming** - Drag white bars to trim in/out points
- ✅ **Clip Splitting** - Press `S` to split at playhead
- ✅ **Clip Duplication** - Ctrl/Cmd+D to duplicate clips
- ✅ **Undo/Redo** - Cmd+Z / Cmd+Shift+Z
- ✅ **Video Preview** - Playback with play/pause controls
- ✅ **Screen Recording** - Record screen with audio, auto-minimize to dock
- ✅ **Webcam Recording** - Record webcam with microphone
- ✅ **Export to MP4** - Export your timeline composition
- ✅ **Keyboard Shortcuts** - Space (play/pause), Arrows (seek), S (split), Del (delete)

### 🎵 Advanced Audio Features
- ✅ **Multi-track Audio** - Separate audio tracks with independent controls
- ✅ **Audio Waveform** - Visual waveform representation for audio clips
- ✅ **Audio Effects** - Reverb, Echo, Distortion, EQ processing
- ✅ **Volume Automation** - Keyframes and curve editing for dynamic volume
- ✅ **Audio Crossfade** - Smooth transitions between overlapping clips
- ✅ **Audio Normalization** - Consistent volume levels across clips
- ✅ **Audio Sync Tools** - Manual offset adjustment for lip-sync
- ✅ **Multi-track Mixing** - Track-level volume, pan, mute, solo controls
- ✅ **Master Controls** - Global volume and mute for entire project

### 🎯 Professional Tools
- ✅ **Batch Operations** - Apply effects to multiple clips simultaneously
- ✅ **Multi-select** - Ctrl/Cmd+click to select multiple clips
- ✅ **Timeline Navigation** - Frame-perfect navigation and zoom presets
- ✅ **Mini Timeline** - Overview of entire project with viewport indicator
- ✅ **Text Overlays** - Add customizable text with drag-to-position
- ✅ **Video Effects** - Brightness, contrast, saturation adjustments
- ✅ **Transitions** - Fade, slide, zoom, blur effects between clips
- ✅ **Speed Control** - Variable playback speed (0.25x to 4x)
- ✅ **AI-Powered Tools** - Smart video enhancement with OpenAI integration
  - Auto Captions generation
  - Content analysis and scene detection
  - AI color correction suggestions
  - Audio cleanup and enhancement
  - Workflow automation
  - Export settings optimization
- ✅ **Smart Video Selection** - Choose from media library or upload new videos for AI processing

## 🆕 Latest Updates

### Enter AI-Powered Tools with Smart Video Selection
- **Intelligent Video Selection**: When using AI tools, choose from existing media library videos or upload new ones
- **Media Library Integration**: AI tools automatically detect videos in your library and offer quick selection
- **Auto Captions**: Generate subtitles automatically using OpenAI Whisper
- **Smart Analysis**: AI-powered content analysis and scene detection
- **Color Correction**: AI-suggested color enhancements based on video content
- **Audio Enhancement**: Professional audio cleanup with noise reduction and normalization
- **Workflow Automation**: AI-driven editing workflow suggestions
- **Export Optimization**: AI-recommended export settings for best quality and file size

### Professional Audio Editing Suite
- **Multi-track Audio System**: Complete audio editing with separate tracks
- **Advanced Audio Effects**: Professional-grade reverb, echo, distortion, and EQ
- **Volume Automation**: Keyframe-based volume curves for dynamic audio
- **Audio Crossfade**: Smooth transitions between overlapping audio clips
- **Audio Normalization**: Automatic volume leveling across all clips
- **Lip-sync Tools**: Manual offset adjustment for perfect audio-video sync

### Enhanced Timeline & Navigation
- **Professional Timeline**: Frame-perfect navigation with zoom presets
- **Mini Timeline Overview**: Bird's-eye view of entire project
- **Batch Operations**: Multi-select and apply effects to multiple clips
- **Enhanced Visual Feedback**: Color-coded selection states and professional styling

### Industry-Standard Features
- **Master Audio Controls**: Global volume and mute for entire project
- **Track-level Mixing**: Individual volume, pan, mute, and solo per track
- **Professional UI/UX**: Optimized layout with better space utilization
- **Advanced Keyboard Shortcuts**: Comprehensive hotkey support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- FFmpeg installed (`brew install ffmpeg`)
- macOS (for .app package)

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Build

```bash
# Build for production
npm run build

# Package as macOS .app
npm run package
```

The packaged app will be in `dist/` directory:
- `ClipForge.app` - macOS application (x64 & ARM64)
- `ClipForge-1.0.0.dmg` - Installer for Intel Macs
- `ClipForge-1.0.0-arm64.dmg` - Installer for Apple Silicon

## 📖 Usage Guide

### Import Videos
1. Click "Import Video" or drag & drop video files
2. Videos appear in Media Library with thumbnails
3. Clips automatically appear on Timeline Track 1

### Edit Timeline
- **Trim**: Select a clip, drag the white bars at the edges
- **Split**: Position playhead and press `S`
- **Move**: Drag clips to reposition
- **Delete**: Select clip and press `Del` or click × button

### Playback
- **Play/Pause**: Space bar or click play button
- **Seek**: Left/Right arrows (1 second), or drag the red playhead
- **Jump**: Click anywhere on timeline

### Zoom
- **Mouse wheel**: Ctrl+wheel to zoom in/out
- **Buttons**: +/- buttons in timeline header
- **Adaptive**: Timeline auto-fits to viewport

### Recording
1. Click "Screen", "Webcam", or "Screen + Webcam" button
2. **Screen recording**: Select screen or window from picker
3. **Audio**: Toggle "Record Audio" checkbox for microphone
4. Click "Stop Recording" when done
5. Recording automatically appears in timeline

**Note**: App automatically minimizes to dock during screen recording to avoid capturing itself.

### Export
1. Click "Export Video" in header
2. Choose save location
3. Wait for export to complete
4. Your video is ready!

### AI-Powered Tools
1. Click "AI Tools" button in header
2. Select an AI feature (Captions, Analysis, Color Correction,,..., etc.)
3. If you have videos in your media library:
   - A dialog appears showing available videos
   - Choose a video from your library OR click "Upload New Video"
4. If no videos in library, file picker opens directly
5. AI processes your video and displays results
6. Apply suggestions or use generated content in your project

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `Left/Right` | Seek 1 second |
| `Home` | Go to start |
| `S` | Split clip at playhead |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Delete` | Delete selected clip |

## 🏗️ Architecture

```
src/
├── main/           # Electron main process
│   ├── index.ts    # Window management, IPC handlers
│   └── services/
│       └── FFmpegService.ts  # Video processing
├── renderer/       # React UI
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── MediaLibrary.tsx
│   │   ├── VideoPreview.tsx
│   │   └── Timeline.tsx
│   ├── context/
│   │   └── ProjectContext.tsx  # State management
│   └── hooks/
│       └── useKeyboardShortcuts.ts
└── shared/         # Shared types
    └── types.ts
```

## 📦 Features Status

### ✅ MVP Requirements (Complete)
- [x] Desktop app that launches
- [x] Video import (drag & drop + file picker)
- [x] Timeline view with clips
- [x] Video preview player
- [x] Trim functionality
- [x] Export to MP4
- [x] Packaged as native app

### ✅ Core Features (Complete)
- [x] CapCut-style timeline design
- [x] Adaptive zoom
- [x] Drag clips on timeline
- [x] Trim clips (in/out points)
- [x] Split clips
- [x] Undo/redo system
- [x] Keyboard shortcuts
- [x] Multi-track timeline (2 tracks)

### ✅ Recording Features (Complete)
- [x] Screen recording with source selection
- [x] Webcam recording
- [x] Picture-in-picture recording mode
- [x] Microphone audio capture
- [x] Auto-minimize during recording
- [x] Recording duration tracking

### ⏳ Future Enhancements
- [ ] Advanced audio controls
- [ ] Transitions & effects
- [ ] Multiple audio tracks
- [ ] Video filters

## 🎨 UI/UX Highlights

- **CapCut-inspired Design**: Clean, modern interface
- **Thumbnail Previews**: Video clips show actual thumbnails
- **Smart Zoom**: Timeline scales intelligently to avoid label overlap
- **Visual Feedback**: Trim handles, selection rings, hover effects
- **Professional Controls**: Large buttons, clear typography, smooth animations

## 🛠️ Technical Stack

- **Desktop**: Electron 29
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Video Processing**: FFmpeg (fluent-ffmpeg)
- **Build**: electron-vite, electron-builder
- **State**: React Context + useReducer

## 📝 Development Notes

### Duration Format
- **Timeline**: Milliseconds (precise editing)
- **Video Element**: Seconds (native HTML5)

### Video Sync
Videos sync with timeline playhead position, allowing precise scrubbing and playback.

### Export Pipeline
1. Trim each clip to selected in/out points
2. Concatenate clips in sequence
3. Render to MP4 with FFmpeg

## 🎯 Performance Targets

- ✅ Timeline remains responsive with 10+ clips
- ✅ Preview playback at 30+ fps
- ✅ Export completes without crashes
- ✅ App launch under 5 seconds
- ✅ No memory leaks during extended editing

## 📄 License

MIT

## 👥 Contributors

ClipForge Team - Gauntlet AI Cohort 2024

---

**Note**: FFmpeg must be installed for video processing to work. On macOS, install via `brew install ffmpeg`.
