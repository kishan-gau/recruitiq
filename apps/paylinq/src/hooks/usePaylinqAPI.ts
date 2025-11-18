/**
 * Paylinq API Hook
 * 
 * React hook for accessing the Paylinq API client
 * Provides access to all Paylinq endpoints with proper authentication
 */

import { RecruitIQPlatformAPI } from '@recruitiq/api-client';

// Create singleton instance
// IMPORTANT: Use relative path to go through Vite proxy for cookie support
const api = new RecruitIQPlatformAPI({
  baseURL: '/api',
  timeout: 30000,
});

/**
 * Hook to access Paylinq API
 * 
 * @example
 * ```tsx
 * const { paylinq } = usePaylinqAPI();
 * 
 * // Fetch workers
 * const workers = await paylinq.getWorkers({ status: 'active' });
 * 
 * // Create time entry
 * await paylinq.createTimeEntry(entryData);
 * ```
 */
export const usePaylinqAPI = () => {
  return {
    paylinq: api.paylinq,
    auth: api.auth,
    client: api.getClient(),
  };
};

// Export API instance for non-hook usage
export const paylinqAPI = api.paylinq;
export const authAPI = api.auth;

export default api;
