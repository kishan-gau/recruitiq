/**
 * ProductFeature Model
 * Represents a feature flag for a product with rollout capabilities
 */

class ProductFeature {
  id: any;
  productId: any;
  featureKey: any;
  featureName: any;
  description: any;
  status: any;
  isDefault: any;
  minTier: any;
  requiresFeatures: any;
  configSchema: any;
  defaultConfig: any;
  rolloutPercentage: any;
  targetOrganizations: any;
  createdAt: any;
  updatedAt: any;
  createdBy: any;
  
  constructor(data: any = {}) {
    this.id = data.id;
    this.productId = data.product_id || data.productId;
    
    this.featureKey = data.feature_key || data.featureKey;
    this.featureName = data.feature_name || data.featureName;
    this.description = data.description;
    
    this.status = data.status || 'alpha';
    this.isDefault = data.is_default !== undefined ? data.is_default : data.isDefault;
    
    this.minTier = data.min_tier || data.minTier;
    this.requiresFeatures = data.requires_features || data.requiresFeatures;
    
    this.configSchema = data.config_schema || data.configSchema;
    this.defaultConfig = data.default_config || data.defaultConfig;
    
    this.rolloutPercentage = data.rollout_percentage !== undefined ? data.rollout_percentage : data.rolloutPercentage || 0;
    this.targetOrganizations = data.target_organizations || data.targetOrganizations;
    
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
    this.createdBy = data.created_by || data.createdBy;
  }

  /**
   * Convert model to database format
   */
  toDatabase() {
    return {
      id: this.id,
      product_id: this.productId,
      feature_key: this.featureKey,
      feature_name: this.featureName,
      description: this.description,
      status: this.status,
      is_default: this.isDefault,
      min_tier: this.minTier,
      requires_features: this.requiresFeatures,
      config_schema: this.configSchema,
      default_config: this.defaultConfig,
      rollout_percentage: this.rolloutPercentage,
      target_organizations: this.targetOrganizations,
      created_by: this.createdBy
    };
  }

  /**
   * Convert model to API response format
   */
  toJSON() {
    return {
      id: this.id,
      productId: this.productId,
      featureKey: this.featureKey,
      featureName: this.featureName,
      description: this.description,
      status: this.status,
      isDefault: this.isDefault,
      minTier: this.minTier,
      requiresFeatures: this.requiresFeatures,
      configSchema: this.configSchema,
      defaultConfig: this.defaultConfig,
      rolloutPercentage: this.rolloutPercentage,
      targetOrganizations: this.targetOrganizations,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Check if feature is fully rolled out
   */
  isFullyRolledOut() {
    return this.rolloutPercentage === 100;
  }

  /**
   * Check if feature is stable
   */
  isStable() {
    return this.status === 'stable';
  }

  /**
   * Check if feature is in alpha
   */
  isAlpha() {
    return this.status === 'alpha';
  }

  /**
   * Check if feature is in beta
   */
  isBeta() {
    return this.status === 'beta';
  }

  /**
   * Check if feature is deprecated
   */
  isDeprecated() {
    return this.status === 'deprecated';
  }

  /**
   * Check if organization should have access based on rollout
   */
  isRolledOutToOrganization(organizationId) {
    // If feature is targeted to specific orgs, check if org is in the list
    if (this.targetOrganizations && Array.isArray(this.targetOrganizations)) {
      return this.targetOrganizations.includes(organizationId);
    }

    // If fully rolled out, everyone gets it
    if (this.rolloutPercentage === 100) {
      return true;
    }

    // If no rollout, no one gets it
    if (this.rolloutPercentage === 0) {
      return false;
    }

    // Use consistent hash to determine if org gets feature based on percentage
    // This ensures the same org always gets the same result for a given percentage
    const hash = this._hashString(organizationId);
    return (hash % 100) < this.rolloutPercentage;
  }

  /**
   * Simple hash function for consistent rollout
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

export default ProductFeature;
