import { orderService } from './order.service.js';

export const orderController = {
  async create(req, res, next) {
    try {
      const order = await orderService.createOrder(req.user.storeId, req.user.userId, req.body);
      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const result = await orderService.listOrders(req.user.storeId, req.query);
      res.status(200).json({
        success: true,
        data: result.orders,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const order = await orderService.getOrder(req.user.storeId, req.params.id);
      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const order = await orderService.transitionStatus(req.user.storeId, req.params.id, req.body.status);
      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },
};
