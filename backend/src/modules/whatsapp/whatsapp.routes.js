import { Router } from 'express';
import { whatsappController } from './whatsapp.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/config', whatsappController.getConfig);
router.put('/config', whatsappController.updateConfig);
router.post('/send', whatsappController.send);
router.post('/test', whatsappController.testConnection);

export default router;
