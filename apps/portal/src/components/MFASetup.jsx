import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { toast } from 'react-hot-toast'

export default function MFASetup() {
  const [mfaStatus, setMfaStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [setupStep, setSetupStep] = useState(null) // null | 'qr' | 'verify' | 'backup-codes'
  
  // Setup data
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [manualEntryKey, setManualEntryKey] = useState('')
  const [tempSecret, setTempSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  
  // Disable MFA
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableToken, setDisableToken] = useState('')
  
  // Regenerate backup codes
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [regeneratePassword, setRegeneratePassword] = useState('')
  const [regenerateToken, setRegenerateToken] = useState('')
  
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadMFAStatus()
  }, [])

  const loadMFAStatus = async () => {
    try {
      setLoading(true)
      const response = await api.getMFAStatus()
      setMfaStatus(response)
    } catch (error) {
      console.error('Failed to load MFA status:', error)
      
      // If feature not available (403), show upgrade message
      if (error.response?.status === 403) {
        toast.error('MFA is not available on your current plan')
      } else {
        toast.error('Failed to load MFA status')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStartSetup = async () => {
    try {
      setProcessing(true)
      const response = await api.setupMFA()
      
      setQrCodeUrl(response.data.qrCodeUrl)
      setManualEntryKey(response.data.manualEntryKey)
      setTempSecret(response.tempSecret)
      setSetupStep('qr')
      
      toast.success('Scan the QR code with your authenticator app')
    } catch (error) {
      console.error('Failed to setup MFA:', error)
      toast.error(error.response?.data?.message || 'Failed to setup MFA')
    } finally {
      setProcessing(false)
    }
  }

  const handleVerifySetup = async (e) => {
    e.preventDefault()
    
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code')
      return
    }

    try {
      setProcessing(true)
      const response = await api.verifyMFASetup(verificationCode, tempSecret)
      
      setBackupCodes(response.data.backupCodes)
      setSetupStep('backup-codes')
      
      toast.success('MFA enabled successfully!')
      
      // Reload status
      await loadMFAStatus()
    } catch (error) {
      console.error('Failed to verify MFA setup:', error)
      toast.error(error.response?.data?.message || 'Invalid verification code')
      setVerificationCode('')
    } finally {
      setProcessing(false)
    }
  }

  const handleFinishSetup = () => {
    setSetupStep(null)
    setQrCodeUrl('')
    setManualEntryKey('')
    setTempSecret('')
    setVerificationCode('')
    setBackupCodes([])
  }

  const handleDisableMFA = async (e) => {
    e.preventDefault()

    try {
      setProcessing(true)
      await api.disableMFA(disablePassword, disableToken)
      
      toast.success('MFA has been disabled')
      setShowDisableModal(false)
      setDisablePassword('')
      setDisableToken('')
      
      // Reload status
      await loadMFAStatus()
    } catch (error) {
      console.error('Failed to disable MFA:', error)
      
      if (error.response?.status === 403 && error.response?.data?.reason === 'mandatory_policy') {
        toast.error('MFA cannot be disabled for your organization')
      } else {
        toast.error(error.response?.data?.message || 'Failed to disable MFA')
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleRegenerateBackupCodes = async (e) => {
    e.preventDefault()

    try {
      setProcessing(true)
      const response = await api.regenerateBackupCodes(regeneratePassword, regenerateToken)
      
      setBackupCodes(response.data.backupCodes)
      setSetupStep('backup-codes')
      setShowRegenerateModal(false)
      setRegeneratePassword('')
      setRegenerateToken('')
      
      toast.success('New backup codes generated')
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error)
      toast.error(error.response?.data?.message || 'Failed to regenerate backup codes')
    } finally {
      setProcessing(false)
    }
  }

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n')
    navigator.clipboard.writeText(codesText)
    toast.success('Backup codes copied to clipboard')
  }

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n')
    const blob = new Blob([codesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recruitiq-mfa-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup codes downloaded')
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!mfaStatus) {
    return null
  }

  // QR Code Step
  if (setupStep === 'qr') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan QR Code</h3>
        
        <div className="mb-6 text-center">
          <img src={qrCodeUrl} alt="MFA QR Code" className="mx-auto w-64 h-64" />
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">Or enter this code manually:</p>
          <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
            {manualEntryKey}
          </div>
        </div>

        <button
          onClick={() => setSetupStep('verify')}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Next: Enter Verification Code
        </button>
      </div>
    )
  }

  // Verification Step
  if (setupStep === 'verify') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Verify Setup</h3>
        
        <form onSubmit={handleVerifySetup}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter 6-digit code from your authenticator app
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 border border-gray-300 rounded text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={6}
              required
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSetupStep('qr')}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={processing || verificationCode.length !== 6}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Backup Codes Step
  if (setupStep === 'backup-codes' && backupCodes.length > 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Backup Codes</h3>
        <p className="text-sm text-gray-600 mb-4">
          Save these codes in a secure location. Each code can only be used once.
        </p>

        <div className="mb-6 bg-gray-100 p-4 rounded">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((code, index) => (
              <div key={index} className="bg-white p-2 rounded text-center">
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <button
            onClick={copyBackupCodes}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
          >
            📋 Copy
          </button>
          <button
            onClick={downloadBackupCodes}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
          >
            💾 Download
          </button>
        </div>

        <button
          onClick={handleFinishSetup}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Done
        </button>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
          <p className="text-xs text-amber-800">
            ⚠️ Make sure to save these codes before closing this window. You won't be able to see them again.
          </p>
        </div>
      </div>
    )
  }

  // MFA Enabled - Management View
  if (mfaStatus.enabled) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Multi-Factor Authentication</h3>

        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2">
          <span className="text-green-600 text-xl">✓</span>
          <span className="text-sm text-green-800 font-medium">MFA is enabled</span>
        </div>

        {mfaStatus.required && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              🔒 <strong>MFA is required</strong> by your organization and cannot be disabled.
            </p>
          </div>
        )}

        <div className="mb-4 text-sm text-gray-600">
          <p><strong>Backup Codes Remaining:</strong> {mfaStatus.backupCodesRemaining}</p>
          {mfaStatus.backupCodesRemaining <= 2 && (
            <p className="text-amber-600 mt-1">
              ⚠️ You're running low on backup codes. Consider regenerating them.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setShowRegenerateModal(true)}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
          >
            🔄 Regenerate Backup Codes
          </button>

          {!mfaStatus.required && (
            <button
              onClick={() => setShowDisableModal(true)}
              className="w-full px-4 py-2 border border-red-300 text-red-700 rounded hover:bg-red-50 transition"
            >
              🔓 Disable MFA
            </button>
          )}
        </div>

        {/* Disable MFA Modal */}
        {showDisableModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Disable MFA</h4>
              
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
                <p className="text-sm text-amber-800">
                  ⚠️ Disabling MFA will make your account less secure. All sessions will be invalidated.
                </p>
              </div>

              <form onSubmit={handleDisableMFA}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    6-digit code or backup code
                  </label>
                  <input
                    type="text"
                    value={disableToken}
                    onChange={(e) => setDisableToken(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisableModal(false)
                      setDisablePassword('')
                      setDisableToken('')
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {processing ? 'Disabling...' : 'Disable MFA'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Regenerate Backup Codes Modal */}
        {showRegenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Regenerate Backup Codes</h4>
              
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  ℹ️ This will invalidate all existing backup codes and generate new ones.
                </p>
              </div>

              <form onSubmit={handleRegenerateBackupCodes}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={regeneratePassword}
                    onChange={(e) => setRegeneratePassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    6-digit code from authenticator
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={regenerateToken}
                    onChange={(e) => setRegenerateToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegenerateModal(false)
                      setRegeneratePassword('')
                      setRegenerateToken('')
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {processing ? 'Generating...' : 'Regenerate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // MFA not enabled - show enable button
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Multi-Factor Authentication (MFA)</h3>
      
      {mfaStatus.required && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
          <p className="text-sm text-amber-800 font-medium">
            🔒 <strong>MFA is required</strong> by your organization. Please enable it to secure your account.
          </p>
          {mfaStatus.gracePeriodDaysRemaining > 0 && (
            <p className="text-xs text-amber-700 mt-1">
              ⏰ You have {mfaStatus.gracePeriodDaysRemaining} day{mfaStatus.gracePeriodDaysRemaining !== 1 ? 's' : ''} remaining to enable MFA before your account is locked.
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-gray-600 mb-4">
        Add an extra layer of security to your account. You'll need your password and a code from your phone to login.
      </p>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800 font-medium mb-2">
          ✨ Benefits of MFA:
        </p>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Protects against password theft</li>
          <li>Prevents unauthorized access</li>
          <li>Industry standard security practice</li>
        </ul>
      </div>

      <button
        onClick={handleStartSetup}
        disabled={processing}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Setting up...
          </>
        ) : (
          <>
            <span>🔐</span>
            <span>Enable MFA</span>
          </>
        )}
      </button>
    </div>
  )
}
