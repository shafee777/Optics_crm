import { Router } from 'express';
import { prescriptionController } from './prescription.controller.js';
import {
  createPrescriptionSchema,
  getPrescriptionsSchema,
} from './prescription.schema.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.post('/', validate(createPrescriptionSchema), prescriptionController.create);
router.get('/', validate(getPrescriptionsSchema), prescriptionController.list);

export default router;