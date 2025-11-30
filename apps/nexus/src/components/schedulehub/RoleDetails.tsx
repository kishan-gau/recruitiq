import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRole, useRoleWorkers } from '@/hooks/schedulehub/useRoles';
import { ArrowLeft, Edit, Users, Shield, CheckCircle, XCircle, Calendar } from 'lucide-react';
import RoleForm from './RoleForm';
import WorkerRoleAssignment from './WorkerRoleAssignment';

const RoleDetails: React.FC = () => {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignWorkerModal, setShowAssignWorkerModal] = useState(false);

  const { data: roleData, isLoading, error } = useRole(roleId!);
  const { data: workersData, isLoading: loadingWorkers } = useRoleWorkers(roleId!);

  const role = roleData?.role;
  const workers = workersData?.workers || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load role details. Please try again.</p>
      </div>
    );
  }

  const permissionsByCategory = (role.permissions || []).reduce((acc: any, permission: string) => {
    const category = permission.split('_')[0];
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/schedulehub/roles')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{role.name}</h1>
            <p className="text-gray-600 mt-1">{role.description || 'No description provided'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-sm font-medium rounded-full ${
              role.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {role.isActive ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Role
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assigned Workers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{workers.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Permissions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{role.permissions?.length || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {role.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${role.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
              {role.isActive ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-gray-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h2>
        {Object.keys(permissionsByCategory).length === 0 ? (
          <p className="text-gray-600">No permissions assigned to this role.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(permissionsByCategory).map(([category, permissions]: [string, any]) => (
              <div key={category} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 capitalize">{category}</h3>
                <ul className="space-y-1">
                  {permissions.map((permission: string) => (
                    <li key={permission} className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      {permission.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Workers Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Assigned Workers</h2>
          <button
            onClick={() => setShowAssignWorkerModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Assign Worker
          </button>
        </div>

        {loadingWorkers ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">No workers assigned to this role yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workers.map((assignment: any) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {assignment.workerName
                                ?.split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.workerName}
                          </div>
                          <div className="text-sm text-gray-500">{assignment.workerId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button className="text-red-600 hover:text-red-700">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <RoleForm
          role={role}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => setShowEditModal(false)}
        />
      )}

      {/* Assign Worker Modal */}
      {showAssignWorkerModal && (
        <WorkerRoleAssignment
          roleId={roleId!}
          onClose={() => setShowAssignWorkerModal(false)}
          onSuccess={() => setShowAssignWorkerModal(false)}
        />
      )}
    </div>
  );
};

export default RoleDetails;
