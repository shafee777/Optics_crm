import { Router } from 'express';
import { outboxController } from './outbox.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/pending-count', outboxController.getPendingCount);
router.get('/config', outboxController.getConfig);
router.put('/config', outboxController.updateConfig);
router.post('/test-cloud', outboxController.testCloud);
router.get('/', outboxController.listMessages);
router.post('/:messageId/sent', outboxController.markSent);
router.post('/:messageId/dismiss', outboxController.dismiss);
router.post('/:messageId/dispatch-cloud', outboxController.dispatchCloud);
router.post('/dispatch-all-cloud', outboxController.dispatchAllCloud);

export default router;
