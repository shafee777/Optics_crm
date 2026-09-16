import { randomUUID } from 'crypto';

export const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};