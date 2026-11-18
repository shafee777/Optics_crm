import { dailyStockExpenseService } from './dailyStockExpense.service.js';

export const dailyStockExpenseController = {
  async create(req, res, next) {
    try {
      const data = await dailyStockExpenseService.create(req.user.storeId, req.body);
      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await dailyStockExpenseService.getById(req.user.storeId, req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = await dailyStockExpenseService.update(req.user.storeId, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async updatePayment(req, res, next) {
    try {
      const data = await dailyStockExpenseService.updatePayment(req.user.storeId, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await dailyStockExpenseService.delete(req.user.storeId, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Daily stock expense deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const result = await dailyStockExpenseService.list(req.user.storeId, req.query);
      res.status(200).json({
        success: true,
        data: result.expenses,
        summary: result.summary,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  },

  async getCompanySummary(req, res, next) {
    try {
      const data = await dailyStockExpenseService.getCompanySummary(req.user.storeId, req.query);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async getDistinctCompanies(req, res, next) {
    try {
      const data = await dailyStockExpenseService.getDistinctCompanies(req.user.storeId, req.query.category);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};
