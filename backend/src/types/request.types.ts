/**
 * Express request/response extension types
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser } from './auth.types.ts';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface AuthenticatedResponse extends Response {
  user?: AuthenticatedUser;
}

export type RequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export type ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void;

export type Middleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;
