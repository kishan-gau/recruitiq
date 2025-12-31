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
export { PaylinqClient } from './products/paylinq';
export { NexusClient } from './products/nexus';
export { ScheduleHubClient } from './products/schedulehub';

// Unified API Client
import { APIClient, APIClientConfig, TokenStorage } from './core/client';
import { AuthAPI } from './core/auth';
import { FeaturesAPI } from './core/features';
import { RecruitIQAPI } from './products/recruitiq';
import { PortalAPI } from './products/portal';
import { PaylinqClient } from './products/paylinq';
import { NexusClient } from './products/nexus';
import { ScheduleHubClient } from './products/schedulehub';

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
  public paylinq: PaylinqClient;
  public nexus: NexusClient;
  public schedulehub: ScheduleHubClient;

  constructor(config: APIClientConfig = {}, tokenStorage?: TokenStorage) {
    this.apiClient = new APIClient(config, tokenStorage);
    
    // Initialize product APIs
    this.auth = new AuthAPI(this.apiClient);
    this.features = new FeaturesAPI(this.apiClient);
    this.recruitiq = new RecruitIQAPI(this.apiClient);
    this.portal = new PortalAPI(this.apiClient);
    this.paylinq = new PaylinqClient(this.apiClient);
    this.nexus = new NexusClient(this.apiClient);
    this.schedulehub = new ScheduleHubClient(this.apiClient);
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

  /**
   * Fetch CSRF token from server
   * Should be called after authentication
   */
  public async fetchCsrfToken(): Promise<string | null> {
    return this.apiClient.fetchCsrfToken();
  }

  /**
   * Set CSRF token
   */
  public setCsrfToken(token: string): void {
    this.apiClient.setCsrfToken(token);
  }

  /**
   * Get CSRF token
   */
  public getCsrfToken(): string | null {
    return this.apiClient.getCsrfToken();
  }

  /**
   * Make a direct request using the API client
   */
  public async request<T = any>(method: string, url: string, data?: any, config?: APIClientConfig): Promise<T> {
    switch (method.toLowerCase()) {
      case 'get':
        return this.apiClient.get(url, config as any);
      case 'post':
        return this.apiClient.post(url, data, config as any);
      case 'put':
        return this.apiClient.put(url, data, config as any);
      case 'patch':
        return this.apiClient.patch(url, data, config as any);
      case 'delete':
        return this.apiClient.delete(url, config as any);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }
}

// Create and export a default singleton instance
const defaultAPI = new RecruitIQPlatformAPI();

export default defaultAPI;

// Export as apiClient for backward compatibility and convenience
export { defaultAPI as apiClient };
