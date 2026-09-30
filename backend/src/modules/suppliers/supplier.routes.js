import { Router } from 'express';
import { supplierController } from './supplier.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierIdSchema,
  listSuppliersSchema,
} from './supplier.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createSupplierSchema), supplierController.create);
router.get('/', validate(listSuppliersSchema), supplierController.getAll);
router.get('/dues-summary', supplierController.getDues);
router.get('/:id', validate(supplierIdSchema), supplierController.getById);
router.put('/:id', validate(updateSupplierSchema), supplierController.update);
router.delete('/:id', validate(supplierIdSchema), supplierController.delete);

export default router;