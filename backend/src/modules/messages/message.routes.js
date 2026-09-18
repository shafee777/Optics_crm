import { Router } from 'express';
import { messageController } from './message.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/log', messageController.logMessage);
router.get('/customer/:customerId', messageController.getCustomerLogs);
router.get('/recent', messageController.getRecentLogs);

export default router;
