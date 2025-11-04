import React, { useState, useEffect } from 'react';
import { useWorkspace, WORKSPACE_COLORS } from '../context/WorkspaceContext';
import { useFlow } from '../context/FlowContext';
import Modal from './Modal';
import FlowDesigner from './FlowDesigner';

export default function WorkspaceManager({ isOpen, onClose }) {
  const {
    workspaces,
    currentWorkspace,
    createWorkspace,
    renameWorkspace,
    updateWorkspaceColor,
    deleteWorkspace,
    getWorkspaceColor,
    addWorkspaceUser,
    updateWorkspaceUser,
    removeWorkspaceUser,
  } = useWorkspace();

  const {
    flowTemplates,
    ensureLoaded,
    cloneFlowTemplate,
    deleteFlowTemplate,
    getFlowTemplateUsageCount,
  } = useFlow();

  const [mode, setMode] = useState('list'); // 'list' | 'create' | 'settings'
  const [settingsTab, setSettingsTab] = useState('general'); // 'general' | 'team' | 'flows'
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: 'emerald' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Team management state
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', role: 'member' });
  const [showUserForm, setShowUserForm] = useState(false);

  // Flow preview state
  const [showFlowPreview, setShowFlowPreview] = useState(null);
  const [showFlowDesigner, setShowFlowDesigner] = useState(false);
  const [editingFlowTemplate, setEditingFlowTemplate] = useState(null);

  // Load flow templates when modal opens or when flows tab is activated
  useEffect(() => {
    if (isOpen && mode === 'settings' && settingsTab === 'flows') {
      console.log('[WorkspaceManager] Loading flow templates for Hiring Flows tab')
      ensureLoaded();
    }
  }, [isOpen, mode, settingsTab, ensureLoaded]);

  const handleCreate = () => {
    setMode('create');
    setFormData({ name: '', color: 'emerald' });
  };

  const handleOpenSettings = (workspace) => {
    setMode('settings');
    setSettingsTab('general');
    setEditingWorkspace(workspace);
    setFormData({ name: workspace.name, color: workspace.color });
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    if (mode === 'create') {
      createWorkspace(formData.name.trim(), formData.color);
    } else if (mode === 'settings' && editingWorkspace) {
      renameWorkspace(editingWorkspace.id, formData.name.trim());
      updateWorkspaceColor(editingWorkspace.id, formData.color);
    }

    setMode('list');
    setFormData({ name: '', color: 'emerald' });
    setEditingWorkspace(null);
  };

  const handleDelete = (workspaceId) => {
    if (workspaces.length === 1) {
      alert('Cannot delete the last workspace');
      return;
    }

    if (confirmDelete === workspaceId) {
      deleteWorkspace(workspaceId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(workspaceId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleCancel = () => {
    setMode('list');
    setFormData({ name: '', color: 'emerald' });
    setEditingWorkspace(null);
    setShowUserForm(false);
    setEditingUser(null);
    setUserFormData({ name: '', email: '', role: 'member' });
  };

  const handleModalClose = () => {
    handleCancel();
    onClose();
  };

  // User management handlers
  const handleAddUser = () => {
    setShowUserForm(true);
    setEditingUser(null);
    setUserFormData({ name: '', email: '', role: 'member' });
  };

  const handleEditUser = (user) => {
    setShowUserForm(true);
    setEditingUser(user);
    setUserFormData({ name: user.name, email: user.email, role: user.role });
  };

  const handleSaveUser = () => {
    if (!userFormData.name.trim() || !userFormData.email.trim()) return;

    if (editingUser) {
      updateWorkspaceUser(editingWorkspace.id, editingUser.id, userFormData);
    } else {
      addWorkspaceUser(editingWorkspace.id, userFormData);
    }

    setShowUserForm(false);
    setEditingUser(null);
    setUserFormData({ name: '', email: '', role: 'member' });
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to remove this user from the workspace?')) {
      removeWorkspaceUser(editingWorkspace.id, userId);
    }
  };

  const getModalTitle = () => {
    if (mode === 'list') return 'Manage Workspaces';
    if (mode === 'create') return 'Create Workspace';
    if (mode === 'settings') return `${editingWorkspace?.name} Settings`;
    return 'Manage Workspaces';
  };

  return (
    <Modal open={isOpen} onClose={handleModalClose} title={mode === 'list' ? 'Manage Workspaces' : mode === 'create' ? 'Create Workspace' : 'Edit Workspace'} zIndex="z-[60]">
      <div className="max-w-2xl">
        {mode === 'list' ? (
          <>
            <div className="mb-4">
              <button
                onClick={handleCreate}
                className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Workspace
              </button>
            </div>

            <div className="space-y-2">
              {workspaces.map((workspace) => {
                const color = getWorkspaceColor(workspace.color);
                const isActive = workspace.id === currentWorkspace.id;
                const isConfirming = confirmDelete === workspace.id;

                return (
                  <div
                    key={workspace.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${color.class} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {workspace.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {isActive && 'Active • '}
                          {new Date(workspace.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenSettings(workspace)}
                          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                          title="Workspace settings"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        {workspaces.length > 1 && (
                          <button
                            onClick={() => handleDelete(workspace.id)}
                            className={`p-2 rounded transition-colors ${
                              isConfirming
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600'
                            }`}
                            title={isConfirming ? 'Click again to confirm' : 'Delete workspace'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : mode === 'create' ? (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., ACME Corp, TechStart Inc"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {WORKSPACE_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setFormData({ ...formData, color: color.id })}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        formData.color === color.id
                          ? 'border-slate-900 dark:border-slate-100'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                      title={color.name}
                    >
                      <div className={`w-full h-8 rounded ${color.class}`} />
                      {formData.color === color.id && (
                        <div className="absolute top-1 right-1">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim()}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </>
        ) : mode === 'settings' && editingWorkspace ? (
          <>
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
              <button
                onClick={() => setSettingsTab('general')}
                className={`px-4 py-2 font-medium transition-colors ${
                  settingsTab === 'general'
                    ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setSettingsTab('team')}
                className={`px-4 py-2 font-medium transition-colors ${
                  settingsTab === 'team'
                    ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Team
              </button>
              <button
                onClick={() => setSettingsTab('flows')}
                className={`px-4 py-2 font-medium transition-colors ${
                  settingsTab === 'flows'
                    ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Hiring Flows
              </button>
            </div>

            {/* Tab Content */}
            {settingsTab === 'general' ? (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., ACME Corp, TechStart Inc"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Color
                    </label>
                    <div className="grid grid-cols-6 gap-3">
                      {WORKSPACE_COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => setFormData({ ...formData, color: color.id })}
                          className={`relative p-4 rounded-lg border-2 transition-all ${
                            formData.color === color.id
                              ? 'border-slate-900 dark:border-slate-100'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                          title={color.name}
                        >
                          <div className={`w-full h-8 rounded ${color.class}`} />
                          {formData.color === color.id && (
                            <div className="absolute top-1 right-1">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!formData.name.trim()}
                    className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Changes
                  </button>
                </div>
              </>
            ) : settingsTab === 'team' ? (
              <>
                {/* Team Management */}
                <div className="space-y-4 mb-6">
                  {!showUserForm && (
                    <button
                      onClick={handleAddUser}
                      className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Team Member
                    </button>
                  )}

                  {showUserForm && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg space-y-3">
                      <h4 className="font-medium text-slate-900 dark:text-slate-100">
                        {editingUser ? 'Edit Team Member' : 'Add Team Member'}
                      </h4>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={userFormData.name}
                          onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                          placeholder="Enter name"
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                          placeholder="Enter email"
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Role
                        </label>
                        <select
                          value={userFormData.role}
                          onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowUserForm(false);
                            setEditingUser(null);
                            setUserFormData({ name: '', email: '', role: 'member' });
                          }}
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveUser}
                          disabled={!userFormData.name.trim() || !userFormData.email.trim()}
                          className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {editingUser ? 'Update' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Users List */}
                  <div className="space-y-2">
                    {(editingWorkspace?.users || []).length === 0 && !showUserForm && (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <p>No team members yet</p>
                        <p className="text-sm">Add team members to collaborate on this workspace</p>
                      </div>
                    )}
                    {(editingWorkspace?.users || []).map((user) => (
                      <div
                        key={user.id}
                        className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{user.name}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">{user.email}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                            {user.role && (
                              <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            title="Edit user"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded transition-colors"
                            title="Remove user"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : settingsTab === 'flows' ? (
              <>
                {/* Hiring Flows Tab */}
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-1">
                          Manage Hiring Flows
                        </h4>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          Create reusable hiring flow templates that define interview stages. Assign them to jobs and customize as needed.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Create New Flow Button */}
                  <button
                    onClick={() => {
                      setEditingFlowTemplate(null)
                      setShowFlowDesigner(true)
                    }}
                    className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Flow Template
                  </button>

                  {flowTemplates.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                      <svg className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-slate-600 dark:text-slate-400 mb-2">No flow templates yet</p>
                      <p className="text-sm text-slate-500 dark:text-slate-500">
                        Flow templates will appear here once created
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {flowTemplates.map(template => {
                        const usageCount = getFlowTemplateUsageCount(template.id);
                        return (
                          <div
                            key={template.id}
                            className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-slate-900 dark:text-slate-100">
                                    {template.name}
                                  </h4>
                                  {template.isDefault && (
                                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                  {template.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500 mt-3">
                              <span>{template.stages.length} stages</span>
                              <span>•</span>
                              <span>{usageCount} {usageCount === 1 ? 'job' : 'jobs'}</span>
                              {template.category && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{template.category}</span>
                                </>
                              )}
                            </div>

                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                              <button
                                onClick={() => setShowFlowPreview(template)}
                                className="flex-1 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors"
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => {
                                  setEditingFlowTemplate(template)
                                  setShowFlowDesigner(true)
                                }}
                                className="flex-1 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  const cloned = cloneFlowTemplate(template.id);
                                  if (cloned) {
                                    alert(`Cloned as "${cloned.name}"`);
                                  }
                                }}
                                className="flex-1 px-3 py-1.5 text-sm bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded transition-colors"
                              >
                                Clone
                              </button>
                              {!template.isDefault && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete "${template.name}"? This cannot be undone.`)) {
                                      try {
                                        deleteFlowTemplate(template.id);
                                      } catch (error) {
                                        alert(error.message);
                                      }
                                    }
                                  }}
                                  className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded transition-colors"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                </div>

                {/* Flow Preview Modal */}
                {showFlowPreview && (
                  <Modal open={true} onClose={() => setShowFlowPreview(null)} title={showFlowPreview.name} size="lg" zIndex="z-[70]">
                    <div className="space-y-4">
                      <p className="text-slate-600 dark:text-slate-400">{showFlowPreview.description}</p>
                      
                      <div className="space-y-2">
                        {showFlowPreview.stages.map((stage, idx) => (
                          <div key={stage.id} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-medium">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900 dark:text-slate-100">{stage.name}</span>
                                {stage.required && (
                                  <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                                    Required
                                  </span>
                                )}
                              </div>
                              {stage.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{stage.description}</p>
                              )}
                              {stage.estimatedDuration > 0 && (
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                  Duration: {stage.estimatedDuration} minutes
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => setShowFlowPreview(null)}
                          className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </Modal>
                )}
              </>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Flow Designer Modal */}
      <FlowDesigner 
        isOpen={showFlowDesigner} 
        onClose={() => {
          setShowFlowDesigner(false)
          setEditingFlowTemplate(null)
        }}
        editingTemplate={editingFlowTemplate}
      />
    </Modal>
  );
}
