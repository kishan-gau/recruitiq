import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Key, Shield, User, Mail, Calendar, Clock } from 'lucide-react';
import { portalService } from '../../services';
import toast from 'react-hot-toast';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'member'
  });
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  useEffect(() => {
    fetchUserData();
  }, [id]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [userData, permissionsData] = await Promise.all([
        portalService.getPortalUser(id),
        portalService.getPermissions()
      ]);
      
      setUser(userData.user);
      setPermissions(permissionsData.permissions || []);
      setFormData({
        name: userData.user.name,
        email: userData.user.email,
        role: userData.user.role || 'member'
      });
      
      // Set currently assigned permissions
      const userPermissionIds = userData.user.permissions?.map(p => p.id) || [];
      setSelectedPermissions(userPermissionIds);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update user basic info
      await portalService.updatePortalUser(id, formData);
      
      // Update permissions if changed
      const currentPermIds = user.permissions?.map(p => p.id) || [];
      const hasPermissionChanges = 
        selectedPermissions.length !== currentPermIds.length ||
        selectedPermissions.some(id => !currentPermIds.includes(id));
      
      if (hasPermissionChanges) {
        await portalService.updateUserPermissions(id, selectedPermissions);
      }
      
      toast.success('User updated successfully');
      setEditMode(false);
      fetchUserData();
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error(error.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await portalService.deletePortalUser(id);
      toast.success('User deleted successfully');
      navigate('/users');
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const togglePermission = (permissionId) => {
    if (selectedPermissions.includes(permissionId)) {
      setSelectedPermissions(selectedPermissions.filter(id => id !== permissionId));
    } else {
      setSelectedPermissions([...selectedPermissions, permissionId]);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading user data...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">User not found</div>
      </div>
    );
  }

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/users')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600 mt-1">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {editMode ? (
            <>
              <button
                onClick={() => {
                  setEditMode(false);
                  setFormData({
                    name: user.name,
                    email: user.email,
                    role: user.role || 'member'
                  });
                  setSelectedPermissions(user.permissions?.map(p => p.id) || []);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Edit User
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
        
        {editMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="platform_admin">Platform Admin</option>
                  <option value="security_admin">Security Admin</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="member">Member</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Role</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {user.role?.replace('_', ' ') || 'No Role'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Key className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Permissions</p>
                <p className="text-sm font-medium text-gray-900">
                  {user.permissions?.length || 0} assigned
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Calendar className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Login</p>
                <p className="text-sm font-medium text-gray-900">
                  {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Permissions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h2>
        
        {editMode ? (
          <div className="space-y-4">
            {Object.entries(permissionsByCategory).map(([category, perms]) => (
              <div key={category} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 capitalize flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(category)}`}>
                    {category}
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.isArray(perms) && perms.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{perm.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.permissions.map((perm, index) => (
                  <span
                    key={typeof perm === 'string' ? perm : perm.id || `perm-${index}`}
                    className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800"
                  >
                    {typeof perm === 'string' ? perm : perm.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No permissions assigned</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
