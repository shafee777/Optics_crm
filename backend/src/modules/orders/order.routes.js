import { Router } from 'express';
import { orderController } from './order.controller.js';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  listOrdersSchema,
  orderIdSchema,
} from './order.schema.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createOrderSchema), orderController.create);
router.get('/', validate(listOrdersSchema), orderController.list);
router.get('/:id', validate(orderIdSchema), orderController.getById);
router.patch('/:id/status', validate(updateOrderStatusSchema), orderController.updateStatus);

export default router;
