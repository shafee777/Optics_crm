import { dailyStockExpenseRepository } from './dailyStockExpense.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

export const dailyStockExpenseService = {
  async create(storeId, data) {
    if (!data.companyName?.trim()) {
      throw new AppError('Company name is required', 400, 'COMPANY_NAME_REQUIRED');
    }
    if (data.totalAmount < 0) {
      throw new AppError('Total amount cannot be negative', 400, 'INVALID_AMOUNT');
    }
    return await dailyStockExpenseRepository.create(storeId, data);
  },

  async getById(storeId, id) {
    const item = await dailyStockExpenseRepository.findById(storeId, id);
    if (!item) {
      throw new AppError('Daily stock expense entry not found', 404, 'NOT_FOUND');
    }
    return item;
  },

  async update(storeId, id, data) {
    const updated = await dailyStockExpenseRepository.update(storeId, id, data);
    if (!updated) {
      throw new AppError('Daily stock expense entry not found', 404, 'NOT_FOUND');
    }
    return updated;
  },

  async updatePayment(storeId, id, paymentData) {
    const updated = await dailyStockExpenseRepository.updatePayment(storeId, id, paymentData);
    if (!updated) {
      throw new AppError('Daily stock expense entry not found', 404, 'NOT_FOUND');
    }
    return updated;
  },

  async delete(storeId, id) {
    const deleted = await dailyStockExpenseRepository.delete(storeId, id);
    if (!deleted) {
      throw new AppError('Daily stock expense entry not found', 404, 'NOT_FOUND');
    }
    return { success: true };
  },

  async list(storeId, filters) {
    return await dailyStockExpenseRepository.list(storeId, filters);
  },

  async getCompanySummary(storeId, filters) {
    return await dailyStockExpenseRepository.getCompanySummary(storeId, filters);
  },

  async getDistinctCompanies(storeId, category) {
    return await dailyStockExpenseRepository.getDistinctCompanies(storeId, category);
  },
};
