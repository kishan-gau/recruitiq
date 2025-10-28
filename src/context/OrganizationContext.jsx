import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const OrganizationContext = createContext();

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Load organization data when user is authenticated
  useEffect(() => {
    const loadOrganization = async () => {
      if (!isAuthenticated || !user) {
        setOrganization(null);
        setStats(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('OrganizationContext: Loading organization data...');
        
        // Load organization data
        const orgResponse = await api.getOrganization();
        console.log('OrganizationContext: Organization loaded:', orgResponse.organization);
        setOrganization(orgResponse.organization);

        // Load organization stats (usage info)
        try {
          const statsResponse = await api.getOrganizationStats();
          console.log('OrganizationContext: Stats loaded:', statsResponse);
          setStats(statsResponse);
        } catch (statsError) {
          console.warn('Failed to load organization stats:', statsError);
          // Don't fail if stats aren't available
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to load organization:', err);
        setError(err.message || 'Failed to load organization data');
        setLoading(false);
      }
    };

    loadOrganization();
  }, [user, isAuthenticated]);

  /**
   * Refresh organization data manually
   */
  const refresh = async () => {
    if (!isAuthenticated) return;

    try {
      setError(null);
      const response = await api.getOrganization();
      setOrganization(response.organization);

      // Refresh stats too
      try {
        const statsResponse = await api.getOrganizationStats();
        setStats(statsResponse);
      } catch (statsError) {
        console.warn('Failed to refresh organization stats:', statsError);
      }
    } catch (err) {
      console.error('Failed to refresh organization:', err);
      setError(err.message || 'Failed to refresh organization data');
      throw err;
    }
  };

  /**
   * Update organization settings
   */
  const updateOrganization = async (data) => {
    try {
      setError(null);
      const response = await api.updateOrganization(data);
      setOrganization(response.organization);
      return response.organization;
    } catch (err) {
      console.error('Failed to update organization:', err);
      setError(err.message || 'Failed to update organization');
      throw err;
    }
  };

  // ============================================================================
  // License & Feature Checks
  // ============================================================================

  /**
   * Check if organization can create more workspaces
   */
  const canCreateWorkspace = () => {
    if (!organization || !stats) return false;
    
    // If no limit is set, allow unlimited
    if (!organization.maxWorkspaces || organization.maxWorkspaces === -1) {
      return true;
    }
    
    const currentCount = stats.workspaceCount || 0;
    return currentCount < organization.maxWorkspaces;
  };

  /**
   * Check if organization can add more users
   */
  const canAddUser = () => {
    if (!organization || !stats) return false;
    
    // If no limit is set, allow unlimited
    if (!organization.maxUsers || organization.maxUsers === -1) {
      return true;
    }
    
    const currentCount = stats.userCount || 0;
    return currentCount < organization.maxUsers;
  };

  /**
   * Check if organization has access to a specific feature
   * @param {string} feature - Feature identifier
   * @returns {boolean}
   */
  const hasFeature = (feature) => {
    if (!organization?.license) return false;
    
    // Owner and admin have access to all features
    if (user?.role === 'owner' || user?.role === 'admin') {
      return true;
    }
    
    // Check if feature is in the license features array
    return organization.license.features?.includes(feature) || false;
  };

  /**
   * Get workspace limit information
   */
  const getWorkspaceLimitInfo = () => {
    if (!organization || !stats) {
      return {
        current: 0,
        max: 0,
        remaining: 0,
        isUnlimited: false,
        percentage: 0,
      };
    }

    const current = stats.workspaceCount || 0;
    const max = organization.maxWorkspaces || 0;
    const isUnlimited = max === -1 || !max;

    if (isUnlimited) {
      return {
        current,
        max: Infinity,
        remaining: Infinity,
        isUnlimited: true,
        percentage: 0,
      };
    }

    return {
      current,
      max,
      remaining: Math.max(0, max - current),
      isUnlimited: false,
      percentage: max > 0 ? (current / max) * 100 : 0,
    };
  };

  /**
   * Get user limit information
   */
  const getUserLimitInfo = () => {
    if (!organization || !stats) {
      return {
        current: 0,
        max: 0,
        remaining: 0,
        isUnlimited: false,
        percentage: 0,
      };
    }

    const current = stats.userCount || 0;
    const max = organization.maxUsers || 0;
    const isUnlimited = max === -1 || !max;

    if (isUnlimited) {
      return {
        current,
        max: Infinity,
        remaining: Infinity,
        isUnlimited: true,
        percentage: 0,
      };
    }

    return {
      current,
      max,
      remaining: Math.max(0, max - current),
      isUnlimited: false,
      percentage: max > 0 ? (current / max) * 100 : 0,
    };
  };

  /**
   * Check if organization is approaching any limits (>80% usage)
   */
  const isApproachingLimits = () => {
    const workspaceLimit = getWorkspaceLimitInfo();
    const userLimit = getUserLimitInfo();

    if (workspaceLimit.isUnlimited && userLimit.isUnlimited) {
      return false;
    }

    return (
      (!workspaceLimit.isUnlimited && workspaceLimit.percentage >= 80) ||
      (!userLimit.isUnlimited && userLimit.percentage >= 80)
    );
  };

  /**
   * Check if organization has reached any limits
   */
  const hasReachedLimits = () => {
    return !canCreateWorkspace() || !canAddUser();
  };

  const value = {
    // State
    organization,
    loading,
    error,
    stats,

    // Actions
    refresh,
    updateOrganization,

    // License checks
    canCreateWorkspace,
    canAddUser,
    hasFeature,

    // Limit info
    getWorkspaceLimitInfo,
    getUserLimitInfo,
    isApproachingLimits,
    hasReachedLimits,

    // Convenience properties
    organizationId: organization?.id,
    organizationName: organization?.name,
    tier: organization?.tier || 'free',
    isActive: organization?.isActive ?? true,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
