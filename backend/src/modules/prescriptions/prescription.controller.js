import { prescriptionService } from './prescription.service.js';

export const prescriptionController = {
  async create(req, res, next) {
    try {
      const prescription = await prescriptionService.addPrescription(
        req.user.storeId,
        req.params.customerId,
        req.user.userId,
        req.body
      );
      res.status(201).json({
        success: true,
        data: prescription,
      });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const prescriptions = await prescriptionService.getPrescriptionsByCustomer(
        req.user.storeId,
        req.params.customerId
      );
      res.status(200).json({
        success: true,
        data: prescriptions,
      });
    } catch (error) {
      next(error);
    }
  },
};