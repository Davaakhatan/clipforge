# Project Brief: ClipForge

## Overview
Build a production-grade desktop video editor in 72 hours that enables creators to record, import, arrange, and export videos—all in one native application.

## Mission
Create a desktop video editor that mimics CapCut's simplicity but targets desktop workflows. Users can record their screen, import clips, arrange them on a timeline, and export professional-looking videos without leaving the app.

## Success Criteria
### MVP (Tuesday, October 28th 10:59 PM CT)
- Desktop app launches (Electron/Tauri)
- Import videos (drag & drop/file picker)
- Timeline view showing clips
- Preview player
- Trim functionality
- Export to MP4
- Packaged as native app

### Full Submission (Wednesday, October 29th 10:59 PM CT)
- All MVP features
- Screen recording
- Webcam recording
- Multi-track timeline
- Split, delete, and arrange clips
- Professional export with options

## Constraints
- **Timeline**: 72 hours (3 days)
- **Deadline**: Wednesday, October 29th 10:59 PM CT
- **Target Platform**: macOS (Apple MacBook Pro)
- **Performance**: Must handle 10+ clips smoothly
- **Package Size**: Keep bundle reasonable

## Why This Matters
Video editing is complex. Building a desktop editor teaches:
- Media stream handling
- Performance-optimized timeline UIs
- Desktop app development
- Real-time preview pipelines
- Video encoding and export

## Core User Workflow
1. Record or import video content
2. Arrange clips on timeline
3. Trim and adjust clips
4. Preview composition
5. Export final video

## Technical Vision
A native desktop application using:
- Electron (desktop framework)
- React (frontend)
- FFmpeg (video processing)
- HTML5 Canvas or DOM (timeline UI)
- Native recording APIs

## Key Principles
- **Ship over perfection**: A working simple editor beats a broken complex one
- **Core loop first**: Record → Import → Arrange → Export
- **Performance matters**: Timeline must be responsive
- **Desktop native**: Not just a web app in a box
