import { paymentService } from './payment.service.js';

export const paymentController = {
  async recordPayment(req, res, next) {
    try {
      const result = await paymentService.recordPayment(
        req.user.storeId,
        req.params.orderId,
        req.user.userId,
        req.body
      );
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPayments(req, res, next) {
    try {
      const payments = await paymentService.getPayments(req.user.storeId, req.params.orderId);
      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  },
};
