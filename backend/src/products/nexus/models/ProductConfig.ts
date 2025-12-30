/**
 * ProductConfig Model
 * Represents organization-specific configuration for a product
 */

class ProductConfig {
  id: any;
  organizationId: any;
  productId: any;
  configKey: any;
  configValue: any;
  configType: any;
  isEncrypted: any;
  isSensitive: any;
  description: any;
  createdAt: any;
  updatedAt: any;
  updatedBy: any;
  
  constructor(data: any = {}) {
    this.id = data.id;
    this.organizationId = data.organization_id || data.organizationId;
    this.productId = data.product_id || data.productId;
    
    this.configKey = data.config_key || data.configKey;
    this.configValue = data.config_value || data.configValue;
    this.configType = data.config_type || data.configType || 'custom';
    
    this.isEncrypted = data.is_encrypted !== undefined ? data.is_encrypted : data.isEncrypted;
    this.isSensitive = data.is_sensitive !== undefined ? data.is_sensitive : data.isSensitive;
    
    this.description = data.description;
    
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
    this.updatedBy = data.updated_by || data.updatedBy;
  }

  /**
   * Convert model to database format
   */
  toDatabase() {
    return {
      id: this.id,
      organization_id: this.organizationId,
      product_id: this.productId,
      config_key: this.configKey,
      config_value: this.configValue,
      config_type: this.configType,
      is_encrypted: this.isEncrypted,
      is_sensitive: this.isSensitive,
      description: this.description,
      updated_by: this.updatedBy
    };
  }

  /**
   * Convert model to API response format (masks sensitive values)
   */
  toJSON() {
    const json = {
      id: this.id,
      organizationId: this.organizationId,
      productId: this.productId,
      configKey: this.configKey,
      configValue: this.isSensitive ? '***REDACTED***' : this.configValue,
      configType: this.configType,
      isEncrypted: this.isEncrypted,
      isSensitive: this.isSensitive,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
    return json;
  }

  /**
   * Get unredacted config value (for internal use only)
   */
  getRawValue() {
    return this.configValue;
  }

  /**
   * Check if config is default (not customized)
   */
  isDefault() {
    return this.configType === 'default';
  }

  /**
   * Check if config is a custom override
   */
  isOverride() {
    return this.configType === 'override';
  }
}

export default ProductConfig;
