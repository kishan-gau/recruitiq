/**
 * Portal Services
 * 
 * Centralized service layer using @recruitiq/api-client
 * All services use PortalAPI for consistent API communication
 */
export * from './auth.service';
export * from './customers.service';
export * from './rbac.service';

// Export api client instance for direct use when needed
export { PortalAPI, APIClient } from '@recruitiq/api-client';
