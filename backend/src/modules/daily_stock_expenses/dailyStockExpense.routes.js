import { Router } from 'express';
import { dailyStockExpenseController } from './dailyStockExpense.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  createDailyStockExpenseSchema,
  updateDailyStockExpenseSchema,
  updatePaymentSchema,
  dailyStockExpenseIdSchema,
  listDailyStockExpenseSchema,
  companySummarySchema,
} from './dailyStockExpense.schema.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createDailyStockExpenseSchema), dailyStockExpenseController.create);
router.get('/', validate(listDailyStockExpenseSchema), dailyStockExpenseController.list);
router.get('/company-summary', validate(companySummarySchema), dailyStockExpenseController.getCompanySummary);
router.get('/companies', dailyStockExpenseController.getDistinctCompanies);
router.get('/:id', validate(dailyStockExpenseIdSchema), dailyStockExpenseController.getById);
router.put('/:id', validate(updateDailyStockExpenseSchema), dailyStockExpenseController.update);
router.patch('/:id/payment', validate(updatePaymentSchema), dailyStockExpenseController.updatePayment);
router.delete('/:id', validate(dailyStockExpenseIdSchema), dailyStockExpenseController.delete);

export default router;
