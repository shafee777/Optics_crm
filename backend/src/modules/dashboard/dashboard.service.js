import { dashboardRepository } from './dashboard.repository.js';

export const dashboardService = {
  async getTodayDashboard(storeId, userRole) {
    const summary = await dashboardRepository.getTodaySummary(storeId);

    // Corporate Role Hierarchy Rule:
    // If user is STAFF, hide all financial metrics (sales, expenses, net cash flow, payment split)
    if (userRole === 'STAFF') {
      return {
        todaySales: null,
        todayExpenses: null,
        netCashFlow: null,
        paymentSplit: null,
        counts: summary.counts,
        readyOrders: summary.readyOrders,
        overdueOrders: summary.overdueOrders,
      };
    }

    return summary;
  },
};
