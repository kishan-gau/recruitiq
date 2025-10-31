/**
 * Centralized error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err)

  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      error: 'Resource already exists',
      message: 'A record with this value already exists'
    })
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      error: 'Invalid reference',
      message: 'Referenced resource does not exist'
    })
  }

  if (err.code === '22P02') { // Invalid UUID
    return res.status(400).json({
      error: 'Invalid ID format',
      message: 'The provided ID is not valid'
    })
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
      details: err.details
    })
  }

  // Default error
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  })
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
