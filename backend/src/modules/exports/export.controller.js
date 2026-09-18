import { exportRepository } from './export.repository.js';

function rowsToCsv(rows) {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(',')];

  rows.forEach((row) => {
    const values = headers.map((header) => {
      let val = row[header];
      if (val === null || val === undefined) {
        val = '';
      } else if (val instanceof Date) {
        val = val.toISOString();
      } else {
        val = String(val).replace(/"/g, '""');
      }
      return `"${val}"`;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

export const exportController = {
  async exportCustomers(req, res, next) {
    try {
      const rows = await exportRepository.exportCustomers(req.user.storeId);
      const csv = rowsToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=customers_export_${Date.now()}.csv`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  },

  async exportOrders(req, res, next) {
    try {
      const rows = await exportRepository.exportOrders(req.user.storeId);
      const csv = rowsToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=orders_export_${Date.now()}.csv`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  },

  async exportProducts(req, res, next) {
    try {
      const rows = await exportRepository.exportProducts(req.user.storeId);
      const csv = rowsToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=inventory_export_${Date.now()}.csv`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  },

  async exportExpenses(req, res, next) {
    try {
      const rows = await exportRepository.exportExpenses(req.user.storeId);
      const csv = rowsToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=expenses_export_${Date.now()}.csv`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  },
};
