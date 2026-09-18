import { Router } from 'express';
import { exportController } from './export.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { authorizeRole } from '../../middleware/authorize.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRole('OWNER'));

router.get('/customers.csv', exportController.exportCustomers);
router.get('/orders.csv', exportController.exportOrders);
router.get('/inventory.csv', exportController.exportProducts);
router.get('/expenses.csv', exportController.exportExpenses);

export default router;
