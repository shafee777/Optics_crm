import { supplierRepository } from './supplier.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

export const supplierService = {
  async createSupplier(storeId, data) {
    return await supplierRepository.create(storeId, data);
  },

  async getSuppliers(storeId, options) {
    return await supplierRepository.findAll(storeId, options);
  },

  async getSupplierById(storeId, id) {
    const supplier = await supplierRepository.findById(storeId, id);
    if (!supplier) {
      throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
    }
    return supplier;
  },

  async updateSupplier(storeId, id, data) {
    await this.getSupplierById(storeId, id);
    return await supplierRepository.update(storeId, id, data);
  },

  async deleteSupplier(storeId, id) {
    await this.getSupplierById(storeId, id);
    return await supplierRepository.archive(storeId, id);
  },

  async getDuesSummary(storeId) {
    return await supplierRepository.getSupplierDuesSummary(storeId);
  },
};