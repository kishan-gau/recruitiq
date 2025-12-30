/**
 * Generate a test authentication token
 * @param {Object} user - User object with userId, organizationId, and role
 * @returns {string} JWT token
 */
export function generateAuthToken(user: Object): string;
/**
 * Verify a test authentication token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export function verifyAuthToken(token: string): Object;
/**
 * Generate admin authentication token
 * @param {Object} user - User object
 * @returns {string} JWT token with admin role
 */
export function generateAdminToken(user: Object): string;
/**
 * Generate expired authentication token (for testing)
 * @param {Object} user - User object
 * @returns {string} Expired JWT token
 */
export function generateExpiredToken(user: Object): string;
/**
 * Create authorization header for tests
 * @param {string} token - JWT token
 * @returns {Object} Headers object with authorization
 */
export function createAuthHeader(token: string): Object;
/**
 * Create mock request with authentication
 * @param {Object} user - User object
 * @param {Object} additionalData - Additional request data
 * @returns {Object} Mock request object
 */
export function createAuthenticatedRequest(user: Object, additionalData?: Object): Object;
/**
 * Generate test token with permissions (for RBAC tests)
 * @param {Object} userData - User data including permissions
 * @param {string} userData.id - User ID
 * @param {string} userData.email - User email
 * @param {string} userData.organizationId - Organization ID
 * @param {string} userData.role - User role
 * @param {Array<string>} userData.permissions - Array of permission codes
 * @returns {string} JWT token
 */
export function generateTestToken(userData: {
    id: string;
    email: string;
    organizationId: string;
    role: string;
    permissions: Array<string>;
}): string;
//# sourceMappingURL=auth.d.ts.map