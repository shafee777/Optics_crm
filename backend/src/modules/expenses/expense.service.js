import { expenseRepository } from './expense.repository.js';

export const expenseService = {
  async recordExpense(storeId, userId, data) {
    return await expenseRepository.create(storeId, userId, data);
  },

  async listExpenses(storeId, queryParams) {
    return await expenseRepository.list(storeId, queryParams);
  },

  async getFinanceSummary(storeId) {
    return await expenseRepository.getFinancialLedgerSummary(storeId);
  },
};
