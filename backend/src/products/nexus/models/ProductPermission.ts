/**
 * ProductPermission Model
 * Represents an organization's permission/access to a product
 */

import { ProductPermissionData, AccessLevel } from '../../../types/models.types.js';

class ProductPermission {
  id?: string;
  organizationId?: string;
  productId?: string;
  isEnabled?: boolean;
  accessLevel: AccessLevel;
  licenseKey?: string;
  licenseExpiresAt?: Date | string;
  maxUsers?: number;
  maxResources?: number;
  enabledFeatures?: string[];
  disabledFeatures?: string[];
  usersCount: number;
  resourcesCount: number;
  lastAccessedAt?: Date | string;
  grantedAt?: Date | string;
  grantedBy?: string;
  revokedAt?: Date | string;
  revokedBy?: string;
  notes?: string;

  constructor(data: ProductPermissionData = {}) {
    this.id = data.id;
    this.organizationId = data.organization_id || data.organizationId;
    this.productId = data.product_id || data.productId;
    
    this.isEnabled = data.is_enabled !== undefined ? data.is_enabled : data.isEnabled;
    this.accessLevel = (data.access_level || data.accessLevel || 'none') as AccessLevel;
    
    this.licenseKey = data.license_key || data.licenseKey;
    this.licenseExpiresAt = data.license_expires_at || data.licenseExpiresAt;
    this.maxUsers = data.max_users || data.maxUsers;
    this.maxResources = data.max_resources || data.maxResources;
    
    this.enabledFeatures = data.enabled_features || data.enabledFeatures;
    this.disabledFeatures = data.disabled_features || data.disabledFeatures;
    
    this.usersCount = data.users_count || data.usersCount || 0;
    this.resourcesCount = data.resources_count || data.resourcesCount || 0;
    this.lastAccessedAt = data.last_accessed_at || data.lastAccessedAt;
    
    this.grantedAt = data.granted_at || data.grantedAt;
    this.grantedBy = data.granted_by || data.grantedBy;
    this.revokedAt = data.revoked_at || data.revokedAt;
    this.revokedBy = data.revoked_by || data.revokedBy;
    this.notes = data.notes;
  }

  /**
   * Convert model to database format
   */
  toDatabase() {
    return {
      id: this.id,
      organization_id: this.organizationId,
      product_id: this.productId,
      is_enabled: this.isEnabled,
      access_level: this.accessLevel,
      license_key: this.licenseKey,
      license_expires_at: this.licenseExpiresAt,
      max_users: this.maxUsers,
      max_resources: this.maxResources,
      enabled_features: this.enabledFeatures,
      disabled_features: this.disabledFeatures,
      users_count: this.usersCount,
      resources_count: this.resourcesCount,
      last_accessed_at: this.lastAccessedAt,
      granted_by: this.grantedBy,
      revoked_at: this.revokedAt,
      revoked_by: this.revokedBy,
      notes: this.notes
    };
  }

  /**
   * Convert model to API response format
   */
  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      productId: this.productId,
      isEnabled: this.isEnabled,
      accessLevel: this.accessLevel,
      licenseKey: this.licenseKey,
      licenseExpiresAt: this.licenseExpiresAt,
      maxUsers: this.maxUsers,
      maxResources: this.maxResources,
      enabledFeatures: this.enabledFeatures,
      disabledFeatures: this.disabledFeatures,
      usersCount: this.usersCount,
      resourcesCount: this.resourcesCount,
      lastAccessedAt: this.lastAccessedAt,
      grantedAt: this.grantedAt,
      grantedBy: this.grantedBy,
      revokedAt: this.revokedAt,
      revokedBy: this.revokedBy,
      notes: this.notes
    };
  }

  /**
   * Check if license is active
   */
  isLicenseActive() {
    if (!this.isEnabled || this.revokedAt) return false;
    if (!this.licenseExpiresAt) return true; // No expiration
    return new Date(this.licenseExpiresAt) > new Date();
  }

  /**
   * Check if license is expired
   */
  isLicenseExpired() {
    if (!this.licenseExpiresAt) return false;
    return new Date(this.licenseExpiresAt) <= new Date();
  }

  /**
   * Check if user limit is reached
   */
  isUserLimitReached() {
    if (!this.maxUsers) return false;
    return this.usersCount >= this.maxUsers;
  }

  /**
   * Check if resource limit is reached
   */
  isResourceLimitReached() {
    if (!this.maxResources) return false;
    return this.resourcesCount >= this.maxResources;
  }

  /**
   * Check if specific access level is granted
   */
  hasAccessLevel(level) {
    const levels = ['none', 'read', 'write', 'full', 'admin'];
    const currentIndex = levels.indexOf(this.accessLevel);
    const requiredIndex = levels.indexOf(level);
    return currentIndex >= requiredIndex;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(featureKey) {
    if (this.disabledFeatures && this.disabledFeatures.includes(featureKey)) {
      return false;
    }
    if (this.enabledFeatures && this.enabledFeatures.includes(featureKey)) {
      return true;
    }
    return false; // Default to disabled
  }
}

export default ProductPermission;
