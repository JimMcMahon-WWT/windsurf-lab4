import { Request, Response, NextFunction } from 'express';
import authUtils from '../utils/auth.utils';
import logger from '../config/logger';

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
    const decoded = authUtils.verifyToken(token);

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

    if (!user || !roles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions',
      });
      return;
    }

    next();
  };
};
