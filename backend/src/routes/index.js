import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';

const router = Router();

// Health routes
router.use('/health', healthRoutes);

// Base API v1 endpoint
router.get('/api/v1', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Optical Growth CRM API',
      version: '1.0.0',
      status: 'active',
    },
  });
});

// Domain Modules
router.use('/api/v1/auth', authRoutes);

export default router;