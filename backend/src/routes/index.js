import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import customerRoutes from '../modules/customers/customer.routes.js';
import prescriptionRoutes from '../modules/prescriptions/prescription.routes.js';
import orderRoutes from '../modules/orders/order.routes.js';
import paymentRoutes from '../modules/payments/payment.routes.js';
import expenseRoutes from '../modules/expenses/expense.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import reportRoutes from '../modules/reports/report.routes.js';
import productRoutes from '../modules/products/product.routes.js';
import storeRoutes from '../modules/stores/store.routes.js';
import userRoutes from '../modules/users/user.routes.js';
import messageRoutes from '../modules/messages/message.routes.js';
import exportRoutes from '../modules/exports/export.routes.js';

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
router.use('/api/v1/customers', customerRoutes);
router.use('/api/v1/customers/:customerId/prescriptions', prescriptionRoutes);
router.use('/api/v1/orders', orderRoutes);
router.use('/api/v1/orders/:orderId/payments', paymentRoutes);
router.use('/api/v1/expenses', expenseRoutes);
router.use('/api/v1/dashboard', dashboardRoutes);
router.use('/api/v1/reports', reportRoutes);
router.use('/api/v1/products', productRoutes);
router.use('/api/v1/stores', storeRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/api/v1/messages', messageRoutes);
router.use('/api/v1/exports', exportRoutes);

export default router;