import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { 
  PlusCircle, 
  History, 
  Users, 
  TrendingUp,
  Edit3,
  Check,
  X,
  ChevronRight,
  Info
} from 'lucide-react'
import { portalService } from '../../services'
import CreateTierVersionModal from '../../components/licenses/CreateTierVersionModal'
import TierHistoryModal from '../../components/licenses/TierHistoryModal'
import MigrationPreviewModal from '../../components/licenses/MigrationPreviewModal'

export default function Tiers() {
  const [tiers, setTiers] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [selectedTier, setSelectedTier] = useState(null)

  useEffect(() => {
    loadTiers()
    loadStats()
  }, [])

  const loadTiers = async () => {
    try {
      const response = await portalService.getTiers()
      setTiers(response.tiers || [])
    } catch (error) {
      console.error('Failed to load tiers:', error)
      toast.error('Failed to load tiers')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await portalService.getTierStats()
      setStats(response.stats || [])
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleCreateVersion = async (tierData, autoMigrate) => {
    try {
      const result = await portalService.createTierVersion(tierData, autoMigrate)
      toast.success(result.message || 'Tier version created successfully')
      setShowCreateModal(false)
      loadTiers()
      loadStats()
    } catch (error) {
      console.error('Failed to create tier version:', error)
      toast.error(error.response?.data?.error || 'Failed to create tier version')
    }
  }

  const getTierColor = (tierName) => {
    switch(tierName) {
      case 'starter': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'professional': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'enterprise': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'Custom'
    return `$${parseFloat(price).toFixed(2)}`
  }

  const formatLimit = (limit) => {
    if (limit === null || limit === undefined) return 'Unlimited'
    return limit.toLocaleString()
  }

  const getCustomerCount = (tierName, version) => {
    const stat = stats.find(s => s.tier === tierName && s.tier_version === version)
    return stat?.active_customers || 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tiers...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tier Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage subscription tiers and pricing
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Create New Version
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">About Tier Versioning</p>
          <p>When you update a tier, you create a new version. Customers with <strong>auto_upgrade=true</strong> will automatically get the new limits. Customers with <strong>auto_upgrade=false</strong> will stay on their current version (useful for grandfathered contracts).</p>
        </div>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Tier Header */}
            <div className={`px-6 py-4 border-b border-gray-200 ${getTierColor(tier.tier_name)}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold capitalize">{tier.tier_name}</h3>
                <span className="text-xs font-medium px-2 py-1 bg-white bg-opacity-50 rounded">
                  v{tier.version}
                </span>
              </div>
              <div className="mt-2 flex items-baseline">
                <span className="text-2xl font-bold">
                  {formatPrice(tier.monthly_price_per_user || tier.base_price)}
                </span>
                {tier.monthly_price_per_user && (
                  <span className="ml-2 text-sm">/user/month</span>
                )}
              </div>
            </div>

            {/* Tier Limits */}
            <div className="px-6 py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Users</span>
                <span className="font-medium text-gray-900">{formatLimit(tier.max_users)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Workspaces</span>
                <span className="font-medium text-gray-900">{formatLimit(tier.max_workspaces)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Jobs</span>
                <span className="font-medium text-gray-900">{formatLimit(tier.max_jobs)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Candidates</span>
                <span className="font-medium text-gray-900">{formatLimit(tier.max_candidates)}</span>
              </div>
            </div>

            {/* Features */}
            {tier.features && tier.features.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Features</h4>
                <div className="flex flex-wrap gap-1">
                  {tier.features.slice(0, 3).map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {feature.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {tier.features.length > 3 && (
                    <span className="text-xs text-gray-500 px-2 py-1">
                      +{tier.features.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Stats & Actions */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{getCustomerCount(tier.tier_name, tier.version)} active customers</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTier(tier)
                    setShowHistoryModal(true)
                  }}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <History className="w-4 h-4 mr-1" />
                  History
                </button>
                <button
                  onClick={() => {
                    setSelectedTier(tier)
                    setShowMigrationModal(true)
                  }}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Migrate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tiers.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Edit3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tiers Found</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first tier preset</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Create Tier
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTierVersionModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateVersion}
          existingTiers={tiers}
        />
      )}

      {showHistoryModal && selectedTier && (
        <TierHistoryModal
          tier={selectedTier}
          onClose={() => {
            setShowHistoryModal(false)
            setSelectedTier(null)
          }}
        />
      )}

      {showMigrationModal && selectedTier && (
        <MigrationPreviewModal
          tier={selectedTier}
          onClose={() => {
            setShowMigrationModal(false)
            setSelectedTier(null)
          }}
          onSuccess={() => {
            loadTiers()
            loadStats()
          }}
        />
      )}
    </div>
  )
}
