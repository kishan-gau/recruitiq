import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import pool from '../config/database.js';
import tokenBlacklist from '../services/tokenBlacklist.js';

export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
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
    
    // Get user from database
    const userResult = await pool.query(
      `SELECT 
        u.id, u.organization_id, u.email, u.name, u.role, 
        u.avatar_url, u.permissions, u.email_verified, u.phone, u.mfa_enabled,
        o.name as organization_name, o.tier as organization_tier, o.subscription_status
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      });
    }
    
    const user = userResult.rows[0];
    
    // Check if organization subscription is active
    if (user.subscription_status === 'canceled' || user.subscription_status === 'suspended') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Organization subscription is not active',
      });
    }
    
    // Attach user and organization to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
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
    
    // Set organization context for RLS
    await pool.query(`SET LOCAL app.current_organization_id = '${user.organization_id}'`);
    
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

// Middleware to check permissions
export const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    
    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some(p => userPermissions.includes(p));
    
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required permissions: ${permissions.join(', ')}`,
      });
    }
    
    next();
  };
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
        'SELECT id, organization_id, email, name, role FROM users WHERE id = $1 AND deleted_at IS NULL',
        [decoded.userId]
      );
      
      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
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
