import { useState, useEffect } from 'react'
import { X, AlertTriangle, Check, Users, TrendingUp } from 'lucide-react'
import api from '../services/api'
import { toast } from 'react-hot-toast'

export default function MigrationPreviewModal({ tier, onClose, onSuccess }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [filters, setFilters] = useState({
    status: ['active'],
    autoUpgrade: true
  })

  useEffect(() => {
    loadPreview()
  }, [tier, filters])

  const loadPreview = async () => {
    setLoading(true)
    try {
      const response = await api.previewTierMigration(tier.tier_name, filters)
      setPreview(response)
    } catch (error) {
      console.error('Failed to load preview:', error)
      toast.error('Failed to load migration preview')
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!preview || preview.customersWithChanges === 0) {
      toast.error('No customers to migrate')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to migrate ${preview.customersWithChanges} customer(s) to ${tier.tier_name} v${tier.version}?\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    setExecuting(true)
    try {
      // First create a migration record if needed
      // For now, we'll use the tier's ID as a placeholder
      // In a real implementation, you'd get the migration ID from the create version response
      toast.loading('Migration in progress...')
      
      // Execute migration with filters
      const result = await api.executeTierMigration(tier.id, filters)
      
      toast.dismiss()
      toast.success(result.message || 'Migration completed successfully')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Migration failed:', error)
      toast.dismiss()
      toast.error(error.response?.data?.error || 'Migration failed')
    } finally {
      setExecuting(false)
    }
  }

  const formatLimit = (limit) => {
    if (limit === null || limit === undefined) return 'Unlimited'
    return limit.toLocaleString()
  }

  const getChangeColor = (change) => {
    if (!change) return ''
    switch (change.change) {
      case 'increased':
      case 'unlimited':
        return 'text-green-600'
      case 'decreased':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getChangeIcon = (change) => {
    if (!change) return null
    switch (change.change) {
      case 'increased':
      case 'unlimited':
        return <TrendingUp className="w-4 h-4" />
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Migration Preview - {tier.tier_name} v{tier.version}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Preview which customers will be affected by migrating to this version
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Migration Filters</h3>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.status.includes('active')}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    status: e.target.checked ? ['active'] : []
                  }))
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Only Active Customers</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.autoUpgrade}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    autoUpgrade: e.target.checked
                  }))
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Only Auto-Upgrade Enabled</span>
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-gray-500">Loading preview...</div>
            </div>
          ) : !preview ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-gray-600">Failed to load preview</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-900 mb-1">
                    <Users className="w-5 h-5" />
                    <span className="text-sm font-medium">Total Customers</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {preview.totalCustomers}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-900 mb-1">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">Will Be Migrated</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {preview.customersWithChanges}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-900 mb-1">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm font-medium">New Version</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    v{preview.newPreset?.version}
                  </div>
                </div>
              </div>

              {/* Warning if no customers */}
              {preview.customersWithChanges === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-medium">No customers will be migrated</p>
                    <p className="mt-1">
                      Based on your selected filters, no customers are eligible for migration. 
                      Try adjusting your filters or check if customers have auto_upgrade enabled.
                    </p>
                  </div>
                </div>
              )}

              {/* Customer List */}
              {preview.customers && preview.customers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Affected Customers ({preview.customers.filter(c => c.willChange).length})
                  </h3>
                  <div className="space-y-3">
                    {preview.customers.filter(c => c.willChange).map((customer) => (
                      <div
                        key={customer.customerId}
                        className="border border-gray-200 rounded-lg p-4 bg-white"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {customer.customerName}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="capitalize">{customer.status}</span>
                              <span>•</span>
                              <span className="capitalize">
                                {customer.deploymentType.replace('-', ' ')}
                              </span>
                              <span>•</span>
                              <span>
                                v{customer.currentVersion} → v{customer.newVersion}
                              </span>
                              {customer.autoUpgrade && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600 font-medium">Auto-upgrade ✓</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Changes */}
                        {customer.changes && customer.changes.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                            {customer.changes.map((change, idx) => (
                              <div key={idx}>
                                <div className="text-xs text-gray-500 mb-1">
                                  {change.field.replace('max_', '').replace('_', ' ')}
                                </div>
                                <div className={`flex items-center gap-1 text-sm font-medium ${getChangeColor(change)}`}>
                                  {getChangeIcon(change)}
                                  <span>{formatLimit(change.from)}</span>
                                  <span className="text-gray-400">→</span>
                                  <span>{formatLimit(change.to)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExecute}
            disabled={executing || !preview || preview.customersWithChanges === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {executing ? 'Migrating...' : `Migrate ${preview?.customersWithChanges || 0} Customer(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}
