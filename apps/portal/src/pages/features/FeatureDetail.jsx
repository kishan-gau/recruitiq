import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, AlertTriangle, Users, TrendingUp, Package, CheckCircle, XCircle, Settings, BarChart3 } from 'lucide-react';
import { portalService } from '../../services';
import toast from 'react-hot-toast';

export default function FeatureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [feature, setFeature] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchFeatureData();
  }, [id]);

  async function fetchFeatureData() {
    setLoading(true);
    try {
      const [featureRes, orgsRes, analyticsRes] = await Promise.all([
        portalService.getFeature(id),
        portalService.getFeatureOrganizations(id, { limit: 100 }),
        portalService.getFeatureAnalytics(id, { 
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        }).catch(() => null) // Analytics might not be available
      ]);

      setFeature(featureRes.feature);
      setOrganizations(orgsRes.organizations || []);
      setAnalytics(analyticsRes);
    } catch (error) {
      console.error('Failed to fetch feature data:', error);
      toast.error('Failed to load feature details');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeprecate() {
    if (!confirm('Are you sure you want to deprecate this feature? Organizations will be notified.')) {
      return;
    }

    const message = prompt('Enter deprecation message (optional):');
    try {
      await portalService.deprecateFeature(id, message || 'This feature is deprecated');
      toast.success('Feature deprecated');
      fetchFeatureData();
    } catch (error) {
      toast.error('Failed to deprecate feature');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading feature details...</div>
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Feature not found</p>
        <Link to="/features" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          ← Back to Features
        </Link>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      stable: 'bg-green-100 text-green-800',
      beta: 'bg-blue-100 text-blue-800',
      alpha: 'bg-purple-100 text-purple-800',
      deprecated: 'bg-red-100 text-red-800',
      disabled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/features')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{feature.featureName}</h1>
            <p className="text-gray-600 mt-1">
              {feature.featureKey} • {feature.productName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {feature.status !== 'deprecated' && (
            <>
              <button
                onClick={handleDeprecate}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
              >
                <AlertTriangle size={16} />
                Deprecate
              </button>
              <Link
                to={`/features/${id}/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Edit size={16} />
                Edit
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Status & Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="text-blue-600" size={20} />
            <span className="text-sm text-gray-600">Status</span>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(feature.status)}`}>
            {feature.status}
          </span>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-green-600" size={20} />
            <span className="text-sm text-gray-600">Organizations</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {feature.organizationsUsing || organizations.length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-purple-600" size={20} />
            <span className="text-sm text-gray-600">Min Tier</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {feature.minTier || 'Any'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="text-amber-600" size={20} />
            <span className="text-sm text-gray-600">Type</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {feature.isAddOn ? 'Add-on' : 'Included'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['overview', 'organizations', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{feature.description || 'No description provided'}</p>
              </div>

              {/* Category */}
              {feature.category && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Category</h3>
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    {feature.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              )}

              {/* Dependencies */}
              {feature.requiredFeatures && feature.requiredFeatures.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Required Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {feature.requiredFeatures.map((dep, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Conflicts */}
              {feature.conflictingFeatures && feature.conflictingFeatures.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Conflicting Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {feature.conflictingFeatures.map((conflict, idx) => (
                      <span key={idx} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                        {conflict}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage Limits */}
              {feature.hasUsageLimit && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Usage Limits</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">
                      <span className="font-medium">Default Limit:</span> {feature.defaultUsageLimit} {feature.usageLimitUnit}
                    </p>
                  </div>
                </div>
              )}

              {/* Pricing */}
              {feature.isAddOn && feature.pricing && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Pricing</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {feature.pricing.monthly && (
                      <p className="text-gray-700">
                        <span className="font-medium">Monthly:</span> ${feature.pricing.monthly}
                      </p>
                    )}
                    {feature.pricing.annual && (
                      <p className="text-gray-700">
                        <span className="font-medium">Annual:</span> ${feature.pricing.annual}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Rollout */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Rollout Status</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700">Rollout Percentage</span>
                    <span className="font-medium text-gray-900">{feature.rolloutPercentage || 100}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${feature.rolloutPercentage || 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">Created At</p>
                  <p className="text-gray-900">{new Date(feature.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Updated At</p>
                  <p className="text-gray-900">{new Date(feature.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Organizations Tab */}
          {activeTab === 'organizations' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Organizations Using This Feature
                </h3>
                <Link
                  to={`/features/${id}/grants`}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  Manage Grants →
                </Link>
              </div>

              {organizations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No organizations using this feature yet</p>
              ) : (
                <div className="space-y-3">
                  {organizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Users size={20} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{org.name}</p>
                          <p className="text-sm text-gray-500">{org.tier || 'Unknown tier'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {org.isActive ? (
                          <CheckCircle className="text-green-600" size={20} />
                        ) : (
                          <XCircle className="text-gray-400" size={20} />
                        )}
                        <span className="text-sm text-gray-600">
                          {org.grantedVia?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Analytics (Last 30 Days)</h3>
              
              {analytics ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="text-blue-600" size={20} />
                      <span className="text-sm text-gray-600">Total Usage</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalUsage || 0}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="text-green-600" size={20} />
                      <span className="text-sm text-gray-600">Active Organizations</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{analytics.activeOrganizations || 0}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="text-purple-600" size={20} />
                      <span className="text-sm text-gray-600">Avg Usage per Org</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{analytics.averageUsage || 0}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Analytics data not available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
