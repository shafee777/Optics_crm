import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 60 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many sensitive actions. Please try again later.',
    },
  },
});