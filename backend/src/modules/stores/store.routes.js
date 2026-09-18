import { Router } from 'express';
import { storeController } from './store.controller.js';
import { updateStoreSchema } from './store.schema.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { authorizeRole } from '../../middleware/authorize.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/current', storeController.getCurrentStore);
router.patch('/current', authorizeRole('OWNER'), validate(updateStoreSchema), storeController.updateCurrentStore);

export default router;
