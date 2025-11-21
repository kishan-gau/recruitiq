# Cache Implementation Plan - Part 2: Authentication & Core Services

**Continuation of:** [CACHE_IMPLEMENTATION_PLAN.md](./CACHE_IMPLEMENTATION_PLAN.md)

---

## Phase 2: Authentication Layer (Week 2)

**Goal:** Cache authentication data to reduce database load by 70-80% on login operations.

### 2.1 User Authentication Caching

#### Current Authentication Flow Analysis

**Files to Modify:**
- `backend/src/controllers/auth/tenantAuthController.js`
- `backend/src/controllers/auth/platformAuthController.js`
- `backend/src/models/TenantUser.js`
- `backend/src/models/PlatformUser.js`
- `backend/src/middleware/auth.js`

#### Implementation: Cache User Lookups

**Step 1: Update TenantUser Model**

**File: `backend/src/models/TenantUser.js`**

Add at top:
```javascript
import cacheService from '../services/cacheService.js';
```

Replace `findByEmail` method with cached version:
```javascript
/**
 * Find user by email with caching
 * Cache hit avoids database query (70% of login attempts)
 */
static async findByEmail(email, organizationId) {
  // Generate cache key
  const cacheKey = cacheService.getUserByEmailKey(email, organizationId);
  
  // Try cache first
  const cachedUser = await cacheService.get(cacheKey);
  if (cachedUser) {
    logger.debug('User found in cache', { email, organizationId });
    return cachedUser;
  }
  
  // Cache miss - fetch from database
  const result = await db.query(
    `SELECT 
      ua.id,
      ua.email,
      ua.password_hash,
      ua.is_active,
      ua.failed_login_attempts,
      ua.last_failed_login,
      ua.account_locked_until,
      ua.last_login_at,
      ua.employee_id,
      ua.organization_id,
      o.tier as organization_tier,
      COALESCE(ua.enabled_products, '[]'::jsonb) as enabled_products,
      COALESCE(ua.product_roles, '{}'::jsonb) as product_roles
     FROM hris.user_account ua
     JOIN organizations o ON ua.organization_id = o.id
     WHERE ua.email = $1 
       AND ua.organization_id = $2
       AND ua.deleted_at IS NULL`,
    [email.toLowerCase().trim(), organizationId]
  );
  
  const user = result.rows[0] || null;
  
  // Cache for 5 minutes
  if (user) {
    await cacheService.set(cacheKey, user, cacheService.TTL.USER_DATA);
    logger.debug('User cached from database', { email, organizationId });
  }
  
  return user;
}

/**
 * Find user by ID with caching
 */
static async findById(id, organizationId) {
  const cacheKey = cacheService.getUserByIdKey(id, organizationId);
  
  return cacheService.getOrFetch(
    cacheKey,
    async () => {
      const result = await db.query(
        `SELECT 
          ua.id,
          ua.email,
          ua.password_hash,
          ua.is_active,
          ua.failed_login_attempts,
          ua.last_failed_login,
          ua.account_locked_until,
          ua.employee_id,
          ua.organization_id,
          o.tier as organization_tier,
          COALESCE(ua.enabled_products, '[]'::jsonb) as enabled_products,
          COALESCE(ua.product_roles, '{}'::jsonb) as product_roles
         FROM hris.user_account ua
         JOIN organizations o ON ua.organization_id = o.id
         WHERE ua.id = $1 
           AND ua.organization_id = $2
           AND ua.deleted_at IS NULL`,
        [id, organizationId]
      );
      
      return result.rows[0] || null;
    },
    cacheService.TTL.USER_DATA
  );
}

/**
 * Update user data - MUST invalidate cache
 */
static async update(id, data, organizationId) {
  const result = await db.query(
    // ... update query
  );
  
  // CRITICAL: Invalidate cache after update
  await cacheService.invalidateUser(id);
  
  return result.rows[0];
}

/**
 * Increment failed login attempts - MUST invalidate cache
 */
static async incrementFailedLogins(email, organizationId) {
  await db.query(
    `UPDATE hris.user_account
     SET failed_login_attempts = failed_login_attempts + 1,
         last_failed_login = NOW()
     WHERE email = $1 AND organization_id = $2`,
    [email.toLowerCase().trim(), organizationId]
  );
  
  // CRITICAL: Invalidate cache to reflect updated login attempts
  const cacheKey = cacheService.getUserByEmailKey(email, organizationId);
  await cacheService.del(cacheKey);
}

/**
 * Reset failed login attempts - MUST invalidate cache
 */
static async resetFailedLogins(email, organizationId) {
  await db.query(
    `UPDATE hris.user_account
     SET failed_login_attempts = 0,
         last_failed_login = NULL,
         account_locked_until = NULL
     WHERE email = $1 AND organization_id = $2`,
    [email.toLowerCase().trim(), organizationId]
  );
  
  // CRITICAL: Invalidate cache
  const cacheKey = cacheService.getUserByEmailKey(email, organizationId);
  await cacheService.del(cacheKey);
}

/**
 * Update last login - Don't invalidate cache (non-critical data)
 */
static async updateLastLogin(id, organizationId, ipAddress) {
  // Update database without invalidating cache
  // Last login time is not critical for authentication
  await db.query(
    `UPDATE hris.user_account
     SET last_login_at = NOW(),
         last_login_ip = $1
     WHERE id = $2 AND organization_id = $3`,
    [ipAddress, id, organizationId]
  );
  
  // Note: We don't invalidate cache here because:
  // 1. Last login time is not used in authentication decisions
  // 2. Cache will naturally refresh after TTL (5 minutes)
  // 3. Avoids cache churn on every login
}
```

**Priority:** 🔴 CRITICAL  
**Estimated Time:** 4 hours  
**Impact:** Reduces database load on login by 70%

#### Step 2: Update PlatformUser Model

**Apply same caching pattern to `backend/src/models/PlatformUser.js`:**

```javascript
import cacheService from '../services/cacheService.js';

// Add cache key generators
static getPlatformUserCacheKey(id) {
  return `platform:user:${id}`;
}

static getPlatformUserByEmailCacheKey(email) {
  return `platform:user:email:${email}`;
}

// Update findById with caching
static async findById(id) {
  const cacheKey = this.getPlatformUserCacheKey(id);
  
  return cacheService.getOrFetch(
    cacheKey,
    async () => {
      const result = await centralDb.query(
        `SELECT * FROM platform.users 
         WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );
      return result.rows[0] || null;
    },
    cacheService.TTL.USER_DATA
  );
}

// Update findByEmail with caching
static async findByEmail(email) {
  const cacheKey = this.getPlatformUserByEmailCacheKey(email);
  
  return cacheService.getOrFetch(
    cacheKey,
    async () => {
      const result = await centralDb.query(
        `SELECT * FROM platform.users 
         WHERE email = $1 AND deleted_at IS NULL`,
        [email.toLowerCase().trim()]
      );
      return result.rows[0] || null;
    },
    cacheService.TTL.USER_DATA
  );
}

// Add invalidation on updates
static async update(id, data) {
  const result = await centralDb.query(/* update query */);
  
  // Invalidate cache
  await cacheService.del(this.getPlatformUserCacheKey(id));
  
  return result.rows[0];
}
```

**Priority:** 🔴 CRITICAL  
**Estimated Time:** 2 hours

### 2.2 JWT Token Caching

**Add JWT payload template caching to reduce token generation overhead:**

**File: `backend/src/controllers/auth/tenantAuthController.js`**

```javascript
/**
 * Generate access token with cached template
 */
async function generateAccessToken(user) {
  const cacheKey = cacheService.getJWTTemplateKey(user.id, user.organization_id);
  
  // Get or create JWT payload template
  const tokenPayload = await cacheService.getOrFetch(
    cacheKey,
    async () => {
      // Build payload from user data (expensive operations)
      return {
        id: user.id,
        email: user.email,
        organizationId: user.organization_id,
        employeeId: user.employee_id,
        type: 'tenant',
        enabledProducts: user.enabled_products || [],
        productRoles: user.product_roles || {},
        organizationTier: user.organization_tier
      };
    },
    cacheService.TTL.JWT_TEMPLATE // 15 minutes
  );
  
  // Sign token (this is fast)
  const accessToken = jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  return accessToken;
}

// In login handler, replace inline token generation with:
const accessToken = await generateAccessToken(user);
```

**Priority:** 🟡 HIGH  
**Estimated Time:** 2 hours  
**Impact:** Reduces token generation time by 40%

### 2.3 Refresh Token Blacklist

**Add refresh token revocation with Redis:**

**File: `backend/src/controllers/auth/tenantAuthController.js`**

```javascript
/**
 * Logout - Revoke refresh token
 */
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.tenant_refresh_token;
    
    if (refreshToken) {
      // Decode to get token ID
      const decoded = jwt.decode(refreshToken);
      
      if (decoded?.tokenId) {
        // Add to blacklist in Redis (TTL = remaining token lifetime)
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        
        if (expiresIn > 0) {
          const blacklistKey = `token:blacklist:${decoded.tokenId}`;
          await cacheService.set(blacklistKey, true, expiresIn);
          logger.info('Token blacklisted', { tokenId: decoded.tokenId });
        }
      }
      
      // Also delete from database
      await db.query(
        `DELETE FROM hris.tenant_refresh_tokens WHERE token = $1`,
        [refreshToken]
      );
    }
    
    // Clear cookies
    res.clearCookie('tenant_access_token', getTenantAccessCookieConfig());
    res.clearCookie('tenant_refresh_token', getTenantRefreshCookieConfig());
    
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
};

/**
 * Refresh token endpoint - Check blacklist
 */
export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.tenant_refresh_token;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token provided'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if token is blacklisted
    const blacklistKey = `token:blacklist:${decoded.tokenId}`;
    const isBlacklisted = await cacheService.exists(blacklistKey);
    
    if (isBlacklisted) {
      logger.warn('Blacklisted token used', { 
        tokenId: decoded.tokenId,
        userId: decoded.id 
      });
      
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked'
      });
    }
    
    // Token is valid - generate new access token
    const user = await TenantUser.findById(decoded.id, decoded.organizationId);
    
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }
    
    const accessToken = await generateAccessToken(user);
    
    // Set new access token cookie
    res.cookie('tenant_access_token', accessToken, getTenantAccessCookieConfig());
    
    return res.json({
      success: true,
      message: 'Token refreshed'
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
};

/**
 * Revoke all sessions for a user
 */
export const revokeAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organizationId;
    
    // Get all refresh tokens for user
    const result = await db.query(
      `SELECT id FROM hris.tenant_refresh_tokens 
       WHERE user_account_id = $1 AND organization_id = $2`,
      [userId, organizationId]
    );
    
    // Blacklist all tokens
    for (const row of result.rows) {
      const blacklistKey = `token:blacklist:${row.id}`;
      await cacheService.set(blacklistKey, true, 30 * 24 * 60 * 60); // 30 days
    }
    
    // Delete all refresh tokens from database
    await db.query(
      `DELETE FROM hris.tenant_refresh_tokens 
       WHERE user_account_id = $1 AND organization_id = $2`,
      [userId, organizationId]
    );
    
    logger.info('All sessions revoked', { userId, organizationId });
    
    return res.json({
      success: true,
      message: 'All sessions revoked'
    });
  } catch (error) {
    logger.error('Revoke all sessions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to revoke sessions'
    });
  }
};
```

**Priority:** 🟡 HIGH  
**Estimated Time:** 3 hours  
**Impact:** Secure token revocation without database queries

---

## Phase 3: Core Services (Week 3-4)

**Goal:** Cache frequently accessed data in core product services.

### 3.1 Nexus Employee Service Caching

**File: `backend/src/products/nexus/services/employeeService.js`**

```javascript
import cacheService from '../../../services/cacheService.js';

class EmployeeService {
  
  // Cache key generators
  getEmployeeCacheKey(id, organizationId) {
    return `org:${organizationId}:employee:${id}`;
  }
  
  getEmployeeListCacheKey(organizationId, filters = {}) {
    const filterKey = JSON.stringify(filters);
    return `org:${organizationId}:employees:${filterKey}`;
  }
  
  /**
   * Get employee by ID with caching
   */
  async getEmployeeById(id, organizationId) {
    const cacheKey = this.getEmployeeCacheKey(id, organizationId);
    
    return cacheService.getOrFetch(
      cacheKey,
      async () => {
        const sql = `
          SELECT * FROM hris.employee
          WHERE id = $1 
            AND organization_id = $2 
            AND deleted_at IS NULL
        `;
        
        const result = await query(sql, [id, organizationId], organizationId);
        
        if (result.rows.length === 0) {
          throw new Error('Employee not found');
        }
        
        // Transform to API format
        return mapEmployeeDbToApi(result.rows[0]);
      },
      cacheService.TTL.EMPLOYEE_LIST // 5 minutes
    );
  }
  
  /**
   * List employees with caching
   * Use shorter TTL for lists (they change more frequently)
   */
  async listEmployees(organizationId, filters = {}) {
    // Only cache if filters are empty or common
    const shouldCache = Object.keys(filters).length === 0 || 
                       (filters.status === 'active' && Object.keys(filters).length === 1);
    
    if (!shouldCache) {
      // Don't cache complex filters - fetch directly
      return this.fetchEmployeesFromDb(organizationId, filters);
    }
    
    const cacheKey = this.getEmployeeListCacheKey(organizationId, filters);
    
    return cacheService.getOrFetch(
      cacheKey,
      () => this.fetchEmployeesFromDb(organizationId, filters),
      cacheService.TTL.EMPLOYEE_LIST // 5 minutes
    );
  }
  
  async fetchEmployeesFromDb(organizationId, filters) {
    // ... existing database query logic
    const result = await query(sql, params, organizationId);
    return mapEmployeesDbToApi(result.rows);
  }
  
  /**
   * Update employee - MUST invalidate cache
   */
  async updateEmployee(id, data, organizationId, userId) {
    // Update in database
    const updated = await this.performUpdate(id, data, organizationId, userId);
    
    // CRITICAL: Invalidate cache
    const employeeKey = this.getEmployeeCacheKey(id, organizationId);
    await cacheService.del(employeeKey);
    
    // Invalidate list caches (could have many filter combinations)
    const listPattern = `org:${organizationId}:employees:*`;
    await cacheService.del(listPattern);
    
    logger.info('Employee cache invalidated', { id, organizationId });
    
    return updated;
  }
  
  /**
   * Delete employee - MUST invalidate cache
   */
  async deleteEmployee(id, organizationId, userId) {
    await this.performDelete(id, organizationId, userId);
    
    // Invalidate cache
    await cacheService.del(this.getEmployeeCacheKey(id, organizationId));
    await cacheService.del(`org:${organizationId}:employees:*`);
    
    logger.info('Employee deleted and cache invalidated', { id, organizationId });
  }
  
  /**
   * Create employee - Invalidate list cache only
   */
  async createEmployee(data, organizationId, userId) {
    const employee = await this.performCreate(data, organizationId, userId);
    
    // Invalidate list caches (new employee affects lists)
    await cacheService.del(`org:${organizationId}:employees:*`);
    
    return employee;
  }
}
```

**Priority:** 🟡 HIGH  
**Estimated Time:** 6 hours  
**Impact:** 60% reduction in database queries for employee data

### 3.2 Department & Location Caching

**These are reference data that rarely changes - perfect for caching!**

**File: `backend/src/products/nexus/services/departmentService.js`**

```javascript
class DepartmentService {
  
  /**
   * List departments with caching
   * Departments rarely change - cache for 1 hour
   */
  async listDepartments(organizationId, filters = {}) {
    const cacheKey = cacheService.getDepartmentsKey(organizationId, filters);
    
    return cacheService.getOrFetch(
      cacheKey,
      async () => {
        const sql = `
          SELECT * FROM hris.department
          WHERE organization_id = $1 AND deleted_at IS NULL
          ORDER BY name ASC
        `;
        
        const result = await query(sql, [organizationId], organizationId);
        return result.rows;
      },
      cacheService.TTL.DEPARTMENTS // 1 hour - departments change infrequently
    );
  }
  
  /**
   * Update department - invalidate organization cache
   */
  async updateDepartment(id, data, organizationId, userId) {
    const updated = await this.performUpdate(id, data, organizationId, userId);
    
    // Invalidate ALL department caches for this organization
    await cacheService.invalidateOrganization(organizationId);
    
    return updated;
  }
}
```

**Same pattern for LocationService:**

```javascript
class LocationService {
  async listLocations(organizationId, filters = {}) {
    const cacheKey = cacheService.getLocationsKey(organizationId, filters);
    
    return cacheService.getOrFetch(
      cacheKey,
      async () => {
        // ... fetch from database
      },
      cacheService.TTL.LOCATIONS // 1 hour
    );
  }
}
```

**Priority:** 🟢 MEDIUM  
**Estimated Time:** 4 hours  
**Impact:** 80% cache hit rate (departments/locations rarely change)

---

## Deliverables for Phase 2-3

- [ ] TenantUser model with caching
- [ ] PlatformUser model with caching
- [ ] JWT token generation with caching
- [ ] Refresh token blacklist implementation
- [ ] Employee service with caching
- [ ] Department service with caching
- [ ] Location service with caching
- [ ] Cache invalidation on all updates
- [ ] Unit tests for all cached methods
- [ ] Integration tests for authentication flow

**Total Estimated Time:** 21-25 hours (3-4 days)  
**Success Criteria:**
- Authentication tests passing
- Cache hit rate > 60% on user lookups
- Database query count reduced by 60-70%
- All update operations invalidate cache correctly

---

*Continue to Phase 4 in next section...*
