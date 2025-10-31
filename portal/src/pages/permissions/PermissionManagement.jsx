import { useState, useEffect } from 'react';
import { Key, Plus, Search, Edit, Trash2, Shield } from 'lucide-react';
import apiService from '../../services/api';
import toast from 'react-hot-toast';

export default function PermissionManagement() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      console.log('Fetching permissions...');
      const data = await apiService.getPermissions();
      console.log('Permissions response:', data);
      setPermissions(data.permissions || []);
      console.log('Permissions set:', data.permissions?.length || 0, 'items');
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(permissions.map(p => p.category))];

  const filteredPermissions = permissions.filter(perm => {
    const matchesSearch = perm.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         perm.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || perm.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const permissionsByCategory = filteredPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  const getCategoryColor = (category) => {
    const colors = {
      portal: 'bg-purple-100 text-purple-800',
      license: 'bg-blue-100 text-blue-800',
      security: 'bg-red-100 text-red-800',
      vps: 'bg-green-100 text-green-800',
      customer: 'bg-yellow-100 text-yellow-800',
      tenant: 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async (permissionId) => {
    if (!confirm('Are you sure you want to delete this permission? This may affect roles and users.')) return;

    try {
      await apiService.deletePermission(permissionId);
      toast.success('Permission deleted successfully');
      fetchPermissions();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete permission');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permission Management</h1>
          <p className="text-gray-600 mt-1">Manage system permissions</p>
        </div>
        <button
          onClick={() => {
            setEditingPermission(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          Create Permission
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Key className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Permissions</p>
              <p className="text-2xl font-bold text-gray-900">{permissions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Key className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Most Used Category</p>
              <p className="text-lg font-bold text-gray-900 capitalize">
                {categories[0] || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat} className="capitalize">{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Permissions by Category */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            Loading permissions...
          </div>
        ) : Object.keys(permissionsByCategory).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No permissions found
          </div>
        ) : (
          Object.entries(permissionsByCategory).map(([category, perms]) => (
            <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">{category}</h3>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(category)}`}>
                    {perms.length} permissions
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {perms.map((perm) => (
                  <div key={perm.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Key size={16} className="text-gray-400" />
                          <code className="text-sm font-mono font-medium text-gray-900">{perm.name}</code>
                        </div>
                        {perm.description && (
                          <p className="text-sm text-gray-600 ml-7">{perm.description}</p>
                        )}
                        {perm.roles && perm.roles.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 ml-7">
                            <span className="text-xs text-gray-500">Used in roles:</span>
                            {perm.roles.map((role, idx) => (
                              <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                {role}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => {
                            setEditingPermission(perm);
                            setShowCreateModal(true);
                          }}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(perm.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <PermissionModal
          permission={editingPermission}
          categories={categories}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPermission(null);
          }}
          onSave={() => {
            fetchPermissions();
            setShowCreateModal(false);
            setEditingPermission(null);
          }}
        />
      )}
    </div>
  );
}

// Permission Create/Edit Modal Component
function PermissionModal({ permission, categories, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: permission?.name || '',
    category: permission?.category || '',
    description: permission?.description || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (permission) {
        await apiService.updatePermission(permission.id, {
          category: formData.category,
          description: formData.description
        });
        toast.success('Permission updated successfully');
      } else {
        await apiService.createPermission(formData);
        toast.success('Permission created successfully');
      }
      onSave();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save permission');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {permission ? 'Edit Permission' : 'Create New Permission'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permission Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., license.view"
              required
              disabled={!!permission}
            />
            <p className="text-xs text-gray-500 mt-1">Use dot notation (e.g., category.action)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            {categories.length > 0 && !permission ? (
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat} className="capitalize">{cat}</option>
                ))}
                <option value="_new">+ New Category</option>
              </select>
            ) : (
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., license"
                required
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows="3"
              placeholder="Describe what this permission allows"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {permission ? 'Update Permission' : 'Create Permission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
