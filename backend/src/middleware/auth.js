import jwt from 'jsonwebtoken';
import PlatformUser from '../models/PlatformUser.js';
import TenantUser from '../models/TenantUser.js';
import db from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * New Authentication Middleware
 * Handles both platform and tenant authentication with proper token type enforcement
 * Replaces the old unified authentication system
 */

/**
 * Authenticate Platform User
 * Verifies JWT token with type: 'platform'
 * Attaches platform user to req.user
 */
export const authenticatePlatform = async (req, res, next) => {
  try {
    // SECURITY: Get token from httpOnly cookie instead of Authorization header
    const token = req.cookies.accessToken;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    // CRITICAL: Verify token type is platform
    if (decoded.type !== 'platform') {
      logger.warn('Token type mismatch - expected platform', {
        userId: decoded.id,
        tokenType: decoded.type,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        message: 'Invalid token type. Platform access required.'
      });
    }
    
    // Get platform user from database
    const user = await PlatformUser.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }
    
    // Check if account is locked
    if (PlatformUser.isAccountLocked(user)) {
      return res.status(403).json({
        success: false,
        message: 'Account is locked'
      });
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || [],
      type: 'platform'
    };
    
    next();
  } catch (error) {
    logger.error('Platform authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Authenticate Tenant User
 * Verifies JWT token with type: 'tenant'
 * Attaches tenant user to req.user
 * Sets PostgreSQL RLS context
 */
export const authenticateTenant = async (req, res, next) => {
  try {
    // SECURITY: Get token from httpOnly cookie instead of Authorization header
    const token = req.cookies.accessToken;
    
    // DEBUG: Log cookie debugging info
    logger.debug('authenticateTenant - Cookie debug', {
      hasCookies: !!req.cookies,
      cookieKeys: Object.keys(req.cookies || {}),
      hasAccessToken: !!token,
      rawCookieHeader: req.headers.cookie,
      path: req.path,
      method: req.method
    });
    
    if (!token) {
      logger.warn('authenticateTenant - No token found', {
        cookies: req.cookies,
        rawCookieHeader: req.headers.cookie,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    // CRITICAL: Verify token type is tenant
    if (decoded.type !== 'tenant') {
      logger.warn('Token type mismatch - expected tenant', {
        userId: decoded.id,
        tokenType: decoded.type,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        message: 'Invalid token type. Tenant access required.'
      });
    }
    
    // Verify organization_id is present
    if (!decoded.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: missing organization context'
      });
    }
    
    // Set PostgreSQL RLS context for the session
    await db.query('SELECT set_config($1, $2, true)', [
      'app.current_organization_id',
      decoded.organizationId
    ]);
    
    // Get tenant user from database
    const user = await TenantUser.findById(decoded.id, decoded.organizationId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }
    
    // Check if account is locked
    if (TenantUser.isAccountLocked(user)) {
      return res.status(403).json({
        success: false,
        message: 'Account is locked'
      });
    }
    
    // Check organization subscription status
    const orgResult = await db.query(
      'SELECT subscription_status FROM organizations WHERE id = $1',
      [decoded.organizationId]
    );
    
    if (orgResult.rows.length > 0) {
      const org = orgResult.rows[0];
      if (org.subscription_status === 'canceled' || org.subscription_status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Organization subscription is not active'
        });
      }
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      organizationId: user.organization_id,
      organization_id: user.organization_id, // Add snake_case for requireOrganization middleware
      organizationName: user.organization_name,
      organizationTier: user.organization_tier,
      employeeId: user.employee_id,
      firstName: user.first_name,
      lastName: user.last_name,
      employeeNumber: user.employee_number,
      enabledProducts: user.enabled_products || [],
      productRoles: user.product_roles || {},
      type: 'tenant',
      user_type: 'tenant' // Add for compatibility
    };
    
    // DEBUG: Log what's in req.user
    console.log('=== MIDDLEWARE AUTH CHECK ===');
    console.log('User email:', req.user.email);
    console.log('enabledProducts:', req.user.enabledProducts);
    console.log('Type:', typeof req.user.enabledProducts);
    console.log('Is array?:', Array.isArray(req.user.enabledProducts));
    
    next();
  } catch (error) {
    logger.error('Tenant authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Require Platform Role
 * Must be used AFTER authenticatePlatform
 * Checks if platform user has specific role
 */
export const requirePlatformRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || req.user.type !== 'platform') {
      return res.status(401).json({
        success: false,
        message: 'Platform authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn('Platform role check failed', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Require Platform Permission
 * Must be used AFTER authenticatePlatform
 * Checks if platform user has specific permission
 * OR logic - user needs at least one permission
 */
export const requirePlatformPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user || req.user.type !== 'platform') {
      return res.status(401).json({
        success: false,
        message: 'Platform authentication required'
      });
    }
    
    const userPermissions = req.user.permissions || [];
    
    // Super admins have all permissions
    if (req.user.role === 'super_admin') {
      return next();
    }
    
    // Check if user has at least one required permission
    const hasPermission = permissions.some(p => userPermissions.includes(p));
    
    if (!hasPermission) {
      logger.warn('Platform permission check failed', {
        userId: req.user.id,
        userPermissions,
        requiredPermissions: permissions,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permissions: ${permissions.join(' OR ')}`
      });
    }
    
    next();
  };
};

/**
 * Require Product Access
 * Must be used AFTER authenticateTenant
 * Checks if tenant user has access to specific product
 */
export const requireProductAccess = (product) => {
  return (req, res, next) => {
    if (!req.user || req.user.type !== 'tenant') {
      return res.status(401).json({
        success: false,
        message: 'Tenant authentication required'
      });
    }
    
    const enabledProducts = req.user.enabledProducts || [];
    
    // DEBUG: Log product access check
    console.log('=== PRODUCT ACCESS CHECK ===');
    console.log('Required product:', product);
    console.log('User enabledProducts:', enabledProducts);
    console.log('Type of enabledProducts:', typeof enabledProducts);
    console.log('Is array?:', Array.isArray(enabledProducts));
    console.log('Includes product?:', enabledProducts.includes(product));
    
    if (!enabledProducts.includes(product)) {
      logger.warn('Product access denied', {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        enabledProducts,
        requiredProduct: product,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        message: `Access denied. ${product} access required.`
      });
    }
    
    next();
  };
};

/**
 * Require Product Role
 * Must be used AFTER authenticateTenant and requireProductAccess
 * Checks if tenant user has specific role in a product
 */
export const requireProductRole = (product, ...roles) => {
  return (req, res, next) => {
    if (!req.user || req.user.type !== 'tenant') {
      return res.status(401).json({
        success: false,
        message: 'Tenant authentication required'
      });
    }
    
    const productRoles = req.user.productRoles || {};
    const userRole = productRoles[product];
    
    if (!userRole || !roles.includes(userRole)) {
      logger.warn('Product role check failed', {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        product,
        userRole,
        requiredRoles: roles,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles in ${product}: ${roles.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Backward Compatibility Layer
 * Tries to authenticate with new system, falls back to old if needed
 * This allows gradual migration
 * @deprecated Use authenticatePlatform or authenticateTenant directly
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Decode without verification to check type
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    // Route to appropriate authentication based on token type
    if (decoded.type === 'platform') {
      return authenticatePlatform(req, res, next);
    } else if (decoded.type === 'tenant') {
      return authenticateTenant(req, res, next);
    } else {
      // Old token format - log warning for migration tracking
      logger.warn('Old token format detected - needs migration', {
        userId: decoded.userId,
        endpoint: req.originalUrl
      });
      
      return res.status(401).json({
        success: false,
        message: 'Token format outdated. Please log in again.'
      });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Export backward-compatible aliases
export const requirePlatformUser = authenticatePlatform;
export const requireTenantUser = authenticateTenant;
export const requireRole = requirePlatformRole; // Backward compatibility
export const requirePermission = requirePlatformPermission; // Backward compatibility

/**
 * Optional Authentication
 * Doesn't fail if no token present
 * Sets req.user if valid token provided
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Route based on token type
      if (decoded.type === 'platform') {
        const user = await PlatformUser.findById(decoded.id);
        if (user && user.is_active) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions || [],
            type: 'platform'
          };
        }
      } else if (decoded.type === 'tenant' && decoded.organizationId) {
        await db.query('SELECT set_config($1, $2, true)', [
          'app.current_organization_id',
          decoded.organizationId
        ]);
        
        const user = await TenantUser.findById(decoded.id, decoded.organizationId);
        if (user && user.is_active) {
          req.user = {
            id: user.id,
            email: user.email,
            organizationId: user.organization_id,
            enabledProducts: user.enabled_products || [],
            productRoles: user.product_roles || {},
            type: 'tenant'
          };
        }
      }
    } catch (error) {
      // Invalid token, but continue without user
      logger.debug('Optional auth failed:', error.message);
    }
    
    next();
  } catch (error) {
    logger.error('Optional auth error:', error);
    next(); // Continue even if error
  }
};
