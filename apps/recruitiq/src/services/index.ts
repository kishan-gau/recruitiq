/**
 * RecruitIQ Services
 * 
 * Centralized service layer using @recruitiq/api-client
 * All services use RecruitIQAPI for consistent API communication
 */
export * from './auth.service';
export * from './jobs.service';
export * from './candidates.service.js';

// Export api client instance for direct use when needed
export { RecruitIQAPI, APIClient } from '@recruitiq/api-client';
