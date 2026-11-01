import { env } from '../config/env.js';

/**
 * Centralized Express error-handling middleware.
 * Formats errors consistently, sanitizes responses in production, and prevents leaking sensitive stack traces.
 */
export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  const errorResponse = {
    success: false,
    error: {
      message: err.isOperational ? err.message : 'An unexpected error occurred. Please try again.',
      code: err.code || 'INTERNAL_ERROR',
      ...(env.NODE_ENV === 'development' && {
        detail: err.message,
        stack: err.stack,
      }),
    },
  };

  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json(errorResponse);
}
