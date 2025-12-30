import { Router } from 'express';

declare global {
  namespace Express {
    interface Application {
      apiRouter?: Router;
      dynamicProductMiddleware?: any;
    }
    
    interface Request {
      user?: any;
      organizationId?: string;
      requestId?: string;
    }
    
    interface Error {
      status?: number;
    }
  }
}

export {};
