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
 * 
 * STANDARDS: Named exports only (no default exports)
 * @see FRONTEND_STANDARDS.md - "API Client Integration Standards"
 */
export * from './auth.service';
export * from './customers.service';
export * from './rbac.service'; // Platform RBAC only

// Export api client instance for direct use when needed
export { PortalAPI, APIClient } from '@recruitiq/api-client';

/**
 * Unified Portal Service
 * 
 * Provides a single interface to all portal services for backward compatibility
 * with components that used the old monolithic apiService
 * 
 * Export the complete portalService from portalService.ts
 */
export { portalService } from './portalService';

