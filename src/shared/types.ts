// Global type definitions

declare global {
  interface Window {
    electron?: {
      ipc: {
        invoke: (channel: string, ...args: any[]) => Promise<any>
        on: (channel: string, callback: (...args: any[]) => void) => () => void
      }
    }
  }
}

export {}
