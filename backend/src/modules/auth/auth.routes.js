import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from './auth.controller.js';
import { loginSchema, refreshSchema, logoutSchema, recoverPasswordSchema, generateRecoveryKeySchema } from './auth.schema.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { authorizeRole } from '../../middleware/authorize.middleware.js';
import { env } from '../../config/env.js';
import { sensitiveActionLimiter } from '../../middleware/rateLimit.middleware.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? env.LOGIN_RATE_LIMIT_MAX : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Please try again in 15 minutes.',
    },
  },
});

const recoverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many recovery attempts. Please try again in 15 minutes.',
    },
  },
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', sensitiveActionLimiter, validate(refreshSchema), authController.refresh);
router.post('/logout', sensitiveActionLimiter, validate(logoutSchema), authController.logout);
router.get('/me', authMiddleware, authController.me);

router.post('/recover-password', recoverLimiter, validate(recoverPasswordSchema), authController.recoverPassword);
router.get('/recovery-key/status', authMiddleware, authorizeRole('OWNER'), authController.getRecoveryKeyStatus);
router.post('/recovery-key/generate', authMiddleware, authorizeRole('OWNER'), sensitiveActionLimiter, validate(generateRecoveryKeySchema), authController.generateRecoveryKey);

export default router;