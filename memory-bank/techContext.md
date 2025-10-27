# Technical Context: ClipForge

## Technology Stack

### Desktop Framework
**Electron** (v29+)
- Cross-platform desktop apps
- Web technologies (HTML, CSS, JS)
- Native Node.js APIs
- Mature screen capture capabilities

**Why Electron over Tauri?**
- Faster MVP development
- More documentation for video apps
- Better screen capture APIs
- Easier FFmpeg integration

### Frontend Framework
**React** (v18+)
- Component-based architecture
- Fast UI updates
- Rich ecosystem
- Easy state management

**Build Tool**: **Vite** (fast dev server, instant HMR)

### Video Processing
**FFmpeg** (via fluent-ffmpeg)
- Video encoding/decoding
- Clip trimming
- Resolution conversion
- Format conversion

### UI Libraries
- **Tailwind CSS**: Rapid styling
- **Radix UI**: Accessible components
- **React DnD**: Drag and drop
- **Zustand**: State management (if needed)

### Development Tools
- **TypeScript**: Type safety
- **ESLint**: Code quality
- **Prettier**: Code formatting
- **Electron Forge**: App packaging

## Development Setup

### Prerequisites
```bash
Node.js v18+
FFmpeg installed on system
Git
```

### Project Structure
```
clipforge/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Main entry point
│   │   ├── ffmpeg.ts      # FFmpeg wrapper
│   │   └── ipc.ts         # IPC handlers
│   ├── renderer/          # React app
│   │   ├── components/
│   │   │   ├── Timeline/
│   │   │   ├── Preview/
│   │   │   └── Import/
│   │   ├── services/
│   │   ├── state/
│   │   └── App.tsx
│   └── shared/             # Shared types
├── public/
├── package.json
└── tsconfig.json
```

### Dependencies
```json
{
  "dependencies": {
    "electron": "^29.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "fluent-ffmpeg": "^2.1.2",
    "@radix-ui/react-dialog": "^1.0.0",
    "zustand": "^4.5.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "electron-forge": "^7.0.0",
    "eslint": "^8.0.0"
  }
}
```

## Technical Constraints

### macOS Specific
- Screen capture requires screen recording permission
- File system access needs user grants
- FFmpeg must be bundled or user-installed
- Audio capture needs microphone permission

### Performance Targets
- **Timeline FPS**: 60fps scrolling
- **Preview FPS**: 30fps playback
- **Export Time**: < 2x video duration
- **Memory**: < 2GB for 10 clips

### File Size Limits
- **Max Project Size**: 1GB
- **Max Clip Duration**: 10 minutes (MVP)
- **Export Resolution**: Up to 1080p

## Build & Distribution

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run package
```

### Output
- `.app` bundle for macOS
- Code signing (if configured)
- Auto-updater support (future)

## FFmpeg Commands Reference

### Extract Thumbnail
```bash
ffmpeg -i input.mp4 -ss 00:00:01 -vframes 1 output.jpg
```

### Trim Clip
```bash
ffmpeg -i input.mp4 -ss 00:00:10 -t 00:00:30 output.mp4
```

### Concatenate Clips
```bash
ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4
```

### Export with Resolution
```bash
ffmpeg -i input.mp4 -vf scale=1920:1080 output.mp4
```

## Development Workflow

### Hot Reload
- React components reload via Vite
- Electron main process restarts on save
- IPC channels reconnect automatically

### Debugging
- **Renderer**: Chrome DevTools
- **Main**: VS Code debugger
- **FFmpeg**: Log all commands

### Testing Strategy
- Manual testing for MVP
- Test with various video formats
- Test with long recordings
- Test export quality

## Environment Variables
```env
NODE_ENV=development
ELECTRON_IS_DEV=1
FFMPEG_PATH=/usr/local/bin/ffmpeg
```

## Known Technical Challenges

### Challenge 1: Screen Capture Permissions
**Solution**: Check permissions, show instructions if denied

### Challenge 2: FFmpeg Path
**Solution**: Bundle FFmpeg or detect system install

### Challenge 3: Large File Handling
**Solution**: Stream processing, avoid loading entire file

### Challenge 4: Timeline Performance
**Solution**: Virtualization, debouncing, memoization

### Challenge 5: Audio Sync
**Solution**: Precise timestamp tracking, adjust on each seek
