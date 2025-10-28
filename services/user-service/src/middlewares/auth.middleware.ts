import { Request, Response, NextFunction } from 'express';

import logger from '../config/logger';
import authUtils from '../utils/auth.utils';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = authUtils.verifyAccessToken(token);

    // Attach user info to request
    (req as any).user = decoded;

    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    // ✅ SECURITY FIX: Validate user object was properly set by authenticate middleware
    if (!user) {
      logger.error('Authorization attempted without authentication');
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Validate required user properties exist (prevent spoofing)
    if (!user.id || !user.role || typeof user.id !== 'string' || typeof user.role !== 'string') {
      logger.error('Invalid user object in request', { user });
      res.status(401).json({
        success: false,
        message: 'Invalid authentication data',
      });
      return;
    }

    // Check role authorization
    if (!roles.includes(user.role)) {
      logger.warn('Unauthorized access attempt', {
        userId: user.id,
        userRole: user.role,
        requiredRoles: roles,
      });
      res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions',
      });
      return;
    }

    next();
  };
};
