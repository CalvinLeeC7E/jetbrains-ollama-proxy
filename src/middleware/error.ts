import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Interface for API errors
 */
export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

/**
 * Creates an API error with status code
 */
export const createError = (message: string, statusCode: number = 500, details?: any): ApiError => {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  if (details) {
    error.details = details;
  }
  return error;
};

/**
 * Not found middleware - handles 404 errors
 */
export const notFoundMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const error = createError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Error handling middleware
 */
export const errorHandlerMiddleware = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set default status code if not provided
  const statusCode = err.statusCode || 500;

  // Log the error
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel](`${statusCode} - ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    error: err,
    stack: err.stack,
  });

  // Send error response
  res.status(statusCode).json({
    error: {
      message: err.message,
      status: statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      ...(err.details && { details: err.details }),
    },
  });
};

/**
 * Async handler to catch errors in async route handlers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
