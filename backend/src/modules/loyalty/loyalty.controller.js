import { loyaltyService } from './loyalty.service.js';

export const loyaltyController = {
  async getCustomerProfile(req, res, next) {
    try {
      const data = await loyaltyService.getCustomerProfile(req.user.storeId, req.params.customerId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async adjustPoints(req, res, next) {
    try {
      const data = await loyaltyService.adjustPoints(
        req.user.storeId,
        req.params.customerId,
        req.body,
        req.user.id
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getStoreConfig(req, res, next) {
    try {
      const data = await loyaltyService.getStoreConfig(req.user.storeId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateStoreConfig(req, res, next) {
    try {
      const data = await loyaltyService.updateStoreConfig(req.user.storeId, req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
};
