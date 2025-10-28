import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?.id,
  });
  
  // Default error
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  
  // Database errors
  if (err.code === '23505') { // Unique violation
    status = 409;
    message = 'Resource already exists';
  } else if (err.code === '23503') { // Foreign key violation
    status = 400;
    message = 'Referenced resource does not exist';
  } else if (err.code === '23502') { // Not null violation
    status = 400;
    message = 'Required field is missing';
  } else if (err.code && err.code.startsWith('23')) {
    status = 400;
    message = 'Database constraint violation';
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    status = 400;
    message = err.message;
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  }
  
  // Send response
  const response = {
    error: err.name || 'Error',
    message,
  };
  
  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err.details;
  }
  
  res.status(status).json(response);
};

// Custom error classes
export class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

export class ConflictError extends Error {
  constructor(message = 'Resource already exists') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}
