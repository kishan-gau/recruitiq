import { useState, useEffect } from 'react'
import { X, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { portalService } from '../../services'
import { toast } from 'react-hot-toast'

export default function TierHistoryModal({ tier, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [tier])

  const loadHistory = async () => {
    try {
      const response = await portalService.getTierHistory(tier.tier_name)
      setHistory(response.history || [])
    } catch (error) {
      console.error('Failed to load history:', error)
      toast.error('Failed to load tier history')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatLimit = (limit) => {
    if (limit === null || limit === undefined) return 'Unlimited'
    return limit.toLocaleString()
  }

  const getLimitChange = (currentVersion, previousVersion, field) => {
    if (!previousVersion) return null

    const curr = currentVersion[field]
    const prev = previousVersion[field]

    if (curr === prev) return null
    if (curr === null) return { type: 'upgrade', text: '→ Unlimited' }
    if (prev === null) return { type: 'downgrade', text: `← ${formatLimit(curr)}` }
    if (curr > prev) return { type: 'upgrade', text: `+${curr - prev}` }
    return { type: 'downgrade', text: `-${prev - curr}` }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 capitalize">
              {tier.tier_name} Tier - Version History
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {history.length} version{history.length !== 1 ? 's' : ''} • Current: v{tier.version}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-gray-500">Loading history...</div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No version history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((version, idx) => {
                const previousVersion = history[idx + 1]
                const isActive = version.is_active

                return (
                  <div
                    key={version.id}
                    className={`border rounded-lg p-4 ${
                      isActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Version Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            Version {version.version}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {version.description}
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <div>Created: {formatDate(version.created_at)}</div>
                        {version.created_by && (
                          <div>By: {version.created_by}</div>
                        )}
                      </div>
                    </div>

                    {/* Limits */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Users</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {formatLimit(version.max_users)}
                          </span>
                          {(() => {
                            const change = getLimitChange(version, previousVersion, 'max_users')
                            if (!change) return null
                            return (
                              <span
                                className={`text-xs flex items-center ${
                                  change.type === 'upgrade'
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {change.type === 'upgrade' ? (
                                  <TrendingUp className="w-3 h-3 mr-0.5" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 mr-0.5" />
                                )}
                                {change.text}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Workspaces</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {formatLimit(version.max_workspaces)}
                          </span>
                          {(() => {
                            const change = getLimitChange(version, previousVersion, 'max_workspaces')
                            if (!change) return null
                            return (
                              <span
                                className={`text-xs flex items-center ${
                                  change.type === 'upgrade'
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {change.type === 'upgrade' ? (
                                  <TrendingUp className="w-3 h-3 mr-0.5" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 mr-0.5" />
                                )}
                                {change.text}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Jobs</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {formatLimit(version.max_jobs)}
                          </span>
                          {(() => {
                            const change = getLimitChange(version, previousVersion, 'max_jobs')
                            if (!change) return null
                            return (
                              <span
                                className={`text-xs flex items-center ${
                                  change.type === 'upgrade'
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {change.type === 'upgrade' ? (
                                  <TrendingUp className="w-3 h-3 mr-0.5" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 mr-0.5" />
                                )}
                                {change.text}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Candidates</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {formatLimit(version.max_candidates)}
                          </span>
                          {(() => {
                            const change = getLimitChange(version, previousVersion, 'max_candidates')
                            if (!change) return null
                            return (
                              <span
                                className={`text-xs flex items-center ${
                                  change.type === 'upgrade'
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {change.type === 'upgrade' ? (
                                  <TrendingUp className="w-3 h-3 mr-0.5" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 mr-0.5" />
                                )}
                                {change.text}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    {version.features && version.features.length > 0 && (
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 mb-2">Features</div>
                        <div className="flex flex-wrap gap-1">
                          {version.features.map((feature, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                            >
                              {feature.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pricing */}
                    {(version.monthly_price_per_user || version.base_price) && (
                      <div className="pt-3 border-t border-gray-200 mt-3">
                        <div className="text-xs text-gray-500 mb-2">Pricing</div>
                        <div className="flex gap-4 text-sm">
                          {version.monthly_price_per_user && (
                            <div>
                              <span className="text-gray-600">Monthly: </span>
                              <span className="font-medium text-gray-900">
                                ${parseFloat(version.monthly_price_per_user).toFixed(2)}/user
                              </span>
                            </div>
                          )}
                          {version.annual_price_per_user && (
                            <div>
                              <span className="text-gray-600">Annual: </span>
                              <span className="font-medium text-gray-900">
                                ${parseFloat(version.annual_price_per_user).toFixed(2)}/user
                              </span>
                            </div>
                          )}
                          {version.base_price && (
                            <div>
                              <span className="text-gray-600">Base: </span>
                              <span className="font-medium text-gray-900">
                                ${parseFloat(version.base_price).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
