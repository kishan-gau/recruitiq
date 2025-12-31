import { 
  ArrowLeft, 
  Edit, 
  Users, 
  CheckCircle, 
  XCircle, 
  Calendar,
  DollarSign,
  Award,
  Building2,
  UserPlus,
  Trash2,
  Loader
} from 'lucide-react';
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { useErrorHandler } from '@/hooks';
import { useRole, useRoleWorkers } from '../hooks';

import AssignWorkersToRole from './AssignWorkersToRole';
import RoleForm from './RoleForm';

interface RoleDetailsProps {
  roleId?: string;
  onClose?: () => void;
  onEditRole?: (roleId: string) => void;
  onAssignWorkers?: (roleId: string) => void;
  isModal?: boolean;
}

const RoleDetails: React.FC<RoleDetailsProps> = ({
  roleId: propRoleId,
  onClose,
  onEditRole,
  onAssignWorkers,
  isModal = false
}) => {
  const navigate = useNavigate();
  const { roleId: paramRoleId } = useParams<{ roleId: string }>();
  const { handleError } = useErrorHandler();
  
  const roleId = propRoleId || paramRoleId;

  // State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignWorkersModal, setShowAssignWorkersModal] = useState(false);

  // Data fetching
  const { 
    data: roleData, 
    isLoading: roleLoading, 
    error: roleError,
    refetch: refetchRole
  } = useRole(roleId, { enabled: !!roleId });
  
  const { 
    data: workersData, 
    isLoading: workersLoading, 
    error: workersError,
    refetch: refetchWorkers
  } = useRoleWorkers(roleId, { enabled: !!roleId });

  const role = roleData?.data;
  const workers = workersData?.data || [];

  // Handle errors
  React.useEffect(() => {
    if (roleError) {
      handleError(roleError);
    }
    if (workersError) {
      handleError(workersError);
    }
  }, [roleError, workersError, handleError]);

  // Event handlers
  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/scheduling/roles');
    }
  };

  const handleEditClick = () => {
    if (onEditRole && roleId) {
      onEditRole(roleId);
    } else {
      setShowEditModal(true);
    }
  };

  const handleAssignWorkersClick = () => {
    if (onAssignWorkers && roleId) {
      onAssignWorkers(roleId);
    } else {
      setShowAssignWorkersModal(true);
    }
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    refetchRole();
  };

  const handleAssignSuccess = () => {
    setShowAssignWorkersModal(false);
    refetchWorkers();
  };

  const handleRemoveWorker = async (workerId: string) => {
    // This would typically call an API to remove the worker from the role
    // For now, we'll just show a placeholder
    console.log(`Remove worker ${workerId} from role ${roleId}`);
    // await removeWorkerFromRole(roleId, workerId);
    // refetchWorkers();
  };

  const getSkillLevelColor = (skillLevel: string) => {
    switch (skillLevel) {
      case 'beginner':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300';
      case 'expert':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Loading state
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading role details...</p>
        </div>
      </div>
    );
  }

  // Error state or role not found
  if (!role) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Role Not Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The role you're looking for doesn't exist or has been removed.
        </p>
        <button
          onClick={handleBack}
          className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Roles
        </button>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-4">
                <li>
                  <Link
                    to="/scheduling/roles"
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Roles
                  </Link>
                </li>
                <li className="flex items-center">
                  <svg className="flex-shrink-0 h-4 w-4 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-gray-500 dark:text-gray-400">
                    {role.name}
                  </span>
                </li>
              </ol>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {role.name}
            </h1>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleEditClick}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Role
          </button>
          <button
            onClick={handleAssignWorkersClick}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Workers
          </button>
        </div>
      </div>

      {/* Role Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Status */}
          <div className="text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              role.isActive 
                ? 'text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-300' 
                : 'text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-300'
            }`}>
              {role.isActive ? (
                <CheckCircle className="h-4 w-4 mr-1" />
              ) : (
                <XCircle className="h-4 w-4 mr-1" />
              )}
              {role.isActive ? 'Active' : 'Inactive'}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Status</p>
          </div>

          {/* Assigned Workers */}
          <div className="text-center">
            <div className="flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {workers.length}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Assigned Workers</p>
          </div>

          {/* Hourly Rate */}
          <div className="text-center">
            <div className="flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {role.hourlyRate ? `$${role.hourlyRate}` : 'N/A'}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hourly Rate</p>
          </div>

          {/* Skill Level */}
          <div className="text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSkillLevelColor(role.skillLevel)}`}>
              {role.skillLevel?.charAt(0).toUpperCase() + role.skillLevel?.slice(1) || 'Not specified'}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Skill Level</p>
          </div>
        </div>

        {/* Description and Details */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {role.description || 'No description provided.'}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Details</h3>
            <div className="space-y-2">
              {role.departmentName && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Building2 className="h-4 w-4 mr-2" />
                  Department: {role.departmentName}
                </div>
              )}
              {role.certificationRequired && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Award className="h-4 w-4 mr-2" />
                  Certification: {role.certificationName || 'Required'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Requirements and Responsibilities */}
        {(role.requirements || role.responsibilities) && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {role.requirements && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Requirements</h3>
                <div className="prose prose-sm text-gray-600 dark:text-gray-400">
                  <p className="whitespace-pre-line">{role.requirements}</p>
                </div>
              </div>
            )}
            {role.responsibilities && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Responsibilities</h3>
                <div className="prose prose-sm text-gray-600 dark:text-gray-400">
                  <p className="whitespace-pre-line">{role.responsibilities}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assigned Workers Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Assigned Workers ({workers.length})
          </h2>
          <button
            onClick={handleAssignWorkersClick}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Workers
          </button>
        </div>

        {workersLoading ? (
          <div className="text-center py-8">
            <Loader className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">Loading workers...</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Workers Assigned
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This role doesn't have any workers assigned yet.
            </p>
            <button
              onClick={handleAssignWorkersClick}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Workers
            </button>
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {workers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                            {worker.firstName?.[0]}{worker.lastName?.[0]}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {worker.firstName} {worker.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {worker.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-1" />
                        {worker.assignedDate ? new Date(worker.assignedDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        worker.isActive 
                          ? 'text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-300' 
                          : 'text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {worker.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveWorker(worker.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Remove from role"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
          onSuccess={handleEditSuccess}
          isModal={true}
        />
      )}

      {/* Assign Workers Modal */}
      {showAssignWorkersModal && roleId && (
        <AssignWorkersToRole
          roleId={roleId}
          onClose={() => setShowAssignWorkersModal(false)}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-6xl w-full max-h-screen overflow-y-auto mx-4">
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      {content}
    </div>
  );
};

export default RoleDetails;