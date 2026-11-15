import { Router } from 'express';
import { loyaltyController } from './loyalty.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRole } from '../../middleware/authorize.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/config', loyaltyController.getStoreConfig);
router.get('/customer/:customerId', loyaltyController.getCustomerProfile);
router.post('/customer/:customerId/adjust', authorizeRole('OWNER'), loyaltyController.adjustPoints);

export default router;
