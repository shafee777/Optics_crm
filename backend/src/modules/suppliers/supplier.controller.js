import { supplierService } from './supplier.service.js';

export const supplierController = {
  async create(req, res, next) {
    try {
      const storeId = req.user.storeId;
      const supplier = await supplierService.createSupplier(storeId, req.body);
      res.status(201).json({
        success: true,
        message: 'Supplier created successfully',
        data: supplier,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAll(req, res, next) {
    try {
      const storeId = req.user.storeId;
      const { category, search, limit, offset } = req.query;
      const suppliers = await supplierService.getSuppliers(storeId, {
        category,
        search,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });
      res.json({
        success: true,
        data: suppliers,
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const storeId = req.user.storeId;
      const supplier = await supplierService.getSupplierById(storeId, req.params.id);
      res.json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const storeId = req.user.storeId;
      const updated = await supplierService.updateSupplier(storeId, req.params.id, req.body);
      res.json({
        success: true,
        message: 'Supplier updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const storeId = req.user.storeId;
      await supplierService.deleteSupplier(storeId, req.params.id);
      res.json({
        success: true,
        message: 'Supplier deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async getDues(req, res, next) {
    try {
      const storeId = req.user.storeId;
      const summary = await supplierService.getDuesSummary(storeId);
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  },
};