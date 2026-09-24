import { query } from '../../config/database.js';
import { z } from 'zod';
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { productController } from './product.controller.js';
import { createProductSchema, updateProductSchema, adjustStockSchema } from './product.schema.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createProductSchema), productController.create);
router.get('/', productController.list);
router.get('/:id/movements', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM inventory_movements WHERE store_id = $1 AND product_id = $2 ORDER BY id DESC LIMIT 200', [req.user.storeId, req.params.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
});
router.get('/:id', productController.getById);
router.put('/:id', validate(updateProductSchema), productController.update);
router.patch('/:id/stock', validate(adjustStockSchema), productController.adjustStock);
router.delete('/:id', productController.delete);

export default router;