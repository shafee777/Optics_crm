import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

// Health routes: /health/live, /health/ready
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

// Future domain modules will be mounted here:
// router.use('/api/v1/auth', authRoutes);
// router.use('/api/v1/customers', customerRoutes);
// router.use('/api/v1/orders', orderRoutes);

export default router;