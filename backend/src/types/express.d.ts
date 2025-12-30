/**
 * Express type extensions for custom properties
 */
import { Router } from 'express';

// User type - should match your actual user structure
export interface AuthUser {
  id: string;
  organizationId: string;
  email?: string;
  role?: string;
  permissions?: string[];
}

declare global {
  namespace Express {
    interface Application {
      apiRouter?: Router;
      dynamicProductMiddleware?: (req: Request, res: Response, next: NextFunction) => void;
    }
    
    interface Request {
      user?: AuthUser;
      organizationId?: string;
      requestId?: string;
      validatedBody?: Record<string, unknown>;
    }
    
    interface Error {
      status?: number;
      statusCode?: number;
    }
  }
}

export {};
