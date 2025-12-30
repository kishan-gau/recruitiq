/**
 * Model types for domain entities
 */

// Product status literals
export type ProductStatus = 'active' | 'deprecated' | 'development' | 'maintenance';

// Product access levels
export type AccessLevel = 'none' | 'read' | 'write' | 'admin';

// Feature status literals
export type FeatureStatus = 'alpha' | 'beta' | 'stable' | 'deprecated';

// Config types
export type ConfigType = 'string' | 'number' | 'boolean' | 'json' | 'custom';

/**
 * Product Model Data
 */
export interface ProductData {
  id?: string;
  name: string;
  display_name?: string;
  displayName?: string;
  description?: string;
  slug: string;
  version: string;
  npm_package?: string;
  npmPackage?: string;
  repository_url?: string;
  repositoryUrl?: string;
  documentation_url?: string;
  documentationUrl?: string;
  status?: ProductStatus;
  is_core?: boolean;
  isCore?: boolean;
  requires_license?: boolean;
  requiresLicense?: boolean;
  base_path?: string;
  basePath?: string;
  api_prefix?: string;
  apiPrefix?: string;
  default_port?: number;
  defaultPort?: number;
  min_tier?: string;
  minTier?: string;
  resource_requirements?: Record<string, unknown>;
  resourceRequirements?: Record<string, unknown>;
  features?: string[];
  default_features?: string[];
  defaultFeatures?: string[];
  icon?: string;
  color?: string;
  ui_config?: Record<string, unknown>;
  uiConfig?: Record<string, unknown>;
  created_at?: Date | string;
  createdAt?: Date | string;
  updated_at?: Date | string;
  updatedAt?: Date | string;
  created_by?: string;
  createdBy?: string;
  deleted_at?: Date | string | null;
  deletedAt?: Date | string | null;
}

/**
 * ProductPermission Model Data
 */
export interface ProductPermissionData {
  id?: string;
  organization_id?: string;
  organizationId?: string;
  product_id?: string;
  productId?: string;
  is_enabled?: boolean;
  isEnabled?: boolean;
  access_level?: AccessLevel;
  accessLevel?: AccessLevel;
  license_key?: string;
  licenseKey?: string;
  license_expires_at?: Date | string;
  licenseExpiresAt?: Date | string;
  max_users?: number;
  maxUsers?: number;
  max_resources?: number;
  maxResources?: number;
  enabled_features?: string[];
  enabledFeatures?: string[];
  disabled_features?: string[];
  disabledFeatures?: string[];
  users_count?: number;
  usersCount?: number;
  resources_count?: number;
  resourcesCount?: number;
  last_accessed_at?: Date | string;
  lastAccessedAt?: Date | string;
  granted_at?: Date | string;
  grantedAt?: Date | string;
  granted_by?: string;
  grantedBy?: string;
  revoked_at?: Date | string;
  revokedAt?: Date | string;
  revoked_by?: string;
  revokedBy?: string;
  notes?: string;
}

/**
 * ProductFeature Model Data
 */
export interface ProductFeatureData {
  id?: string;
  product_id?: string;
  productId?: string;
  feature_key?: string;
  featureKey?: string;
  feature_name?: string;
  featureName?: string;
  description?: string;
  status?: FeatureStatus;
  is_default?: boolean;
  isDefault?: boolean;
  min_tier?: string;
  minTier?: string;
  requires_features?: string[];
  requiresFeatures?: string[];
  config_schema?: Record<string, unknown>;
  configSchema?: Record<string, unknown>;
  default_config?: Record<string, unknown>;
  defaultConfig?: Record<string, unknown>;
  rollout_percentage?: number;
  rolloutPercentage?: number;
  target_organizations?: string[];
  targetOrganizations?: string[];
  created_at?: Date | string;
  createdAt?: Date | string;
  updated_at?: Date | string;
  updatedAt?: Date | string;
  created_by?: string;
  createdBy?: string;
}

/**
 * ProductConfig Model Data
 */
export interface ProductConfigData {
  id?: string;
  organization_id?: string;
  organizationId?: string;
  product_id?: string;
  productId?: string;
  config_key?: string;
  configKey?: string;
  config_value?: unknown;
  configValue?: unknown;
  config_type?: ConfigType;
  configType?: ConfigType;
  is_encrypted?: boolean;
  isEncrypted?: boolean;
  is_sensitive?: boolean;
  isSensitive?: boolean;
  description?: string;
  created_at?: Date | string;
  createdAt?: Date | string;
  updated_at?: Date | string;
  updatedAt?: Date | string;
  updated_by?: string;
  updatedBy?: string;
}

/**
 * Barbican Provider Config
 */
export interface BarbicanConfig {
  endpoint?: string;
  authEndpoint?: string;
  username?: string;
  password?: string;
  projectName?: string;
  projectDomain?: string;
  userDomain?: string;
  cacheTTL?: number;
}

/**
 * AWS Secrets Manager Config
 */
export interface AWSSecretsConfig {
  region?: string;
}

/**
 * Azure Key Vault Config
 */
export interface AzureKeyVaultConfig {
  vaultUrl?: string;
}

/**
 * HashiCorp Vault Config
 */
export interface HashiCorpVaultConfig {
  endpoint?: string;
  token?: string;
  namespace?: string;
  cacheTTL?: number;
}

/**
 * Secret Provider Interface
 */
export interface ISecretProvider {
  name: string;
  getSecret(secretName: string): Promise<string | undefined>;
  setSecret(secretName: string, secretValue: string): Promise<void>;
  deleteSecret(secretName: string): Promise<void>;
}
