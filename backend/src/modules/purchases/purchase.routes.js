import { Router } from 'express';
import { purchaseController } from './purchase.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createPurchaseOrderSchema, recordSupplierPaymentSchema } from './purchase.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createPurchaseOrderSchema), purchaseController.create);
router.get('/', purchaseController.getAll);
router.get('/:id', purchaseController.getById);
router.post('/:id/payments', validate(recordSupplierPaymentSchema), purchaseController.recordPayment);

export default router;