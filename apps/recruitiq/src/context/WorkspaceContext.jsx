import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@recruitiq/auth';
import { useOrganization } from './OrganizationContext';
import api from '../services/api';

const WorkspaceContext = createContext();

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

// Available workspace colors
export const WORKSPACE_COLORS = [
  { id: 'emerald', name: 'Emerald', class: 'bg-emerald-500', ring: 'ring-emerald-500', text: 'text-emerald-500' },
  { id: 'blue', name: 'Blue', class: 'bg-blue-500', ring: 'ring-blue-500', text: 'text-blue-500' },
  { id: 'purple', name: 'Purple', class: 'bg-purple-500', ring: 'ring-purple-500', text: 'text-purple-500' },
  { id: 'amber', name: 'Amber', class: 'bg-amber-500', ring: 'ring-amber-500', text: 'text-amber-500' },
  { id: 'rose', name: 'Rose', class: 'bg-rose-500', ring: 'ring-rose-500', text: 'text-rose-500' },
  { id: 'cyan', name: 'Cyan', class: 'bg-cyan-500', ring: 'ring-cyan-500', text: 'text-cyan-500' },
];

// Default workspace for existing users
const DEFAULT_WORKSPACE = {
  id: 'default',
  name: 'My Workspace',
  color: 'emerald',
  createdAt: new Date().toISOString(),
  users: [],
};

export const WorkspaceProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { canCreateWorkspace, refresh: refreshOrg } = useOrganization();
  
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Store workspace colors locally (frontend-only feature)
  const [workspaceColors, setWorkspaceColors] = useState(() => {
    try {
      const stored = localStorage.getItem('recruitiq_workspace_colors');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  // Save workspace colors to localStorage
  useEffect(() => {
    if (Object.keys(workspaceColors).length > 0) {
      localStorage.setItem('recruitiq_workspace_colors', JSON.stringify(workspaceColors));
    }
  }, [workspaceColors]);

  // Load workspaces from API when authenticated
  useEffect(() => {
    const loadWorkspaces = async () => {
      if (!isAuthenticated || !user) {
        // Clear workspaces when not authenticated
        setWorkspaces([]);
        setCurrentWorkspaceId(null);
        setIsInitialized(true);
        return;
      }

      // Prevent re-running if already initialized
      if (isInitialized) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('WorkspaceContext: Loading workspaces from API...');
        
        // Load workspaces from API
        const response = await api.getWorkspaces();
        const loadedWorkspaces = response.workspaces || [];
        
        console.log('WorkspaceContext: Workspaces loaded:', loadedWorkspaces);

        // If no workspaces exist, create a default one
        if (loadedWorkspaces.length === 0) {
          console.log('WorkspaceContext: No workspaces found, creating default workspace...');
          try {
            const newWorkspace = await api.createWorkspace({
              name: 'My Workspace',
              // Note: color is frontend-only, stored locally
            });
            console.log('WorkspaceContext: Default workspace created:', newWorkspace.workspace);
            loadedWorkspaces.push(newWorkspace.workspace);
            
            // Set default color for the new workspace
            setWorkspaceColors(prev => ({
              ...prev,
              [newWorkspace.workspace.id]: 'emerald'
            }));
          } catch (createError) {
            console.error('WorkspaceContext: Failed to create default workspace:', createError);
            // Continue anyway - user might be able to create one manually
          }
        }
        
        setWorkspaces(loadedWorkspaces);

        // Set current workspace from localStorage or first workspace
        const storedCurrentId = localStorage.getItem('recruitiq_current_workspace');
        const validWorkspace = loadedWorkspaces.find(w => w.id === storedCurrentId);
        
        if (validWorkspace) {
          setCurrentWorkspaceId(storedCurrentId);
        } else if (loadedWorkspaces.length > 0) {
          setCurrentWorkspaceId(loadedWorkspaces[0].id);
          localStorage.setItem('recruitiq_current_workspace', loadedWorkspaces[0].id);
        }

        setIsInitialized(true);
        setLoading(false);
      } catch (err) {
        console.error('WorkspaceContext: Failed to load workspaces:', err);
        setError(err.message || 'Failed to load workspaces');
        setIsInitialized(true);
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, [isAuthenticated, user]);

  // Save current workspace ID to localStorage (only ID, not full data)
  useEffect(() => {
    if (isInitialized && currentWorkspaceId) {
      localStorage.setItem('recruitiq_current_workspace', currentWorkspaceId);
    }
  }, [currentWorkspaceId, isInitialized]);

  // Get the current workspace object with color from local storage
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) 
    ? {
        ...workspaces.find(w => w.id === currentWorkspaceId),
        color: workspaceColors[currentWorkspaceId] || 'emerald'
      }
    : null;

  // Get workspace color configuration
  const getWorkspaceColor = (colorId) => {
    return WORKSPACE_COLORS.find(c => c.id === colorId) || WORKSPACE_COLORS[0];
  };

  // Switch to a different workspace (without page reload!)
  const switchWorkspace = (workspaceId) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      console.log('WorkspaceContext: Switching to workspace:', workspace.name);
      setCurrentWorkspaceId(workspaceId);
      // No longer reloading the page - DataContext will handle data refresh
    }
  };

  // Create a new workspace via API
  const createWorkspace = async (name, color = 'emerald') => {
    try {
      setError(null);

      // Check license limits before creating
      if (!canCreateWorkspace()) {
        throw new Error('Workspace limit reached. Please upgrade your plan.');
      }

      console.log('WorkspaceContext: Creating workspace:', name);
      
      const response = await api.createWorkspace({
        name,
        // Note: color is not sent to backend, stored locally
      });

      const newWorkspace = response.workspace;
      console.log('WorkspaceContext: Workspace created:', newWorkspace);
      
      // Add to local state
      setWorkspaces(prev => [...prev, newWorkspace]);
      
      // Store color locally
      setWorkspaceColors(prev => ({
        ...prev,
        [newWorkspace.id]: color
      }));
      
      // Refresh organization stats to update workspace count
      if (refreshOrg) {
        await refreshOrg();
      }
      
      return newWorkspace;
    } catch (err) {
      console.error('WorkspaceContext: Failed to create workspace:', err);
      setError(err.message || 'Failed to create workspace');
      throw err;
    }
  };

  // Rename a workspace via API
  const renameWorkspace = async (workspaceId, newName) => {
    try {
      setError(null);
      
      console.log('WorkspaceContext: Renaming workspace:', workspaceId, 'to', newName);
      
      const response = await api.updateWorkspace(workspaceId, { name: newName });
      
      // Update local state
      setWorkspaces(prev =>
        prev.map(w => (w.id === workspaceId ? response.workspace : w))
      );
      
      console.log('WorkspaceContext: Workspace renamed successfully');
    } catch (err) {
      console.error('WorkspaceContext: Failed to rename workspace:', err);
      setError(err.message || 'Failed to rename workspace');
      throw err;
    }
  };

  // Update workspace color via local storage (frontend-only)
  const updateWorkspaceColor = async (workspaceId, newColor) => {
    try {
      setError(null);
      
      console.log('WorkspaceContext: Updating workspace color:', workspaceId, 'to', newColor);
      
      // Color is frontend-only, just update local storage
      setWorkspaceColors(prev => ({
        ...prev,
        [workspaceId]: newColor
      }));
      
      console.log('WorkspaceContext: Workspace color updated successfully');
    } catch (err) {
      console.error('WorkspaceContext: Failed to update workspace color:', err);
      setError(err.message || 'Failed to update workspace color');
      throw err;
    }
  };

  // Delete a workspace via API
  const deleteWorkspace = async (workspaceId) => {
    try {
      if (workspaces.length === 1) {
        throw new Error('Cannot delete the last workspace');
      }

      setError(null);
      
      console.log('WorkspaceContext: Deleting workspace:', workspaceId);
      
      await api.deleteWorkspace(workspaceId);
      
      // Remove workspace from local state
      setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));

      // If deleting current workspace, switch to first available
      if (workspaceId === currentWorkspaceId) {
        const remainingWorkspaces = workspaces.filter(w => w.id !== workspaceId);
        if (remainingWorkspaces.length > 0) {
          switchWorkspace(remainingWorkspaces[0].id);
        }
      }
      
      // Refresh organization stats to update workspace count
      if (refreshOrg) {
        await refreshOrg();
      }
      
      console.log('WorkspaceContext: Workspace deleted successfully');
    } catch (err) {
      console.error('WorkspaceContext: Failed to delete workspace:', err);
      setError(err.message || 'Failed to delete workspace');
      throw err;
    }
  };

  // Get localStorage key for current workspace
  const getStorageKey = (key) => {
    return `recruitiq_${currentWorkspaceId}_${key}`;
  };

  // Add user to workspace via API
  const addWorkspaceUser = async (workspaceId, userData) => {
    try {
      setError(null);
      
      console.log('WorkspaceContext: Adding user to workspace:', userData.email);
      
      const response = await api.addWorkspaceMember(workspaceId, {
        userId: userData.userId,
        role: userData.role || 'member',
      });

      // Update local state
      setWorkspaces(prev =>
        prev.map(w => {
          if (w.id === workspaceId) {
            return response.workspace;
          }
          return w;
        })
      );

      console.log('WorkspaceContext: User added successfully');
      return response.member;
    } catch (err) {
      console.error('WorkspaceContext: Failed to add user:', err);
      setError(err.message || 'Failed to add user to workspace');
      throw err;
    }
  };

  // Update user role in workspace via API
  const updateWorkspaceUser = async (workspaceId, userId, userData) => {
    try {
      setError(null);
      
      console.log('WorkspaceContext: Updating workspace user:', userId);
      
      const response = await api.updateWorkspaceMember(workspaceId, userId, userData);

      // Update local state
      setWorkspaces(prev =>
        prev.map(w => {
          if (w.id === workspaceId) {
            return response.workspace;
          }
          return w;
        })
      );

      console.log('WorkspaceContext: User updated successfully');
    } catch (err) {
      console.error('WorkspaceContext: Failed to update user:', err);
      setError(err.message || 'Failed to update user');
      throw err;
    }
  };

  // Remove user from workspace via API
  const removeWorkspaceUser = async (workspaceId, userId) => {
    try {
      setError(null);
      
      console.log('WorkspaceContext: Removing user from workspace:', userId);
      
      await api.removeWorkspaceMember(workspaceId, userId);

      // Update local state - remove user from workspace members
      setWorkspaces(prev =>
        prev.map(w => {
          if (w.id === workspaceId) {
            return {
              ...w,
              members: (w.members || []).filter(m => m.userId !== userId),
            };
          }
          return w;
        })
      );

      console.log('WorkspaceContext: User removed successfully');
    } catch (err) {
      console.error('WorkspaceContext: Failed to remove user:', err);
      setError(err.message || 'Failed to remove user');
      throw err;
    }
  };

  const value = {
    currentWorkspace,
    currentWorkspaceId,
    workspaces,
    loading,
    error,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
    updateWorkspaceColor,
    deleteWorkspace,
    getStorageKey,
    getWorkspaceColor,
    isInitialized,
    addWorkspaceUser,
    updateWorkspaceUser,
    removeWorkspaceUser,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
