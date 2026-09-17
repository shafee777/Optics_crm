import { Router } from 'express';
import { expenseController } from './expense.controller.js';
import { createExpenseSchema, listExpensesSchema } from './expense.schema.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { authorizeRole } from '../../middleware/authorize.middleware.js';
import { sensitiveActionLimiter } from '../../middleware/rateLimit.middleware.js';

const router = Router();

router.use(authMiddleware);

// Only OWNER can view total sales/expense cash summary
router.get('/summary', authorizeRole('OWNER'), expenseController.getSummary);

// Both OWNER and STAFF can list and create store expenses (e.g. tea, courier, lab fees)
router.get('/', validate(listExpensesSchema), expenseController.list);
router.post('/', sensitiveActionLimiter, validate(createExpenseSchema), expenseController.create);

export default router;
