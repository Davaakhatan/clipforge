import { contextBridge, ipcRenderer } from 'electron'

interface ElectronAPI {
  ipc: {
    invoke: (channel: string, ...args: any[]) => Promise<any>
    on: (channel: string, callback: (...args: any[]) => void) => () => void
  }
}

const electronAPI: ElectronAPI = {
  ipc: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.on(channel, callback)
      return () => ipcRenderer.removeListener(channel, callback)
    },
  },
}

contextBridge.exposeInMainWorld('electron', electronAPI)
