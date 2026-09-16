import { customerRepository } from './customer.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

export const customerService = {
  async getNextCode(storeId) {
    return await customerRepository.getNextCustomerCode(storeId);
  },

  async createCustomer(storeId, data) {
    const code = data.customerCode?.trim() || (await customerRepository.getNextCustomerCode(storeId));

    // 1. Check if BOTH Customer ID and Mobile Number match an existing customer
    if (data.phone) {
      const matchBoth = await customerRepository.findByCodeAndPhone(storeId, code, data.phone);
      if (matchBoth) {
        throw new AppError(
          `Duplicate: A customer with ID "${code}" and Mobile "${data.phone}" already exists (${matchBoth.full_name}).`,
          409,
          'DUPLICATE_CUSTOMER'
        );
      }
    }

    // 2. Check if the Customer ID is already taken by someone else
    const codeExists = await customerRepository.findByCode(storeId, code);
    if (codeExists) {
      throw new AppError(
        `Customer ID "${code}" is already assigned to "${codeExists.full_name}". Please use a different ID.`,
        409,
        'CUSTOMER_ID_EXISTS'
      );
    }

    // 3. Check if same Name and Mobile number already exist
    if (data.phone && data.fullName) {
      const namePhoneExists = await customerRepository.findByNameAndPhone(storeId, data.fullName, data.phone);
      if (namePhoneExists) {
        throw new AppError(
          `Duplicate: Customer "${data.fullName}" with mobile "${data.phone}" is already registered (ID: ${namePhoneExists.customer_code}).`,
          409,
          'DUPLICATE_CUSTOMER'
        );
      }
    }

    return await customerRepository.create(storeId, { ...data, customerCode: code });
  },

  async getCustomer(storeId, customerId) {
    const customer = await customerRepository.findById(storeId, customerId);
    if (!customer) {
      throw new AppError('Customer not found in this store', 404, 'CUSTOMER_NOT_FOUND');
    }
    return customer;
  },

  async listCustomers(storeId, queryParams) {
    return await customerRepository.list(storeId, queryParams);
  },

  async updateCustomer(storeId, customerId, data) {
    const customer = await customerRepository.findById(storeId, customerId);
    if (!customer) {
      throw new AppError('Customer not found in this store', 404, 'CUSTOMER_NOT_FOUND');
    }
    return await customerRepository.update(storeId, customerId, data);
  },

  async archiveCustomer(storeId, customerId) {
    const success = await customerRepository.softDelete(storeId, customerId);
    if (!success) {
      throw new AppError('Customer not found or already archived', 404, 'CUSTOMER_NOT_FOUND');
    }
    return { id: customerId, archived: true };
  },
};