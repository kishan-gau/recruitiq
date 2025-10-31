import { useState } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'

export default function CreateTierVersionModal({ onClose, onSave, existingTiers }) {
  const [formData, setFormData] = useState({
    tierName: 'starter',
    maxUsers: '',
    maxWorkspaces: '',
    maxJobs: '',
    maxCandidates: '',
    features: '',
    monthlyPricePerUser: '',
    annualPricePerUser: '',
    basePrice: '',
    description: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
  })
  const [autoMigrate, setAutoMigrate] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value, type } = e.target
    
    // Convert empty strings to null for limit fields
    if (['maxUsers', 'maxWorkspaces', 'maxJobs', 'maxCandidates'].includes(name)) {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : parseInt(value)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Parse features
      const featuresArray = formData.features
        ? formData.features.split(',').map(f => f.trim()).filter(Boolean)
        : []

      const tierData = {
        tierName: formData.tierName,
        maxUsers: formData.maxUsers === '' ? null : parseInt(formData.maxUsers),
        maxWorkspaces: formData.maxWorkspaces === '' ? null : parseInt(formData.maxWorkspaces),
        maxJobs: formData.maxJobs === '' ? null : parseInt(formData.maxJobs),
        maxCandidates: formData.maxCandidates === '' ? null : parseInt(formData.maxCandidates),
        features: featuresArray,
        monthlyPricePerUser: formData.monthlyPricePerUser ? parseFloat(formData.monthlyPricePerUser) : null,
        annualPricePerUser: formData.annualPricePerUser ? parseFloat(formData.annualPricePerUser) : null,
        basePrice: formData.basePrice ? parseFloat(formData.basePrice) : null,
        description: formData.description,
        effectiveFrom: formData.effectiveFrom,
      }

      await onSave(tierData, autoMigrate)
    } catch (error) {
      console.error('Error saving tier:', error)
    } finally {
      setSaving(false)
    }
  }

  const currentTier = existingTiers.find(t => t.tier_name === formData.tierName)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create New Tier Version</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tier Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tier Name *
            </label>
            <select
              name="tierName"
              value={formData.tierName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
              <option value="custom">Custom</option>
            </select>
            {currentTier && (
              <p className="mt-1 text-xs text-gray-500">
                Current version: v{currentTier.version} • Creating v{currentTier.version + 1}
              </p>
            )}
          </div>

          {/* Limits */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Usage Limits</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Users
                </label>
                <input
                  type="number"
                  name="maxUsers"
                  value={formData.maxUsers}
                  onChange={handleChange}
                  placeholder="Leave empty for unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Workspaces
                </label>
                <input
                  type="number"
                  name="maxWorkspaces"
                  value={formData.maxWorkspaces}
                  onChange={handleChange}
                  placeholder="Leave empty for unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Jobs
                </label>
                <input
                  type="number"
                  name="maxJobs"
                  value={formData.maxJobs}
                  onChange={handleChange}
                  placeholder="Leave empty for unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Candidates
                </label>
                <input
                  type="number"
                  name="maxCandidates"
                  value={formData.maxCandidates}
                  onChange={handleChange}
                  placeholder="Leave empty for unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              💡 Tip: Leave fields empty or set to 0 for unlimited
            </p>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Pricing</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Price/User
                </label>
                <input
                  type="number"
                  name="monthlyPricePerUser"
                  value={formData.monthlyPricePerUser}
                  onChange={handleChange}
                  placeholder="49.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Price/User
                </label>
                <input
                  type="number"
                  name="annualPricePerUser"
                  value={formData.annualPricePerUser}
                  onChange={handleChange}
                  placeholder="40.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price
                </label>
                <input
                  type="number"
                  name="basePrice"
                  value={formData.basePrice}
                  onChange={handleChange}
                  placeholder="5000.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Features (comma-separated)
            </label>
            <textarea
              name="features"
              value={formData.features}
              onChange={handleChange}
              placeholder="analytics, api_access, sso, white_label"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Separate feature names with commas
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Version Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Increased user limit from 10 to 12"
              rows="2"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Effective Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Effective From
            </label>
            <input
              type="date"
              name="effectiveFrom"
              value={formData.effectiveFrom}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Auto-Migrate Option */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="autoMigrate"
                checked={autoMigrate}
                onChange={(e) => setAutoMigrate(e.target.checked)}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <label htmlFor="autoMigrate" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Automatically migrate customers with auto_upgrade=true
                </label>
                <p className="mt-1 text-xs text-gray-600">
                  If enabled, all customers who have opted in for automatic upgrades will immediately receive these new limits. Customers with auto_upgrade=false will stay on their current version.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Creating...' : 'Create Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
