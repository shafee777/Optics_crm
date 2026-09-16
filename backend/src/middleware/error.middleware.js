import { logger } from '../config/logger.js';
import { AppError } from '../shared/errors/AppError.js';

export const errorMiddleware = (err, req, res, _next) => {
  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const errorCode = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'An unexpected internal server error occurred';

  // Log with request correlation
  logger.error(
    {
      requestId: req.id,
      err: {
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      method: req.method,
      url: req.originalUrl,
      statusCode,
    },
    'Request error caught'
  );

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(process.env.NODE_ENV === 'development' && err.details ? { details: err.details } : {}),
    },
    requestId: req.id,
  });
};