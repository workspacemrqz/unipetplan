import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      userIP?: string;
      userAgent?: string;
      validatedBody?: any;
    }
  }
}

export {};
