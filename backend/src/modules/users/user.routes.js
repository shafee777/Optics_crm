import { Router } from 'express';
import { userController } from './user.controller.js';
import { createUserSchema, updateUserStatusSchema, resetPasswordSchema } from './user.schema.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { authorizeRole } from '../../middleware/authorize.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRole('OWNER'));

router.get('/', userController.listUsers);
router.post('/', validate(createUserSchema), userController.createUser);
router.patch('/:id/status', validate(updateUserStatusSchema), userController.updateStatus);
router.patch('/:id/password', validate(resetPasswordSchema), userController.resetPassword);

export default router;
