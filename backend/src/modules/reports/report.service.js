import { reportRepository } from './report.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

export const reportService = {
  async getDailySales(storeId, dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new AppError('Date must be in YYYY-MM-DD format', 400, 'INVALID_DATE_FORMAT');
    }
    return await reportRepository.getDailySalesDetail(storeId, dateStr);
  },

  async getMonthlySales(storeId, year, month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      throw new AppError('Valid year and month (1-12) are required', 400, 'INVALID_MONTH_FORMAT');
    }
    return await reportRepository.getMonthlySales(storeId, y, m);
  },

  async getYearlySales(storeId, year) {
    const y = parseInt(year, 10);
    if (isNaN(y) || y < 2000 || y > 2100) {
      throw new AppError('Valid year (e.g. 2026) is required', 400, 'INVALID_YEAR_FORMAT');
    }
    return await reportRepository.getYearlySales(storeId, y);
  },
};
