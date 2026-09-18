import { storeService } from './store.service.js';

export const storeController = {
  async getCurrentStore(req, res, next) {
    try {
      const store = await storeService.getStore(req.user.storeId);
      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateCurrentStore(req, res, next) {
    try {
      const updated = await storeService.updateStore(req.user.storeId, req.body);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },
};
