import { useState } from 'react'
import toast from 'react-hot-toast'
import { Save, Key, Shield, Bell } from 'lucide-react'
import Card from '../../components/licenses/Card'

export default function Settings() {
  const [settings, setSettings] = useState({
    apiEndpoint: 'https://license-apiService.recruitiq.com',
    adminPanelUrl: 'https://admin.recruitiq.com',
    requireApiKey: true,
    expiryAlerts: true,
    usageLimitAlerts: true,
    newCustomerAlerts: true,
    notificationEmail: 'admin@recruitiq.com',
    expiryGracePeriod: 15,
    paymentGracePeriod: 7
  })

  const handleSave = () => {
    // TODO: Implement settings save API endpoint
    console.log('Saving settings:', settings)
    toast.success('Settings saved successfully!')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure license manager settings</p>
      </div>

      {/* License Keys */}
      <Card title="License Signing Keys" actions={
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Regenerate Keys
        </button>
      }>
        <div className="space-y-4">
          <div>
            <label className="label flex items-center">
              <Key className="w-4 h-4 mr-2" />
              Public Key
            </label>
            <textarea
              className="input font-mono text-xs"
              rows="4"
              readOnly
              value="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"
            />
            <p className="text-xs text-gray-500 mt-1">Embed this key in RecruitIQ app for .lic file validation</p>
          </div>

          <div>
            <label className="label flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Private Key Location
            </label>
            <input
              type="text"
              className="input font-mono text-xs"
              readOnly
              value="/license-manager/backend/keys/private.key"
            />
            <p className="text-xs text-danger-600 mt-1">⚠️ Keep this file secure! Never share or expose the private key.</p>
          </div>
        </div>
      </Card>

      {/* License Manager API */}
      <Card title="License Manager API">
        <div className="space-y-4">
          <div>
            <label className="label">API Endpoint</label>
            <input
              type="text"
              className="input"
              value={settings.apiEndpoint}
              onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">Base URL for license validation and telemetry</p>
          </div>

          <div>
            <label className="label">Admin Panel URL</label>
            <input
              type="text"
              className="input"
              value={settings.adminPanelUrl}
              onChange={(e) => setSettings({ ...settings, adminPanelUrl: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="require-api-key" 
              className="rounded" 
              checked={settings.requireApiKey}
              onChange={(e) => setSettings({ ...settings, requireApiKey: e.target.checked })}
            />
            <label htmlFor="require-api-key" className="text-sm text-gray-700">
              Require API key for telemetry endpoints
            </label>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notifications">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">License Expiry Alerts</p>
                <p className="text-xs text-gray-500">Get notified when licenses are about to expire</p>
              </div>
            </div>
            <input 
              type="checkbox" 
              className="rounded" 
              checked={settings.expiryAlerts}
              onChange={(e) => setSettings({ ...settings, expiryAlerts: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Usage Limit Alerts</p>
                <p className="text-xs text-gray-500">Get notified when customers approach usage limits</p>
              </div>
            </div>
            <input 
              type="checkbox" 
              className="rounded" 
              checked={settings.usageLimitAlerts}
              onChange={(e) => setSettings({ ...settings, usageLimitAlerts: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">New Customer Alerts</p>
                <p className="text-xs text-gray-500">Get notified when new licenses are created</p>
              </div>
            </div>
            <input 
              type="checkbox" 
              className="rounded" 
              checked={settings.newCustomerAlerts}
              onChange={(e) => setSettings({ ...settings, newCustomerAlerts: e.target.checked })}
            />
          </div>

          <div>
            <label className="label">Notification Email</label>
            <input
              type="email"
              className="input"
              value={settings.notificationEmail}
              onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Grace Periods */}
      <Card title="Grace Periods">
        <div className="space-y-4">
          <div>
            <label className="label">License Expiry Grace Period (days)</label>
            <input
              type="number"
              className="input"
              value={settings.expiryGracePeriod}
              onChange={(e) => setSettings({ ...settings, expiryGracePeriod: parseInt(e.target.value) })}
            />
            <p className="text-xs text-gray-500 mt-1">How long customers can continue using after license expires</p>
          </div>

          <div>
            <label className="label">Payment Failure Grace Period (days)</label>
            <input
              type="number"
              className="input"
              value={settings.paymentGracePeriod}
              onChange={(e) => setSettings({ ...settings, paymentGracePeriod: parseInt(e.target.value) })}
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end">
        <button 
          onClick={handleSave}
          className="btn btn-primary flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </button>
      </div>
    </div>
  )
}
