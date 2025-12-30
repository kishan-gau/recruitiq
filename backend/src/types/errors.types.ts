/**
 * Error type definitions
 */

export interface ApplicationErrorOptions {
  statusCode?: number;
  errorCode?: string;
  details?: Record<string, any>;
}

export class ApplicationError extends Error {
  statusCode: number;
  errorCode: string;
  isOperational: boolean;
  details?: Record<string, any>;

  constructor(
    message: string,
    options: ApplicationErrorOptions = {}
  ) {
    super(message);
    this.statusCode = options.statusCode || 500;
    this.errorCode = options.errorCode || 'INTERNAL_ERROR';
    this.isOperational = true;
    this.details = options.details;
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      details
    });
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string = 'Unauthorized') {
    super(message, {
      statusCode: 401,
      errorCode: 'UNAUTHORIZED'
    });
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string = 'Forbidden') {
    super(message, {
      statusCode: 403,
      errorCode: 'FORBIDDEN'
    });
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Not found') {
    super(message, {
      statusCode: 404,
      errorCode: 'NOT_FOUND'
    });
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string = 'Conflict') {
    super(message, {
      statusCode: 409,
      errorCode: 'CONFLICT'
    });
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 500,
      errorCode: 'DATABASE_ERROR',
      details
    });
  }
}
