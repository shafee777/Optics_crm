import { Router } from 'express';
import { warrantyController } from './warranty.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRole } from '../../middleware/authorize.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/plans', warrantyController.listPlans);
router.post('/plans', authorizeRole('OWNER'), warrantyController.createPlan);
router.get('/customer/:customerId', warrantyController.getCustomerWarranties);
router.post('/:warrantyId/claim', warrantyController.processClaim);

export default router;
