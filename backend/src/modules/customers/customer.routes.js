import { Router } from 'express';
import { customerController } from './customer.controller.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
  customerIdSchema,
} from './customer.schema.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

// Get next available Customer ID for this store
router.get('/next-code', customerController.getNextCode);

router.post('/', validate(createCustomerSchema), customerController.create);
router.get('/', validate(listCustomersSchema), customerController.list);
router.get('/:id', validate(customerIdSchema), customerController.getById);
router.patch('/:id', validate(updateCustomerSchema), customerController.update);
router.delete('/:id', validate(customerIdSchema), customerController.archive);

export default router;