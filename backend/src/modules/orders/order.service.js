import { withTransaction } from '../../config/database.js';
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

  async transitionStatus(storeId, orderId, nextStatus, userId = null) {
    return withTransaction(async (client) => {
      await orderRepository.lockOrderTx(client, storeId, orderId);
      const order = await orderRepository.findByIdWithDetailsTx(client, storeId, orderId);
      if (!order) {
        throw new AppError('Order not found in this store', 404, 'ORDER_NOT_FOUND');
      }

      const currentStatus = order.status;

      // 2. Enforce state machine transitions (also guards against duplicate cancellation requests)
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

      // 4. Transactional Stock Restoration and Refund on Cancellation
      if (nextStatus === ORDER_STATUS.CANCELLED) {
        await client.query("SELECT set_config('app.stock_reason', $1, true)", ['CANCEL_ORDER ' + (order.order_number || orderId)]);
        
        // Restore stock deterministically sorted to prevent deadlocks
        for (const item of [...(order.items || [])].sort((a, b) => String(a.product_id).localeCompare(String(b.product_id)))) {
          if (item.product_id && Number(item.quantity) > 0) {
            await client.query(
              'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE store_id = $2 AND id = $3',
              [Number(item.quantity), storeId, item.product_id]
            );
          }
        }

        // Record refund expense if payments were collected
        if (Number(order.total_paid) > 0) {
          const primaryPaymentMethod = order.payments?.[0]?.payment_method || 'CASH';
          await client.query(
            `INSERT INTO expenses (
              store_id, category, amount, payment_method, note, created_by, incurred_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
              storeId,
              'Refund',
              order.total_paid,
              primaryPaymentMethod,
              `Refund for cancelled order ${order.order_number || orderId}`,
              userId || order.created_by || null,
            ]
          );
        }
      }

      await orderRepository.updateStatusTx(client, storeId, orderId, nextStatus);
      return await orderRepository.findByIdWithDetailsTx(client, storeId, orderId);
    });
  },
};
