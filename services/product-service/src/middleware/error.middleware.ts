import { Request, Response, NextFunction } from 'express';

import { logger } from '../utils/logger.utils';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation Error',
      message: err.message,
    });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token',
    });
    return;
  }

  if (err.code === '23505') {
    // PostgreSQL unique violation
    res.status(409).json({
      error: 'Conflict',
      message: 'A record with this value already exists',
    });
    return;
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    res.status(400).json({
      error: 'Bad Request',
      message: 'Referenced record does not exist',
    });
    return;
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
  });
};
