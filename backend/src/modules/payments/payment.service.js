import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import { ORDER_STATUS } from '../orders/order.constants.js';
import { AppError } from '../../shared/errors/AppError.js';
import { withTransaction } from '../../config/database.js';

export const paymentService = {
  async recordPayment(storeId, orderId, userId, data) {
    return await withTransaction(async (client) => {
      const order = await orderRepository.findByIdWithDetailsTx(client, storeId, orderId);
      if (!order) {
        throw new AppError('Order not found in this store', 404, 'ORDER_NOT_FOUND');
      }

      if (order.status === ORDER_STATUS.CANCELLED) {
        throw new AppError('Cannot record payment for a cancelled order', 400, 'ORDER_CANCELLED');
      }

      const paymentAmount = Number(data.amount);
      const remainingBalance = Number(order.balance_due || 0);

      if (paymentAmount > remainingBalance + Number.EPSILON) {
        throw new AppError(
          `Payment amount exceeds remaining balance. Remaining balance: ₹${remainingBalance.toLocaleString()}`,
          400,
          'OVERPAYMENT_NOT_ALLOWED'
        );
      }

      const payment = await paymentRepository.createTx(client, storeId, orderId, userId, data);

      let updatedOrder = await orderRepository.findByIdWithDetailsTx(client, storeId, orderId);

      if (data.markDelivered && updatedOrder.status === ORDER_STATUS.READY_FOR_PICKUP && updatedOrder.balance_due <= Number.EPSILON) {
        await orderRepository.updateStatusTx(client, storeId, orderId, ORDER_STATUS.DELIVERED);
        updatedOrder = await orderRepository.findByIdWithDetailsTx(client, storeId, orderId);
      }

      return {
        payment,
        order: updatedOrder,
      };
    });
  },

  async getPayments(storeId, orderId) {
    const order = await orderRepository.findByIdWithDetails(storeId, orderId);
    if (!order) {
      throw new AppError('Order not found in this store', 404, 'ORDER_NOT_FOUND');
    }
    return await paymentRepository.findByOrderId(storeId, orderId);
  },
};
