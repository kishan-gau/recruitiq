/**
 * Product Model
 * Represents a product in the multi-product platform (Nexus, RecruitIQ, ScheduleHub, PayLinQ, etc.)
 */

class Product {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.displayName = data.display_name || data.displayName;
    this.description = data.description;
    this.slug = data.slug;
    this.version = data.version;
    this.npmPackage = data.npm_package || data.npmPackage;
    this.repositoryUrl = data.repository_url || data.repositoryUrl;
    this.documentationUrl = data.documentation_url || data.documentationUrl;
    
    this.status = data.status || 'active';
    this.isCore = data.is_core !== undefined ? data.is_core : data.isCore;
    this.requiresLicense = data.requires_license !== undefined ? data.requires_license : data.requiresLicense;
    
    this.basePath = data.base_path || data.basePath;
    this.apiPrefix = data.api_prefix || data.apiPrefix;
    this.defaultPort = data.default_port || data.defaultPort;
    
    this.minTier = data.min_tier || data.minTier;
    this.resourceRequirements = data.resource_requirements || data.resourceRequirements;
    
    this.features = data.features;
    this.defaultFeatures = data.default_features || data.defaultFeatures;
    
    this.icon = data.icon;
    this.color = data.color;
    this.uiConfig = data.ui_config || data.uiConfig;
    
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
    this.createdBy = data.created_by || data.createdBy;
    this.deletedAt = data.deleted_at || data.deletedAt;
  }

  /**
   * Convert model to database format
   */
  toDatabase() {
    return {
      id: this.id,
      name: this.name,
      display_name: this.displayName,
      description: this.description,
      slug: this.slug,
      version: this.version,
      npm_package: this.npmPackage,
      repository_url: this.repositoryUrl,
      documentation_url: this.documentationUrl,
      status: this.status,
      is_core: this.isCore,
      requires_license: this.requiresLicense,
      base_path: this.basePath,
      api_prefix: this.apiPrefix,
      default_port: this.defaultPort,
      min_tier: this.minTier,
      resource_requirements: this.resourceRequirements,
      features: this.features,
      default_features: this.defaultFeatures,
      icon: this.icon,
      color: this.color,
      ui_config: this.uiConfig,
      created_by: this.createdBy,
      deleted_at: this.deletedAt
    };
  }

  /**
   * Convert model to API response format
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      slug: this.slug,
      version: this.version,
      npmPackage: this.npmPackage,
      repositoryUrl: this.repositoryUrl,
      documentationUrl: this.documentationUrl,
      status: this.status,
      isCore: this.isCore,
      requiresLicense: this.requiresLicense,
      basePath: this.basePath,
      apiPrefix: this.apiPrefix,
      defaultPort: this.defaultPort,
      minTier: this.minTier,
      resourceRequirements: this.resourceRequirements,
      features: this.features,
      defaultFeatures: this.defaultFeatures,
      icon: this.icon,
      color: this.color,
      uiConfig: this.uiConfig,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt
    };
  }

  /**
   * Check if product is active
   */
  isActive() {
    return this.status === 'active' && !this.deletedAt;
  }

  /**
   * Check if product is in beta
   */
  isBeta() {
    return this.status === 'beta';
  }

  /**
   * Check if product is deprecated
   */
  isDeprecated() {
    return this.status === 'deprecated';
  }
}

export default Product;
