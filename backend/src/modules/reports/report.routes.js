import { Router } from 'express';
import { reportController } from './report.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { authorizeRole } from '../../middleware/authorize.middleware.js';

const router = Router();

router.use(authMiddleware);

// Only OWNER can view business turnover and sales reports
router.get('/sales', authorizeRole('OWNER'), reportController.getSales);

export default router;
