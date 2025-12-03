/**
 * Error handling middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // TransIP API errors
  if (err.response && err.response.data) {
    return res.status(err.response.status || 500).json({
      success: false,
      error: err.response.data.error || 'TransIP API error',
      details: err.response.data,
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
}

export default {
  errorHandler,
  notFoundHandler,
};
