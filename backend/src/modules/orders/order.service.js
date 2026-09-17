import { orderRepository } from './order.repository.js';
import { customerRepository } from '../customers/customer.repository.js';
import { prescriptionRepository } from '../prescriptions/prescription.repository.js';
import { ALLOWED_TRANSITIONS, ORDER_STATUS } from './order.constants.js';
import { AppError } from '../../shared/errors/AppError.js';

export const orderService = {
  async createOrder(storeId, userId, data) {
    // 1. Verify customer exists and belongs to this store
    const customer = await customerRepository.findById(storeId, data.customerId);
    if (!customer) {
      throw new AppError('Customer not found in this store', 404, 'CUSTOMER_NOT_FOUND');
    }

    // 2. If prescriptionId provided, verify it exists and belongs to this store and customer
    if (data.prescriptionId) {
      const prescription = await prescriptionRepository.findById(storeId, data.customerId, data.prescriptionId);
      if (!prescription) {
        throw new AppError('Prescription not found for this customer', 404, 'PRESCRIPTION_NOT_FOUND');
      }
    }

    return await orderRepository.createTransactional(storeId, userId, data);
  },

  async getOrder(storeId, orderId) {
    const order = await orderRepository.findByIdWithDetails(storeId, orderId);
    if (!order) {
      throw new AppError('Order not found in this store', 404, 'ORDER_NOT_FOUND');
    }
    return order;
  },

  async listOrders(storeId, queryParams) {
    return await orderRepository.list(storeId, queryParams);
  },

  async transitionStatus(storeId, orderId, nextStatus) {
    // 1. Fetch current order
    const order = await orderRepository.findByIdWithDetails(storeId, orderId);
    if (!order) {
      throw new AppError('Order not found in this store', 404, 'ORDER_NOT_FOUND');
    }

    const currentStatus = order.status;

    // 2. Enforce state machine transitions
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new AppError(
        `Invalid status transition: Cannot change order from "${currentStatus}" to "${nextStatus}". Allowed transitions: [${allowed.join(', ')}]`,
        400,
        'INVALID_STATE_TRANSITION'
      );
    }

    // 3. Enforce financial balance rule before marking as DELIVERED
    if (nextStatus === ORDER_STATUS.DELIVERED && order.balance_due > 0) {
      throw new AppError(
        `Cannot mark order as DELIVERED while there is an outstanding balance of ₹${order.balance_due.toLocaleString()}. Please collect the remaining balance payment first.`,
        400,
        'OUTSTANDING_BALANCE_EXISTS'
      );
    }

    return await orderRepository.updateStatus(storeId, orderId, nextStatus);
  },
};
