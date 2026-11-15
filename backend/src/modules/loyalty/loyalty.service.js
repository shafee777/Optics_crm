import { loyaltyRepository } from './loyalty.repository.js';
import { customerRepository } from '../customers/customer.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

export const loyaltyService = {
  async getCustomerProfile(storeId, customerId) {
    const customer = await customerRepository.findById(storeId, customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }
    return await loyaltyRepository.getCustomerProfile(storeId, customerId);
  },

  async adjustPoints(storeId, customerId, { delta, notes }, userId) {
    const customer = await customerRepository.findById(storeId, customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }
    const pointsDelta = parseInt(delta, 10);
    if (isNaN(pointsDelta)) {
      throw new AppError('Invalid points delta', 400, 'INVALID_DELTA');
    }
    return await loyaltyRepository.manualAdjustment(storeId, customerId, pointsDelta, notes, userId);
  },

  async getStoreConfig(storeId) {
    return await loyaltyRepository.getStoreConfig(storeId);
  },

  async updateStoreConfig(storeId, configData) {
    return await loyaltyRepository.updateStoreConfig(storeId, configData);
  }
};
