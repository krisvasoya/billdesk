// backend/src/middleware/error-handler.ts
import type { ErrorHandler } from 'hono';
import { AppError } from '../errors/app-error';
import { logger } from '../logger';
import { ZodError } from 'zod';

export const errorHandler: ErrorHandler = (err, c) => {
  // 1. Zod Validation Error formatting
  if (err instanceof ZodError) {
    logger.warn({ errors: err.issues, url: c.req.url }, 'Request validation failed');
    return c.json(
      {
        success: false,
        message: 'Validation failed',
        errors: err.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      400
    );
  }

  // 2. Custom App Errors
  if (err instanceof AppError) {
    logger.warn({ err, url: c.req.url }, 'App Error triggered');
    return c.json(
      {
        success: false,
        message: err.message,
        errors: err.errors,
      },
      err.statusCode as any
    );
  }

  // 3. Centralized Database/Server Errors protection
  logger.error({ err, url: c.req.url }, 'Unhandled Internal Server Error');

  // Avoid leaking database errors or stack traces to end clients
  return c.json(
    {
      success: false,
      message: 'Internal server error occurred',
    },
    500
  );
};
