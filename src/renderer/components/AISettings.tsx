import React, { useState, useEffect } from 'react'

interface AISettingsProps {
  isOpen: boolean
  onClose: () => void
}

export const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isOpen) {
      checkAIConfiguration()
    }
  }, [isOpen])

  const checkAIConfiguration = async () => {
    try {
      if (!window.electronAPI) {
        setError('AI API not available - please restart the app')
        return
      }
      
      const response = await window.electronAPI.checkAIConfiguration()
      setIsConfigured(response.isConfigured)
    } catch (error: any) {
      console.error('Failed to check AI configuration:', error)
      setError('Failed to check AI configuration')
    }
  }

  const handleSaveAPIKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key')
      return
    }

    if (!apiKey.startsWith('sk-')) {
      setError('API key should start with "sk-"')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!window.electronAPI) {
        throw new Error('AI API not available - please restart the app')
      }

      const response = await window.electronAPI.setAIApiKey(apiKey)
      
      if (response.success) {
        setSuccess('API key saved successfully! You can now test the connection.')
        setIsConfigured(true)
        setApiKey('')
        // Refresh configuration status
        await checkAIConfiguration()
      } else {
        setError(response.error || 'Failed to save API key')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!window.electronAPI) {
        throw new Error('AI API not available - please restart the app')
      }

      const response = await window.electronAPI.testAIConnection()
      
      if (response.success) {
        setSuccess('Connection successful! AI features are ready.')
      } else {
        setError(response.error || 'Connection failed')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded p-6 w-full max-w-md mx-4 border border-gray-700/50">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-300 mb-1">AI Settings</h2>
            <p className="text-gray-500 text-xs">Configure OpenAI API integration</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors p-1.5 hover:bg-gray-800/50 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-1.5">OpenAI API Integration</h3>
            <p className="text-gray-500 text-xs mb-3">
              Enter your OpenAI API key to unlock AI-powered features like auto captions, smart editing suggestions, and content analysis.
            </p>
            
            {/* Configuration Status */}
            <div className={`p-2.5 rounded border ${
              isConfigured 
                ? 'bg-gray-800/30 border-gray-600/50' 
                : 'bg-gray-800/30 border-gray-600/50'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isConfigured ? 'bg-gray-400' : 'bg-gray-500'
                }`}></div>
                <span className="text-xs font-medium text-gray-300">
                  {isConfigured ? 'AI API Configured' : 'AI API Not Configured'}
                </span>
              </div>
              <p className="text-xs mt-1 text-gray-500">
                {isConfigured 
                  ? 'AI features are ready to use' 
                  : 'Configure your API key to enable AI features'
                }
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-2.5 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-gray-300 text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500/50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your API key is stored locally and never shared
            </p>
          </div>

          {error && (
            <div className="bg-gray-800/30 border border-gray-600/50 rounded p-2.5">
              <p className="text-gray-300 text-xs">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-gray-800/30 border border-gray-600/50 rounded p-2.5">
              <p className="text-gray-300 text-xs">{success}</p>
            </div>
          )}

          <div className="flex gap-2">
            {!isConfigured ? (
              <button
                onClick={handleSaveAPIKey}
                disabled={isLoading}
                className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/30 text-gray-300 px-3 py-1.5 rounded border border-gray-600/50 transition-colors text-xs font-medium"
              >
                {isLoading ? 'Saving...' : 'Save & Configure'}
              </button>
            ) : (
              <button
                onClick={async () => {
                  setIsLoading(true)
                  setError('')
                  setSuccess('')
                  try {
                    if (!window.electronAPI) {
                      throw new Error('AI API not available')
                    }
                    // Clear the API key by setting it to empty
                    await window.electronAPI.setAIApiKey('')
                    setIsConfigured(false)
                    setSuccess('API key cleared successfully')
                    await checkAIConfiguration()
                  } catch (error: any) {
                    setError(error.message)
                  } finally {
                    setIsLoading(false)
                  }
                }}
                disabled={isLoading}
                className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/30 text-gray-300 px-3 py-1.5 rounded border border-gray-600/50 transition-colors text-xs font-medium"
              >
                {isLoading ? 'Clearing...' : 'Clear Configuration'}
              </button>
            )}
            <button
              onClick={handleTestConnection}
              disabled={isLoading || !isConfigured}
              className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/30 text-gray-300 px-3 py-1.5 rounded border border-gray-600/50 transition-colors text-xs font-medium"
            >
              {isLoading ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 px-3 py-1.5 rounded border border-gray-700/50 transition-colors text-xs font-medium mt-2"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <h4 className="text-xs font-medium text-gray-400 mb-2">AI Features Available:</h4>
          <ul className="text-xs text-gray-500 space-y-0.5">
            <li>• Auto-generated captions from speech</li>
            <li>• Smart scene detection and cut suggestions</li>
            <li>• Intelligent text overlay generation</li>
            <li>• AI-powered color correction</li>
            <li>• Content analysis and editing suggestions</li>
            <li>• Export settings optimization</li>
          </ul>
        </div>
      </div>
    </div>
  )
}