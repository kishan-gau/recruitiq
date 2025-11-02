const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Authentication middleware
 * Validates JWT token or API key
 */
function authenticate(req, res, next) {
  // Skip auth if disabled
  if (!config.security.requireAuth) {
    return next();
  }

  // Check for API key (for service-to-service calls)
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === config.licenseManager.apiKey) {
    req.authenticated = true;
    req.authType = 'api-key';
    return next();
  }

  // Check for JWT token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.security.jwtSecret);
    req.user = decoded;
    req.authenticated = true;
    req.authType = 'jwt';
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }
  next();
}

module.exports = {
  authenticate,
  requireAdmin,
};
