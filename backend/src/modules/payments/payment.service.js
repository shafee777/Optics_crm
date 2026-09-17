import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/order.repository.js';
import { ORDER_STATUS } from '../orders/order.constants.js';
import { AppError } from '../../shared/errors/AppError.js';

export const paymentService = {
  async recordPayment(storeId, orderId, userId, data) {
    // 1. Fetch order details
    const order = await orderRepository.findByIdWithDetails(storeId, orderId);
    if (!order) {
      throw new AppError('Order not found in this store', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new AppError('Cannot record payment for a cancelled order', 400, 'ORDER_CANCELLED');
    }

    // 2. Insert payment record
    const payment = await paymentRepository.create(storeId, orderId, userId, data);

    // 3. Check if client requested auto mark as DELIVERED
    let updatedOrder = await orderRepository.findByIdWithDetails(storeId, orderId);

    if (data.markDelivered && updatedOrder.status === ORDER_STATUS.READY_FOR_PICKUP) {
      if (updatedOrder.balance_due === 0) {
        await orderRepository.updateStatus(storeId, orderId, ORDER_STATUS.DELIVERED);
        updatedOrder = await orderRepository.findByIdWithDetails(storeId, orderId);
      }
    }

    return {
      payment,
      order: updatedOrder,
    };
  },

  async getPayments(storeId, orderId) {
    const order = await orderRepository.findByIdWithDetails(storeId, orderId);
    if (!order) {
      throw new AppError('Order not found in this store', 404, 'ORDER_NOT_FOUND');
    }
    return await paymentRepository.findByOrderId(storeId, orderId);
  },
};
