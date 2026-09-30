import { Router } from 'express';
import { reportController } from './report.controller.js';
import {
  salesReportSchema,
  customRangeReportSchema,
  topProductsReportSchema,
} from './report.schema.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { authorizeRole } from '../../middleware/authorize.middleware.js';

const router = Router();

router.use(authMiddleware);

// Only OWNER can view business turnover and sales reports
router.get('/sales', authorizeRole('OWNER'), validate(salesReportSchema), reportController.getSales);
router.get('/custom-range', authorizeRole('OWNER'), validate(customRangeReportSchema), reportController.getCustomRange);
router.get('/outstanding-dues', authorizeRole('OWNER'), reportController.getOutstandingDues);
router.get('/top-products', authorizeRole('OWNER'), validate(topProductsReportSchema), reportController.getTopSellingProducts);

export default router;
