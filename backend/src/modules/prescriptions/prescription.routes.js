import { Router } from 'express';
import { prescriptionController } from './prescription.controller.js';
import {
  createPrescriptionSchema,
  updatePrescriptionSchema,
  getPrescriptionsSchema,
} from './prescription.schema.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.post('/', validate(createPrescriptionSchema), prescriptionController.create);
router.get('/', validate(getPrescriptionsSchema), prescriptionController.list);
router.patch('/:id', validate(updatePrescriptionSchema), prescriptionController.update);
router.put('/:id', validate(updatePrescriptionSchema), prescriptionController.update);

export default router;