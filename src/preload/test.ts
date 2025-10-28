console.log('TEST PRELOAD SCRIPT LOADED!')
console.log('This is a simple test to verify preload script loading works')

// Try to expose something simple
try {
  const { contextBridge } = require('electron')
  console.log('contextBridge available:', typeof contextBridge)
  
  if (contextBridge) {
    contextBridge.exposeInMainWorld('testAPI', {
      test: () => 'Hello from test preload!'
    })
    console.log('Test API exposed successfully!')
  } else {
    console.log('contextBridge not available')
  }
} catch (error) {
  console.log('Error in test preload:', error)
}
