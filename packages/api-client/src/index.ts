// Core exports
export { APIClient } from './core/client';
export type { APIClientConfig, TokenStorage } from './core/client';

export { AuthAPI } from './core/auth';
export type {
  LoginCredentials,
  RegisterData,
  MFASetupResponse,
  SessionInfo,
} from './core/auth';

export { FeaturesAPI } from './core/features';
export type {
  FeatureCheckResult,
  Feature,
  FeatureGrant,
  OrganizationFeatures,
  UsageSummary,
  FeatureAnalytics,
  FeatureAdoptionReport,
} from './core/features';

// Product exports
export { RecruitIQAPI } from './products/recruitiq';
export { PortalAPI } from './products/portal';
export { PaylinqAPI } from './products/paylinq';

// Unified API Client
import { APIClient, APIClientConfig, TokenStorage } from './core/client';
import { AuthAPI } from './core/auth';
import { FeaturesAPI } from './core/features';
import { RecruitIQAPI } from './products/recruitiq';
import { PortalAPI } from './products/portal';
import { PaylinqAPI } from './products/paylinq';

/**
 * Unified RecruitIQ Platform API Client
 * Provides access to all product APIs with shared authentication
 */
export class RecruitIQPlatformAPI {
  private apiClient: APIClient;
  
  public auth: AuthAPI;
  public features: FeaturesAPI;
  public recruitiq: RecruitIQAPI;
  public portal: PortalAPI;
  public paylinq: PaylinqAPI;

  constructor(config: APIClientConfig = {}, tokenStorage?: TokenStorage) {
    this.apiClient = new APIClient(config, tokenStorage);
    
    // Initialize product APIs
    this.auth = new AuthAPI(this.apiClient);
    this.features = new FeaturesAPI(this.apiClient);
    this.recruitiq = new RecruitIQAPI(this.apiClient);
    this.portal = new PortalAPI(this.apiClient);
    this.paylinq = new PaylinqAPI(this.apiClient);
  }

  /**
   * Get the underlying API client for direct access
   */
  public getClient(): APIClient {
    return this.apiClient;
  }

  /**
   * Get token storage interface
   */
  public getTokenStorage(): TokenStorage {
    return this.apiClient.getTokenStorage();
  }
}

// Create and export a default singleton instance
const defaultAPI = new RecruitIQPlatformAPI();

export default defaultAPI;
