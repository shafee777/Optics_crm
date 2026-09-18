import { reportService } from './report.service.js';

export const reportController = {
  async getSales(req, res, next) {
    try {
      const { period, date, month, year } = req.query;
      const storeId = req.user.storeId;

      let result;
      if (period === 'day' || date) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        result = await reportService.getDailySales(storeId, targetDate);
      } else if (period === 'month' || month) {
        let y, m;
        if (month && month.includes('-')) {
          [y, m] = month.split('-');
        } else {
          const now = new Date();
          y = year || now.getFullYear();
          m = month || (now.getMonth() + 1);
        }
        result = await reportService.getMonthlySales(storeId, y, m);
      } else {
        // Default to yearly
        const targetYear = year || new Date().getFullYear();
        result = await reportService.getYearlySales(storeId, targetYear);
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getCustomRange(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const result = await reportService.getCustomRangeSales(
        req.user.storeId,
        startDate,
        endDate
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getOutstandingDues(req, res, next) {
    try {
      const result = await reportService.getOutstandingDues(req.user.storeId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getTopSellingProducts(req, res, next) {
    try {
      const limit = req.query.limit || 10;
      const result = await reportService.getTopSellingProducts(req.user.storeId, limit);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
