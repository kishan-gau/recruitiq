import { ArrowLeft, Edit, Users, CheckCircle, XCircle, Calendar } from 'lucide-react';
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { useRole } from '@/hooks';

import AssignWorkersToRole from './AssignWorkersToRole';
import RoleForm from './RoleForm';

const RoleDetails: React.FC = () => {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignWorkerModal, setShowAssignWorkerModal] = useState(false);

  // Debug logging
  console.log('🔍 RoleDetails - roleId:', roleId);

  const { data: roleData, isLoading, error, refetch } = useRole(roleId!);
  
  const role = roleData?.data;
  // Workers assigned to role can be accessed from roleData.assignedWorkers if available
  const workers = roleData?.assignedWorkers || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Failed to load role details. Please try again.</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Navigation */}
      <div className="mb-6">
        <Link
          to="/schedulehub"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to ScheduleHub
        </Link>
      </div>

      {/* Title Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {role.name}
          </h1>
          <div className="flex items-center mt-2 space-x-4">
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                role.isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {role.isActive ? 'Active' : 'Inactive'}
            </span>
            {role.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {role.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Role
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Assigned Workers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{workers.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Status</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {role.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${role.isActive ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
              {role.isActive ? (
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Assigned Workers Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assigned Workers</h2>
          <button
            onClick={() => setShowAssignWorkerModal(true)}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors text-sm"
          >
            Assign Worker
          </button>
        </div>

        {loadingWorkers ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400" />
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-gray-600 dark:text-gray-300">No workers assigned to this role yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Assigned Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {workers.map((assignment: any) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                              {`${assignment.firstName} ${assignment.lastName}`
                                ?.split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {`${assignment.firstName} ${assignment.lastName}`}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{assignment.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(assignment.assignedDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <button className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Remove</button>
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

      {/* Assign Workers Modal */}
      {showAssignWorkerModal && (
        <AssignWorkersToRole
          roleId={roleId!}
          roleName={roleData?.data?.roleName || 'Role'}
                  onClose={() => setShowAssignWorkerModal(false)}
          onSuccess={() => {
            setShowAssignWorkerModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default RoleDetails;
