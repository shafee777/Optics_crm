import { purchaseRepository } from './purchase.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

export const purchaseService = {
  async createPurchaseOrder(storeId, data) {
    return await purchaseRepository.createTransactional(storeId, data);
  },

  async getPurchaseOrders(storeId, options) {
    return await purchaseRepository.findAll(storeId, options);
  },

  async getPurchaseOrderById(storeId, id) {
    const po = await purchaseRepository.findById(storeId, id);
    if (!po) {
      throw new AppError('Purchase order not found', 404);
    }
    return po;
  },

  async recordPayment(storeId, poId, paymentData) {
    return await purchaseRepository.recordPayment(storeId, poId, paymentData);
  },
};