console.log('SIMPLE PRELOAD SCRIPT LOADED!')

// Simple test to see if this works
try {
  const { contextBridge, ipcRenderer } = require('electron')
  console.log('Electron modules loaded successfully')
  
  if (contextBridge && ipcRenderer) {
    contextBridge.exposeInMainWorld('electronAPI', {
      test: () => 'Hello from simple preload!',
      checkAIConfiguration: () => ipcRenderer.invoke('checkAIConfiguration'),
      setAIApiKey: (apiKey) => ipcRenderer.invoke('setAIApiKey', apiKey),
      testAIConnection: () => ipcRenderer.invoke('testAIConnection'),
    })
    console.log('Simple electronAPI exposed successfully!')
  } else {
    console.log('Electron modules not available')
  }
} catch (error) {
  console.log('Error in simple preload:', error)
}
