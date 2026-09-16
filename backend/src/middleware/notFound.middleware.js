import { AppError } from '../shared/errors/AppError.js';

export const notFoundMiddleware = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
};