import jwt from 'jsonwebtoken';
import TenantUser from '../../models/TenantUser.js';
import db from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Tenant Authentication Controller
 * Handles authentication for tenant users (product application users)
 * Uses hris.user_account table
 * Generates JWT tokens with type: 'tenant' and organization_id
 */

/**
 * Login tenant user
 * POST /api/tenant/auth/login
 */
export const login = async (req, res) => {
  try {
    let { email, password, organizationId, rememberMe = false } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // If organizationId not provided, look up by email
    // This supports single-tenant deployments and email-based lookup
    let user;
    if (organizationId) {
      user = await TenantUser.findByEmail(email, organizationId);
    } else {
      // Look up user by email only (for single-tenant or auto-detect)
      user = await TenantUser.findByEmailOnly(email);
      if (user) {
        organizationId = user.organization_id;
      }
    }

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (TenantUser.isAccountLocked(user)) {
      return res.status(403).json({
        error: 'Account is locked due to too many failed login attempts. Please try again later.'
      });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account is inactive. Please contact your administrator.'
      });
    }

    // Verify password
    const isValidPassword = await TenantUser.verifyPassword(user, password);

    if (!isValidPassword) {
      // Increment failed login attempts
      await TenantUser.incrementFailedLogins(email, organizationId);
      
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Set PostgreSQL RLS context for the session
    // Note: SET LOCAL doesn't support parameterized queries, but organizationId is validated UUID
    await db.query(`SET LOCAL app.current_organization_id = '${organizationId}'`);

    // DEBUG: Log what we're putting in the JWT
    console.log('=== JWT TOKEN GENERATION ===');
    console.log('User email:', user.email);
    console.log('User enabled_products:', user.enabled_products);
    console.log('User product_roles:', user.product_roles);
    console.log('Type of enabled_products:', typeof user.enabled_products);
    console.log('Is array?:', Array.isArray(user.enabled_products));

    // Generate access token (short-lived)
    const tokenPayload = {
      id: user.id,
      email: user.email,
      organizationId: user.organization_id,
      employeeId: user.employee_id,
      type: 'tenant', // Critical: identifies this as tenant token
      enabledProducts: user.enabled_products || [],
      productRoles: user.product_roles || {},
      organizationTier: user.organization_tier
    };
    
    console.log('JWT payload:', JSON.stringify(tokenPayload, null, 2));
    
    const accessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // 15 minutes
    );

    // Generate refresh token (long-lived)
    const refreshTokenId = uuidv4();
    const refreshToken = jwt.sign(
      { 
        id: user.id,
        organizationId: user.organization_id,
        tokenId: refreshTokenId,
        type: 'tenant'
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: rememberMe ? '30d' : '7d' }
    );

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    await db.query(
      `INSERT INTO hris.tenant_refresh_tokens 
       (id, user_account_id, organization_id, token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        refreshTokenId,
        user.id,
        user.organization_id,
        refreshToken,
        expiresAt,
        req.ip || req.connection.remoteAddress,
        req.get('user-agent') || null
      ]
    );

    // Update last login
    await TenantUser.updateLastLogin(user.id, user.organization_id, req.ip || req.connection.remoteAddress);

    // SECURITY: Set tokens as httpOnly cookies (industry standard - protects against XSS)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,  // Cannot be accessed via JavaScript (XSS protection)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Allow cross-origin in dev
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/' // Available for all routes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // 30 days or 7 days
      path: '/' // Available for all routes
    });

    // Return success with user info only (tokens are in httpOnly cookies)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        employeeId: user.employee_id,
        firstName: user.first_name,
        lastName: user.last_name,
        employeeNumber: user.employee_number,
        enabledProducts: user.enabled_products,
        productRoles: user.product_roles,
        type: 'tenant'
      }
    });

  } catch (error) {
    console.error('Tenant login error:', error);
    res.status(500).json({
      error: 'An error occurred during login'
    });
  }
};

/**
 * Refresh access token
 * POST /api/tenant/auth/refresh
 */
export const refresh = async (req, res) => {
  try {
    // SECURITY: Read refresh token from httpOnly cookie instead of request body
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token'
      });
    }

    // Verify token type
    if (decoded.type !== 'tenant') {
      return res.status(403).json({
        error: 'Invalid token type'
      });
    }

    // Check if refresh token exists in database and is not revoked
    const tokenResult = await db.query(
      `SELECT id, user_account_id, organization_id, revoked_at 
       FROM hris.tenant_refresh_tokens 
       WHERE id = $1 AND token = $2`,
      [decoded.tokenId, refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Refresh token not found'
      });
    }

    const tokenRecord = tokenResult.rows[0];

    if (tokenRecord.revoked_at) {
      return res.status(401).json({
        error: 'Refresh token has been revoked'
      });
    }

    // Set RLS context
    // Note: SET LOCAL doesn't support parameterized queries, but organizationId is from validated JWT
    await db.query(`SET LOCAL app.current_organization_id = '${tokenRecord.organization_id}'`);

    // Get user
    const user = await TenantUser.findById(decoded.id, decoded.organizationId);

    if (!user || !user.is_active) {
      return res.status(403).json({
        error: 'User account is not active'
      });
    }

    // Generate new access token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      organizationId: user.organization_id,
      employeeId: user.employee_id,
      type: 'tenant',
      enabledProducts: user.enabled_products || [],
      productRoles: user.product_roles || {},
      organizationTier: user.organization_tier
    };
    
    console.log('[REFRESH] Generating new access token with payload:', JSON.stringify(tokenPayload, null, 2));
    
    const accessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // SECURITY: Set new access token as httpOnly cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/' // Available for all routes
    });

    res.json({
      success: true
    });

  } catch (error) {
    console.error('Tenant token refresh error:', error);
    res.status(500).json({
      error: 'An error occurred during token refresh'
    });
  }
};

/**
 * Logout tenant user
 * POST /api/tenant/auth/logout
 */
export const logout = async (req, res) => {
  try {
    // SECURITY: Read refresh token from httpOnly cookie
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Revoke the refresh token
      await db.query(
        `UPDATE hris.tenant_refresh_tokens 
         SET revoked_at = NOW() 
         WHERE token = $1`,
        [refreshToken]
      );
    }

    // SECURITY: Clear httpOnly cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Tenant logout error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during logout'
    });
  }
};

/**
 * Get current tenant user profile
 * GET /api/tenant/auth/me
 */
export const getProfile = async (req, res) => {
  try {
    // User is already attached to req by authentication middleware
    const user = await TenantUser.findById(req.user.id, req.user.organizationId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        employeeId: user.employee_id,
        firstName: user.first_name,
        lastName: user.last_name,
        employeeNumber: user.employee_number,
        enabledProducts: user.enabled_products,
        productRoles: user.product_roles,
        preferences: user.preferences,
        emailVerified: user.email_verified,
        mfaEnabled: user.mfa_enabled,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        type: 'tenant'
      }
    });

  } catch (error) {
    console.error('Get tenant profile error:', error);
    res.status(500).json({
      error: 'An error occurred while fetching profile'
    });
  }
};

/**
 * Revoke all refresh tokens for a user (force logout all sessions)
 * POST /api/tenant/auth/revoke-all-sessions
 */
export const revokeAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organizationId;

    await db.query(
      `UPDATE hris.tenant_refresh_tokens 
       SET revoked_at = NOW() 
       WHERE user_account_id = $1 
         AND organization_id = $2 
         AND revoked_at IS NULL`,
      [userId, organizationId]
    );

    res.json({
      success: true,
      message: 'All sessions revoked successfully'
    });

  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while revoking sessions'
    });
  }
};

/**
 * Switch product context
 * POST /api/tenant/auth/switch-product
 * Generates a new token with updated product context
 */
export const switchProduct = async (req, res) => {
  try {
    const { product } = req.body;
    const userId = req.user.id;
    const organizationId = req.user.organizationId;

    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Product is required'
      });
    }

    // Get user to verify product access
    const user = await TenantUser.findById(userId, organizationId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has access to the product
    if (!TenantUser.hasProductAccess(user, product)) {
      return res.status(403).json({
        success: false,
        message: `You do not have access to ${product}`
      });
    }

    // Generate new access token with product context
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        organizationId: user.organization_id,
        employeeId: user.employee_id,
        type: 'tenant',
        enabledProducts: user.enabled_products || [],
        productRoles: user.product_roles || {},
        currentProduct: product, // Set active product
        organizationTier: user.organization_tier
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      data: {
        accessToken,
        product,
        role: TenantUser.getProductRole(user, product)
      }
    });

  } catch (error) {
    console.error('Switch product error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while switching products'
    });
  }
};
