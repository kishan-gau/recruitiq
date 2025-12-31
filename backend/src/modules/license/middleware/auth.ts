import jwt from 'jsonwebtoken'
import AdminUser from '../models/AdminUser.js'

/**
 * Middleware to verify JWT token and authenticate admin users
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Get user from database
    const user = await AdminUser.findById(decoded.userId)
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Attach user to request
    req.user = user
    next()
  } catch (_error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    return res.status(500).json({ error: 'Authentication error' })
  }
}

/**
 * Middleware to check if admin has required role
 * @param {Array} allowedRoles - Array of roles that can access the route
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      })
    }

    next()
  }
}

/**
 * Generate JWT token for admin user
 * @param {Object} user - Admin user object
 * @returns {string} JWT token
 */
export const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}
