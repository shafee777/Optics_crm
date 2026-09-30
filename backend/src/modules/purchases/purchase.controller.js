import { purchaseService } from './purchase.service.js';

export const purchaseController = {
  async create(req, res, next) {
    try {
      const storeId = req.user.storeId;
      const po = await purchaseService.createPurchaseOrder(storeId, req.body);
      res.status(201).json({
        success: true,
        message: 'Purchase order logged and stock inwarded successfully',
        data: po,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAll(req, res, next) {
    try {
      const storeId = req.user.storeId;
      const { supplierId, status, from, to, limit, offset } = req.query;
      const orders = await purchaseService.getPurchaseOrders(storeId, {
        supplierId,
        status,
        from,
        to,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      });
      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const storeId = req.user.storeId;
      const po = await purchaseService.getPurchaseOrderById(storeId, req.params.id);
      res.json({
        success: true,
        data: po,
      });
    } catch (error) {
      next(error);
    }
  },

  async recordPayment(req, res, next) {
    try {
      const storeId = req.user.storeId;
      const payment = await purchaseService.recordPayment(storeId, req.params.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Supplier payment recorded successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },
};