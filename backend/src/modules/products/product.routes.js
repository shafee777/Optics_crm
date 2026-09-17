import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { productController } from './product.controller.js';
import { createProductSchema, updateProductSchema, adjustStockSchema } from './product.schema.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createProductSchema), productController.create);
router.get('/', productController.list);
router.get('/:id', productController.getById);
router.put('/:id', validate(updateProductSchema), productController.update);
router.patch('/:id/stock', validate(adjustStockSchema), productController.adjustStock);
router.delete('/:id', productController.delete);

export default router;