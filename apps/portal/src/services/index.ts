/**
 * Portal Services
 * 
 * Centralized service layer using @recruitiq/api-client
 * All services use PortalAPI for consistent API communication
 * 
 * CRITICAL: Portal manages PLATFORM-level resources only:
 * - Platform admins (not tenant users)
 * - System roles (not tenant roles)
 * - License management
 * - Customer/organization management
 * - Platform configuration
 */
export * from './auth.service';
export * from './customers.service';
export * from './rbac.service'; // Platform RBAC only

// Export api client instance for direct use when needed
export { PortalAPI, APIClient } from '@recruitiq/api-client';

