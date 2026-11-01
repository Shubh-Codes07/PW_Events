import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';

describe('Error Handling Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    req = {
      method: 'GET',
      originalUrl: '/api/events/test',
    };
    res = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('formats operational error with custom status code, code, and message', () => {
    const err = new Error('Invalid token provided');
    err.isOperational = true;
    err.statusCode = 401;
    err.code = 'INVALID_TOKEN';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Invalid token provided',
          code: 'INVALID_TOKEN',
        }),
      }),
    );
  });

  it('sanitizes unexpected non-operational errors and defaults to status 500', () => {
    const err = new Error('Database password leak or raw crash details');
    err.isOperational = false;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'An unexpected error occurred. Please try again.',
          code: 'INTERNAL_ERROR',
        }),
      }),
    );
  });

  it('uses res.statusCode if error does not specify statusCode and res.statusCode != 200', () => {
    res.statusCode = 404;
    const err = new Error('Resource missing');
    err.isOperational = true;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Resource missing',
        }),
      }),
    );
  });

  it('logs errors with status code >= 500 to console.error', () => {
    const err = new Error('Server panic');
    err.statusCode = 503;

    errorHandler(err, req, res, next);

    expect(console.error).toHaveBeenCalledWith(
      '[ERROR] GET /api/events/test:',
      err,
    );
  });

  it('includes detail and stack in development environment', () => {
    const originalEnv = env.NODE_ENV;
    env.NODE_ENV = 'development';

    const err = new Error('Dev debug error');
    err.isOperational = true;
    err.statusCode = 400;

    errorHandler(err, req, res, next);

    const calledJson = res.json.mock.calls[0][0];
    expect(calledJson.error.detail).toBe('Dev debug error');
    expect(calledJson.error.stack).toBeDefined();

    env.NODE_ENV = originalEnv;
  });
});

