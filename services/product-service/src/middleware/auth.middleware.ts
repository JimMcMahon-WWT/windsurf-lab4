import { Request, Response, NextFunction } from 'express';

import { logger } from '../utils/logger.utils';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication middleware (placeholder)
 * TODO: Integrate with User Service for JWT verification
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // In development mode, bypass authentication
    if (process.env.NODE_ENV === 'development') {
      req.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'dev@example.com',
        role: 'admin', // Admin role for testing
      };
      next();
      return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
      return;
    }

    // TODO: Verify JWT token with User Service
    // In production, call User Service to verify token
    // const token = authHeader.substring(7);

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication token',
    });
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // TODO: Verify JWT token
      // const token = authHeader.substring(7);
      
      // For development
      if (process.env.NODE_ENV === 'development') {
        req.user = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'dev@example.com',
          role: 'customer',
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Role-based authorization
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};
