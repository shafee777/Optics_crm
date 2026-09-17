import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  async getToday(req, res, next) {
    try {
      const summary = await dashboardService.getTodayDashboard(req.user.storeId, req.user.role);
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  },
};
