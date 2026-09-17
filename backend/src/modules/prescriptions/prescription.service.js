import { prescriptionRepository } from './prescription.repository.js';
import { customerRepository } from '../customers/customer.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

export const prescriptionService = {
  async addPrescription(storeId, customerId, testedByUserId, data) {
    // 1. Verify customer exists and belongs to this store
    const customer = await customerRepository.findById(storeId, customerId);
    if (!customer) {
      throw new AppError('Customer not found in this store', 404, 'CUSTOMER_NOT_FOUND');
    }

    // 2. Insert immutable prescription row
    return await prescriptionRepository.create(storeId, customerId, testedByUserId, data);
  },

  async getPrescriptionsByCustomer(storeId, customerId) {
    // Verify customer exists in store
    const customer = await customerRepository.findById(storeId, customerId);
    if (!customer) {
      throw new AppError('Customer not found in this store', 404, 'CUSTOMER_NOT_FOUND');
    }

    return await prescriptionRepository.findByCustomerId(storeId, customerId);
  },
};