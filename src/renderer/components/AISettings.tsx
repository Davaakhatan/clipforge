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
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">AI Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white mb-2">OpenAI API Integration</h3>
            <p className="text-gray-400 text-sm mb-4">
              Enter your OpenAI API key to unlock AI-powered features like auto captions, smart editing suggestions, and content analysis.
            </p>
            
            {/* Configuration Status */}
            <div className={`p-3 rounded-md border ${
              isConfigured 
                ? 'bg-green-900/20 border-green-500/50 text-green-400' 
                : 'bg-yellow-900/20 border-yellow-500/50 text-yellow-400'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConfigured ? 'bg-green-400' : 'bg-yellow-400'
                }`}></div>
                <span className="text-sm font-medium">
                  {isConfigured ? 'AI API Configured' : 'AI API Not Configured'}
                </span>
              </div>
              <p className="text-xs mt-1">
                {isConfigured 
                  ? 'AI features are ready to use!' 
                  : 'Configure your API key to enable AI features.'
                }
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your API key is stored locally and never shared.
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-md p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-900/20 border border-green-500/50 rounded-md p-3">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          <div className="flex gap-3">
            {!isConfigured ? (
              <button
                onClick={handleSaveAPIKey}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-4 py-2 rounded-md transition-colors"
              >
                {isLoading ? 'Saving...' : '✓ Save & Configure'}
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
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white px-4 py-2 rounded-md transition-colors"
              >
                {isLoading ? 'Clearing...' : '🗑️ Clear Configuration'}
              </button>
            )}
            <button
              onClick={handleTestConnection}
              disabled={isLoading || !isConfigured}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white px-4 py-2 rounded-md transition-colors"
            >
              {isLoading ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">AI Features Available:</h4>
          <ul className="text-xs text-gray-400 space-y-1">
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