import { AppError } from '../shared/errors/AppError.js';

export const authorizeRole = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
    }
    next();
  };
};