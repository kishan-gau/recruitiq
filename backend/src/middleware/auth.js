import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import pool from '../config/database.js';
import tokenBlacklist from '../services/tokenBlacklist.js';

export const authenticate = async (req, res, next) => {
  try {
    // Get token from cookie first (for SSO), then fall back to Authorization header
    let token = req.cookies?.accessToken;
    
    // If no cookie, check Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'No token provided',
        });
      }
      
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    
    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has been revoked',
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token expired',
        });
      }
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    }
    
    // Check if all user tokens are blacklisted
    const userTokensBlacklisted = await tokenBlacklist.areUserTokensBlacklisted(
      decoded.userId,
      decoded.iat
    );
    if (userTokensBlacklisted) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Session has been invalidated',
      });
    }
    
    // Get user from database with role and permissions
    const userResult = await pool.query(
      `SELECT 
        u.id, u.organization_id, u.email, u.name, u.user_type,
        u.avatar_url, u.email_verified, u.phone, u.mfa_enabled,
        u.role_id, u.legacy_role, u.additional_permissions,
        r.name as role_name, r.display_name as role_display_name, 
        r.role_type, r.level as role_level,
        o.name as organization_name, o.tier as organization_tier, o.subscription_status,
        COALESCE(
          ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
          ARRAY[]::VARCHAR[]
        ) as permissions
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id OR p.id = ANY(u.additional_permissions)
      WHERE u.id = $1 AND u.deleted_at IS NULL
      GROUP BY u.id, r.id, o.id`,
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      });
    }
    
    const user = userResult.rows[0];
    
    // Check if tenant user's organization subscription is active
    if (user.user_type === 'tenant' && user.organization_id) {
      if (user.subscription_status === 'canceled' || user.subscription_status === 'suspended') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Organization subscription is not active',
        });
      }
    }
    
    // Attach user and organization to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      user_type: user.user_type,
      role: user.role_name || user.legacy_role, // Use role name from roles table, fallback to legacy
      role_id: user.role_id,
      role_level: user.role_level,
      role_display_name: user.role_display_name,
      avatarUrl: user.avatar_url,
      phone: user.phone,
      mfa_enabled: user.mfa_enabled,
      permissions: user.permissions || [],
      emailVerified: user.email_verified,
      organization_id: user.organization_id,
      organization_name: user.organization_name,
      organization_tier: user.organization_tier,
      tier: user.organization_tier,
      subscription_status: user.subscription_status
    };
    
    // Set organization context for RLS (only for tenant users)
    if (user.user_type === 'tenant' && user.organization_id) {
      // Set RLS context using parameterized query (SQL injection safe)
      // Using set_config() instead of SET LOCAL for proper parameterization
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user.organization_id)) {
        logger.error('Invalid organization_id format', { userId: user.id });
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid organization context',
        });
      }
      // Use set_config() with parameterized query - fully SQL injection safe
      await pool.query(
        "SELECT set_config('app.current_organization_id', $1, true)",
        [user.organization_id]
      );
    }
    
    // Update last login (async, don't wait)
    pool.query(
      'UPDATE users SET last_login_at = NOW(), last_login_ip = $1 WHERE id = $2',
      [req.ip, user.id]
    ).catch(err => logger.error('Failed to update last login:', err));
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
};

// Middleware to check specific roles
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required roles: ${roles.join(', ')}`,
      });
    }
    
    next();
  };
};

// Middleware to check permissions (OR logic - user needs at least one)
export const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    
    const userPermissions = req.user.permissions || [];
    
    // Check if user has at least one of the required permissions
    const hasPermission = permissions.some(p => userPermissions.includes(p));
    
    if (!hasPermission) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        userEmail: req.user.email,
        userPermissions,
        requiredPermissions: permissions,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required permissions: ${permissions.join(' OR ')}`,
      });
    }
    
    next();
  };
};

// Middleware to check permissions (AND logic - user needs all)
export const requireAllPermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    
    const userPermissions = req.user.permissions || [];
    
    // Check if user has all required permissions
    const hasAllPermissions = permissions.every(p => userPermissions.includes(p));
    
    if (!hasAllPermissions) {
      const missingPermissions = permissions.filter(p => !userPermissions.includes(p));
      
      logger.warn('Permissions denied', {
        userId: req.user.id,
        userEmail: req.user.email,
        missingPermissions,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Missing permissions: ${missingPermissions.join(', ')}`,
      });
    }
    
    next();
  };
};

// Middleware to check if user is platform admin
export const requirePlatformUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
  
  if (req.user.user_type !== 'platform') {
    logger.warn('Platform access denied to tenant user', {
      userId: req.user.id,
      userEmail: req.user.email,
      endpoint: req.originalUrl
    });
    
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied. Platform admin access required.',
    });
  }
  
  next();
};

// Middleware to check if user is tenant user
export const requireTenantUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
  
  if (req.user.user_type !== 'tenant') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied. Tenant user access required.',
    });
  }
  
  next();
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      const userResult = await pool.query(
        `SELECT 
          u.id, u.organization_id, u.email, u.name, u.user_type,
          r.name as role_name, r.level as role_level,
          COALESCE(
            ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
            ARRAY[]::VARCHAR[]
          ) as permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id OR p.id = ANY(u.additional_permissions)
        WHERE u.id = $1 AND u.deleted_at IS NULL
        GROUP BY u.id, r.id`,
        [decoded.userId]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          user_type: user.user_type,
          role: user.role_name,
          role_level: user.role_level,
          organization_id: user.organization_id,
          permissions: user.permissions || []
        };
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
