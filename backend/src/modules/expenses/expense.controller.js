import { expenseService } from './expense.service.js';

export const expenseController = {
  async create(req, res, next) {
    try {
      const expense = await expenseService.recordExpense(req.user.storeId, req.user.userId, req.body);
      res.status(201).json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const result = await expenseService.listExpenses(req.user.storeId, req.query);
      res.status(200).json({
        success: true,
        data: result.expenses,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  },

  async getSummary(req, res, next) {
    try {
      const summary = await expenseService.getFinanceSummary(req.user.storeId);
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  },
};
