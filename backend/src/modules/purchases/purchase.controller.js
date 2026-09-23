import { purchaseService } from './purchase.service.js';

export const purchaseController = {
  async create(req, res) {
    const storeId = req.user.storeId;
    const po = await purchaseService.createPurchaseOrder(storeId, req.body);
    res.status(201).json({
      success: true,
      message: 'Purchase order logged and stock inwarded successfully',
      data: po,
    });
  },

  async getAll(req, res) {
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
  },

  async getById(req, res) {
    const storeId = req.user.storeId;
    const po = await purchaseService.getPurchaseOrderById(storeId, req.params.id);
    res.json({
      success: true,
      data: po,
    });
  },

  async recordPayment(req, res) {
    const storeId = req.user.storeId;
    const payment = await purchaseService.recordPayment(storeId, req.params.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Supplier payment recorded successfully',
      data: payment,
    });
  },
};