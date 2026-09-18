import { Router } from 'express';
import { reportController } from './report.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { authorizeRole } from '../../middleware/authorize.middleware.js';

const router = Router();

router.use(authMiddleware);

// Only OWNER can view business turnover and sales reports
router.get('/sales', authorizeRole('OWNER'), reportController.getSales);
router.get('/custom-range', authorizeRole('OWNER'), reportController.getCustomRange);
router.get('/outstanding-dues', authorizeRole('OWNER'), reportController.getOutstandingDues);
router.get('/top-products', authorizeRole('OWNER'), reportController.getTopSellingProducts);

export default router;
