import { Router } from 'express';
import { purchaseController } from './purchase.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createPurchaseOrderSchema,
  recordSupplierPaymentSchema,
  purchaseOrderIdSchema,
  listPurchaseOrdersSchema,
} from './purchase.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createPurchaseOrderSchema), purchaseController.create);
router.get('/', validate(listPurchaseOrdersSchema), purchaseController.getAll);
router.get('/:id', validate(purchaseOrderIdSchema), purchaseController.getById);
router.post('/:id/payments', validate(recordSupplierPaymentSchema), purchaseController.recordPayment);

export default router;