import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AssignWorkersToRole from './AssignWorkersToRole';
import RoleDetails from './RoleDetails';
import RoleForm from './RoleForm';
import RolesManagement from './RolesManagement';

const RolesList: React.FC = () => {
  const navigate = useNavigate();

  // Modal state management
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showRoleDetailsModal, setShowRoleDetailsModal] = useState(false);
  const [showAssignWorkersModal, setShowAssignWorkersModal] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Event handlers
  const handleCreateRole = () => {
    setShowCreateRoleModal(true);
  };

  const handleEditRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    setShowEditRoleModal(true);
  };

  const handleViewRole = (roleId: string) => {
    // Navigate to role details page instead of modal for better UX
    navigate(`/scheduling/roles/${roleId}`);
  };

  const handleAssignWorkers = (roleId: string) => {
    setSelectedRoleId(roleId);
    setShowAssignWorkersModal(true);
  };

  // Success handlers
  const handleCreateSuccess = () => {
    setShowCreateRoleModal(false);
  };

  const handleEditSuccess = () => {
    setShowEditRoleModal(false);
    setSelectedRoleId(null);
  };

  const handleDetailsClose = () => {
    setShowRoleDetailsModal(false);
    setSelectedRoleId(null);
  };

  const handleAssignSuccess = () => {
    setShowAssignWorkersModal(false);
    setSelectedRoleId(null);
  };

  // Close handlers
  const handleCreateClose = () => {
    setShowCreateRoleModal(false);
  };

  const handleEditClose = () => {
    setShowEditRoleModal(false);
    setSelectedRoleId(null);
  };

  const handleAssignClose = () => {
    setShowAssignWorkersModal(false);
    setSelectedRoleId(null);
  };

  return (
    <div>
      <RolesManagement
        onCreateRole={handleCreateRole}
        onEditRole={handleEditRole}
        onViewRole={handleViewRole}
        onAssignWorkers={handleAssignWorkers}
      />

      {/* Create Role Modal */}
      {showCreateRoleModal && (
        <RoleForm
          onClose={handleCreateClose}
          onSuccess={handleCreateSuccess}
          isModal={true}
        />
      )}

      {/* Edit Role Modal */}
      {showEditRoleModal && selectedRoleId && (
        <RoleForm
          roleId={selectedRoleId}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
          isModal={true}
        />
      )}

      {/* Role Details Modal (if needed for modal view) */}
      {showRoleDetailsModal && selectedRoleId && (
        <RoleDetails
          roleId={selectedRoleId}
          onClose={handleDetailsClose}
          onEditRole={handleEditRole}
          onAssignWorkers={handleAssignWorkers}
          isModal={true}
        />
      )}

      {/* Assign Workers Modal */}
      {showAssignWorkersModal && selectedRoleId && (
        <AssignWorkersToRole
          roleId={selectedRoleId}
          onClose={handleAssignClose}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
};

export default RolesList;