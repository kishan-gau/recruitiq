import { APIClient } from '../core/client';

/**
 * Feature check result
 */
export interface FeatureCheckResult {
  featureKey: string;
  hasAccess: boolean;
  reason?: string;
  grantedVia?: 'tier' | 'addon' | 'trial' | 'custom';
  expiresAt?: string | null;
  usageLimit?: number | null;
  usageCount?: number;
  remainingUsage?: number | null;
}

/**
 * Feature definition
 */
export interface Feature {
  id: string;
  productId: string;
  featureKey: string;
  name: string;
  description?: string;
  category?: string;
  minTier?: string;
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
  rolloutPercentage?: number;
  dependencies?: string[];
  conflicts?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Feature grant
 */
export interface FeatureGrant {
  id: string;
  organizationId: string;
  featureId: string;
  featureKey: string;
  grantedVia: 'tier' | 'addon' | 'trial' | 'custom';
  grantedAt: string;
  grantedBy?: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revokeReason?: string | null;
  usageLimit?: number | null;
  usageCount: number;
  remainingUsage?: number | null;
  config?: Record<string, any>;
  billingStatus?: 'active' | 'past_due' | 'canceled' | 'trialing';
}

/**
 * Organization features response
 */
export interface OrganizationFeatures {
  available: Feature[];
  unavailable: Feature[];
}

/**
 * Usage summary
 */
export interface UsageSummary {
  featureKey: string;
  featureName: string;
  usageLimit: number | null;
  usageCount: number;
  remainingUsage: number | null;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
}

/**
 * Feature Analytics
 */
export interface FeatureAnalytics {
  featureId: string;
  featureKey: string;
  totalOrganizations: number;
  activeGrants: number;
  revokedGrants: number;
  expiredGrants: number;
  totalUsage: number;
  averageUsagePerOrg: number;
  usageByGrantedVia: Record<string, number>;
  usageByMonth: Array<{ month: string; usage: number; organizations: number }>;
}

/**
 * Feature adoption report
 */
export interface FeatureAdoptionReport {
  totalFeatures: number;
  activeFeatures: number;
  adoptionByFeature: Array<{
    featureKey: string;
    featureName: string;
    category: string;
    adoptionRate: number;
    totalOrgs: number;
    activeGrants: number;
  }>;
  adoptionByTier: Record<string, { features: number; organizations: number }>;
}

/**
 * Feature Management API
 * Provides feature access checking and management
 */
export class FeaturesAPI {
  constructor(private client: APIClient) {}

  // ============================================================================
  // Tenant-Facing Feature Access API
  // ============================================================================

  /**
   * Check if the current organization has access to a feature
   */
  async checkFeature(productSlug: string, featureKey: string): Promise<FeatureCheckResult> {
    return this.client.get(`/features/check`, {
      params: { product: productSlug, feature: featureKey },
    });
  }

  /**
   * Check access to multiple features at once
   */
  async checkMultipleFeatures(
    productSlug: string,
    featureKeys: string[]
  ): Promise<Record<string, FeatureCheckResult>> {
    return this.client.post(`/features/check-multiple`, {
      product: productSlug,
      features: featureKeys,
    });
  }

  /**
   * Get all features available to the current organization
   */
  async getOrganizationFeatures(productSlug?: string): Promise<OrganizationFeatures> {
    return this.client.get(`/features`, {
      params: productSlug ? { product: productSlug } : undefined,
    });
  }

  /**
   * Get active feature grants for the current organization
   */
  async getMyGrants(productSlug?: string): Promise<FeatureGrant[]> {
    return this.client.get(`/features/my-grants`, {
      params: productSlug ? { product: productSlug } : undefined,
    });
  }

  /**
   * Request access to a feature (trial or upgrade)
   */
  async requestAccess(
    productSlug: string,
    featureKey: string,
    requestType: 'trial' | 'upgrade' = 'trial',
    message?: string
  ): Promise<{ success: boolean; message: string; trialExpiresAt?: string }> {
    return this.client.post(`/features/request-access`, {
      product: productSlug,
      feature: featureKey,
      requestType,
      message,
    });
  }

  /**
   * Get usage summary for features with usage limits
   */
  async getUsageSummary(productSlug?: string): Promise<UsageSummary[]> {
    return this.client.get(`/features/usage-summary`, {
      params: productSlug ? { product: productSlug } : undefined,
    });
  }

  // ============================================================================
  // Admin Feature Management API
  // ============================================================================

  /**
   * Create a new feature (admin only)
   */
  async createFeature(data: {
    productId: string;
    featureKey: string;
    name: string;
    description?: string;
    category?: string;
    minTier?: string;
    status?: 'active' | 'beta' | 'deprecated' | 'disabled';
    rolloutPercentage?: number;
    dependencies?: string[];
    conflicts?: string[];
    metadata?: Record<string, any>;
  }): Promise<Feature> {
    return this.client.post('/admin/features', data);
  }

  /**
   * Get all features with filtering and pagination (admin only)
   */
  async listFeatures(params?: {
    productId?: string;
    status?: string;
    category?: string;
    minTier?: string;
    page?: number;
    limit?: number;
  }): Promise<{ features: Feature[]; total: number; page: number; limit: number }> {
    return this.client.get('/admin/features', { params });
  }

  /**
   * Get a specific feature by ID (admin only)
   */
  async getFeature(id: string): Promise<Feature> {
    return this.client.get(`/admin/features/${id}`);
  }

  /**
   * Update a feature (admin only)
   */
  async updateFeature(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      category: string;
      minTier: string;
      status: 'active' | 'beta' | 'deprecated' | 'disabled';
      dependencies: string[];
      conflicts: string[];
      metadata: Record<string, any>;
    }>
  ): Promise<Feature> {
    return this.client.patch(`/admin/features/${id}`, data);
  }

  /**
   * Deprecate a feature (admin only)
   */
  async deprecateFeature(id: string, message?: string): Promise<Feature> {
    return this.client.post(`/admin/features/${id}/deprecate`, { message });
  }

  /**
   * Update feature rollout percentage (admin only)
   */
  async updateRollout(
    id: string,
    percentage: number,
    targetOrganizations?: string[]
  ): Promise<Feature> {
    return this.client.patch(`/admin/features/${id}/rollout`, {
      percentage,
      targetOrganizations,
    });
  }

  /**
   * Get feature grants for a specific organization (admin only)
   */
  async getOrganizationGrants(
    organizationId: string,
    params?: { productId?: string; status?: string }
  ): Promise<FeatureGrant[]> {
    return this.client.get(`/admin/organizations/${organizationId}/features`, { params });
  }

  /**
   * Grant a feature to an organization (admin only)
   */
  async grantFeature(
    organizationId: string,
    data: {
      productId: string;
      featureKey: string;
      grantedVia: 'addon' | 'trial' | 'custom';
      expiresAt?: string;
      usageLimit?: number;
      config?: Record<string, any>;
    }
  ): Promise<FeatureGrant> {
    return this.client.post(`/admin/organizations/${organizationId}/features/grant`, data);
  }

  /**
   * Revoke a feature grant (admin only)
   */
  async revokeGrant(organizationId: string, grantId: string, reason?: string): Promise<void> {
    return this.client.delete(`/admin/organizations/${organizationId}/features/${grantId}`, {
      data: { reason },
    });
  }

  /**
   * Sync tier features for an organization (admin only)
   */
  async syncTierFeatures(
    organizationId: string,
    productId: string,
    tier: string
  ): Promise<{
    granted: number;
    revoked: number;
    unchanged: number;
    grantedFeatures: string[];
    revokedFeatures: string[];
  }> {
    return this.client.post(`/admin/organizations/${organizationId}/features/sync-tier`, {
      productId,
      tier,
    });
  }

  /**
   * Preview tier change effects (admin only)
   */
  async previewTierChange(
    organizationId: string,
    productId: string,
    newTier: string
  ): Promise<{ toBeAdded: string[]; toBeRemoved: string[] }> {
    return this.client.post(
      `/admin/organizations/${organizationId}/features/preview-tier-change`,
      { productId, newTier }
    );
  }

  /**
   * Get feature analytics (admin only)
   */
  async getFeatureAnalytics(
    featureId: string,
    startDate?: string,
    endDate?: string
  ): Promise<FeatureAnalytics> {
    return this.client.get(`/admin/features/${featureId}/analytics`, {
      params: { startDate, endDate },
    });
  }

  /**
   * Get feature adoption report (admin only)
   */
  async getAdoptionReport(productId?: string): Promise<FeatureAdoptionReport> {
    return this.client.get('/admin/features/adoption-report', {
      params: productId ? { productId } : undefined,
    });
  }
}
