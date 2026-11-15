import { warrantyService } from './warranty.service.js';

export const warrantyController = {
  async listPlans(req, res, next) {
    try {
      const activeOnly = req.query.all !== 'true';
      const plans = await warrantyService.listPlans(req.user.storeId, activeOnly);
      res.status(200).json({ success: true, data: plans });
    } catch (err) {
      next(err);
    }
  },

  async createPlan(req, res, next) {
    try {
      const plan = await warrantyService.createPlan(req.user.storeId, req.body);
      res.status(201).json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  },

  async getCustomerWarranties(req, res, next) {
    try {
      const warranties = await warrantyService.getCustomerWarranties(req.user.storeId, req.params.customerId);
      res.status(200).json({ success: true, data: warranties });
    } catch (err) {
      next(err);
    }
  },

  async processClaim(req, res, next) {
    try {
      const result = await warrantyService.processClaim(
        req.user.storeId,
        req.params.warrantyId,
        req.body,
        req.user.id
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
};
