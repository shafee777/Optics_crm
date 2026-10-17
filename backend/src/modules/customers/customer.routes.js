import { Router } from 'express';
import { customerController } from './customer.controller.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
  customerIdSchema,
  bulkTagSchema,
  broadcastWhatsAppSchema,
} from './customer.schema.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { authorizeRole } from '../../middleware/authorize.middleware.js';

const router = Router();

router.use(authMiddleware);

// Get next available Customer ID for this store
router.get('/next-code', customerController.getNextCode);
router.get('/due-reminders', customerController.getDueReminders);

router.post('/bulk-tags', validate(bulkTagSchema), customerController.bulkUpdateTags);
router.post('/broadcast-whatsapp', validate(broadcastWhatsAppSchema), customerController.broadcastWhatsApp);

router.post('/', validate(createCustomerSchema), customerController.create);
router.get('/', validate(listCustomersSchema), customerController.list);

// ─── Admin-only: Recycle Bin ──────────────────────────────────────────────────
// IMPORTANT: These must be registered BEFORE /:id routes to avoid param conflicts.
router.get('/bin/list',               authorizeRole('OWNER'), customerController.listBin);
router.post('/bin/:id/restore',       authorizeRole('OWNER'), validate(customerIdSchema), customerController.restoreFromBin);
router.delete('/bin/:id/permanent',   authorizeRole('OWNER'), validate(customerIdSchema), customerController.permanentDelete);

// ─── Standard CRUD ────────────────────────────────────────────────────────────
router.get('/:id', validate(customerIdSchema), customerController.getById);
router.patch('/:id', validate(updateCustomerSchema), customerController.update);
router.delete('/:id', authorizeRole('OWNER'), validate(customerIdSchema), customerController.archive);

export default router;
