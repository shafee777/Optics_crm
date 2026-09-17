import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/today', dashboardController.getToday);

export default router;
