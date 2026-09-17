import { customerService } from './customer.service.js';
import { customerRepository } from './customer.repository.js';

export const customerController = {
  async getNextCode(req, res, next) {
    try {
      const nextCode = await customerService.getNextCode(req.user.storeId);
      res.status(200).json({
        success: true,
        data: { nextCode },
      });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const customer = await customerService.createCustomer(req.user.storeId, req.body);
      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const result = await customerService.listCustomers(req.user.storeId, req.query);
      res.status(200).json({
        success: true,
        data: result.customers,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const customer = await customerService.getCustomer(req.user.storeId, req.params.id);
      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const customer = await customerService.updateCustomer(req.user.storeId, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  },

  async archive(req, res, next) {
    try {
      const result = await customerService.archiveCustomer(req.user.storeId, req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
  // Add inside customerController in backend/src/modules/customers/customer.controller.js:
  async getDueReminders(req, res, next) {
    try {
      const dueCustomers = await customerRepository.findDueForAnnualCheckup(req.user.storeId);
      res.json({ success: true, data: dueCustomers });
    } catch (err) {
      next(err);
    }
  },
};