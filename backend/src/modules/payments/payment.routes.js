import { Router } from 'express';
import { paymentController } from './payment.controller.js';
import { recordPaymentSchema, getOrderPaymentsSchema } from './payment.schema.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.post('/', validate(recordPaymentSchema), paymentController.recordPayment);
router.get('/', validate(getOrderPaymentsSchema), paymentController.getPayments);

export default router;
