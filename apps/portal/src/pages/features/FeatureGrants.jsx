import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import apiService from '../../services/api';
import toast from 'react-hot-toast';

export default function FeatureGrants() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [feature, setFeature] = useState(null);
  const [grants, setGrants] = useState([]);
  const [allOrganizations, setAllOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [grantData, setGrantData] = useState({
    grantedVia: 'manual_grant',
    reason: '',
    expiresAt: '',
    usageLimit: ''
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const [featureRes, orgsRes, allOrgsRes] = await Promise.all([
        apiService.getFeature(id),
        apiService.getFeatureOrganizations(id, { limit: 1000 }),
        apiService.getOrganizations({ limit: 1000 })
      ]);

      setFeature(featureRes.feature);
      setGrants(orgsRes.organizations || []);
      setAllOrganizations(allOrgsRes.organizations || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load grants');
    } finally {
      setLoading(false);
    }
  }

  async function handleGrantFeature() {
    if (!selectedOrg) {
      toast.error('Please select an organization');
      return;
    }

    try {
      await apiService.grantFeature(selectedOrg, {
        featureId: id,
        grantedVia: grantData.grantedVia,
        reason: grantData.reason,
        expiresAt: grantData.expiresAt || null,
        usageLimit: grantData.usageLimit ? parseInt(grantData.usageLimit) : null
      });

      toast.success('Feature granted successfully');
      setShowGrantModal(false);
      setSelectedOrg('');
      setGrantData({
        grantedVia: 'manual_grant',
        reason: '',
        expiresAt: '',
        usageLimit: ''
      });
      fetchData();
    } catch (error) {
      console.error('Failed to grant feature:', error);
      toast.error(error.response?.data?.error || 'Failed to grant feature');
    }
  }

  async function handleRevokeFeature(orgId, orgName) {
    if (!confirm(`Are you sure you want to revoke this feature from ${orgName}?`)) {
      return;
    }

    const reason = prompt('Enter revocation reason (optional):');
    
    try {
      await apiService.revokeFeature(orgId, id, reason || 'Manually revoked by admin');
      toast.success('Feature revoked successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to revoke feature:', error);
      toast.error('Failed to revoke feature');
    }
  }

  const filteredGrants = grants.filter(grant =>
    grant.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableOrgs = allOrganizations.filter(org => 
    !grants.find(g => g.id === org.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/features/${id}`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feature Grants</h1>
            <p className="text-gray-600 mt-1">
              {feature?.featureName} • Manage organization access
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowGrantModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          Grant Feature
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Grants</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{grants.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Active Grants</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {grants.filter(g => g.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Available Organizations</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{availableOrgs.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Grants List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Granted Via
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Granted At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Expires At
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredGrants.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  No grants found
                </td>
              </tr>
            ) : (
              filteredGrants.map((grant) => (
                <tr key={grant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{grant.name}</div>
                      <div className="text-sm text-gray-500">{grant.tier || 'Unknown tier'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {grant.isActive ? (
                        <>
                          <CheckCircle className="text-green-600" size={20} />
                          <span className="text-sm text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="text-gray-400" size={20} />
                          <span className="text-sm text-gray-600">Inactive</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {grant.grantedVia?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {grant.grantedAt ? new Date(grant.grantedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {grant.expiresAt ? new Date(grant.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRevokeFeature(grant.id, grant.name)}
                      className="text-red-600 hover:text-red-900"
                      title="Revoke feature"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Grant Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Grant Feature Access</h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Organization Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization *
                </label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select an organization</option>
                  {availableOrgs.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.tier || 'No tier'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Granted Via */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Granted Via
                </label>
                <select
                  value={grantData.grantedVia}
                  onChange={(e) => setGrantData({...grantData, grantedVia: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="manual_grant">Manual Grant</option>
                  <option value="trial">Trial</option>
                  <option value="promotional">Promotional</option>
                  <option value="add_on_purchase">Add-on Purchase</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  value={grantData.reason}
                  onChange={(e) => setGrantData({...grantData, reason: e.target.value})}
                  rows={2}
                  placeholder="Why is this feature being granted?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires At (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={grantData.expiresAt}
                  onChange={(e) => setGrantData({...grantData, expiresAt: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Usage Limit Override */}
              {feature?.hasUsageLimit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usage Limit Override
                  </label>
                  <input
                    type="number"
                    value={grantData.usageLimit}
                    onChange={(e) => setGrantData({...grantData, usageLimit: e.target.value})}
                    placeholder={`Default: ${feature.defaultUsageLimit}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 rounded-b-lg">
              <button
                onClick={() => setShowGrantModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantFeature}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Grant Feature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
