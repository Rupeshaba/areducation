import { useState } from 'react'
import api from '../../api/axios'

export default function SignupDebug() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  const addLog = (message, type = 'info') => {
    console.log(`[${type.toUpperCase()}]`, message)
    setLogs(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }])
  }

  const testBackendConnection = async () => {
    setLoading(true)
    setLogs([])
    addLog('Testing backend connection...')

    try {
      addLog('Testing auth routes...')
      const testRes = await api.get('/auth/test')
      addLog('✅ Backend is reachable: ' + JSON.stringify(testRes.data), 'success')
    } catch (err) {
      addLog('❌ Backend error: ' + (err.response?.status || 'No response'), 'error')
      addLog('Error: ' + (err.message || 'Unknown error'), 'error')
    }
    setLoading(false)
  }

  const testSignup = async () => {
    setLoading(true)
    setLogs([])
    addLog('Starting signup test...')

    try {
      const testData = {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        mobile: '9876543210',
        password: 'TestPassword123',
        exam: 'UPSC',
        address: 'Test City'
      }

      addLog('Sending signup request: ' + JSON.stringify(testData))
      const res = await api.post('/auth/signup', testData)
      addLog('✅ Signup successful: ' + JSON.stringify(res.data), 'success')
    } catch (err) {
      addLog('❌ Signup failed with status ' + (err.response?.status || 'No response'), 'error')
      addLog('Error message: ' + (err.message || 'Unknown'), 'error')
      if (err.response?.data) {
        addLog('Response: ' + JSON.stringify(err.response.data), 'error')
      }
      if (err.request && !err.response) {
        addLog('No response received - backend might not be running', 'error')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen p-6 bg-dark-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Signup Debug Panel</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={testBackendConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Backend Connection'}
          </button>
          <button
            onClick={testSignup}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Signup'}
          </button>
        </div>

        <div className="bg-dark-800 border border-white/10 rounded-lg p-4">
          <h2 className="text-white font-bold mb-4">Logs:</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">Click a button to start testing...</p>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'success' ? 'text-green-400' : ''}
                    ${log.type === 'info' ? 'text-gray-300' : ''}
                  `}
                >
                  <span className="text-gray-600">[{log.time}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <p className="text-yellow-300 text-sm">
            💡 <strong>Debug Instructions:</strong><br/>
            1. Check if backend is running on localhost:5000<br/>
            2. Click "Test Backend Connection" to verify it's reachable<br/>
            3. Click "Test Signup" to test the signup flow<br/>
            4. Check browser console (F12) for detailed errors
          </p>
        </div>
      </div>
    </div>
  )
}
