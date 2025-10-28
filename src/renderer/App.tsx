import React from 'react'
import Header from './components/Header'
import Timeline from './components/Timeline'
import Preview from './components/Preview'
import MediaLibrary from './components/MediaLibrary'
import RecordingPanel from './components/RecordingPanel'
import RightSidebar from './components/RightSidebar'
import { ProjectProvider } from './context/ProjectContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function AppContent() {
  return (
    <div className="h-screen flex flex-col bg-dark text-white">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Recording + Media Library */}
        <div className="w-64 border-r border-gray-800 bg-dark-secondary flex flex-col">
          <RecordingPanel />
          <div className="flex-1 overflow-hidden">
            <MediaLibrary />
          </div>
        </div>

        {/* Center - Preview (reduced size) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Preview />
        </div>

        {/* Right Sidebar - Controls & Clip Properties (wider) */}
        <div className="w-80">
          <RightSidebar />
        </div>
      </div>

      {/* Bottom - Timeline */}
      <div className="h-80 border-t border-gray-800 bg-dark-secondary">
        <Timeline />
      </div>
    </div>
  )
}

const AppInner: React.FC = () => {
  useKeyboardShortcuts()
  return <AppContent />
}

const App: React.FC = () => {
  return (
    <ProjectProvider>
      <AppInner />
    </ProjectProvider>
  )
}

export default App
