import { supplierService } from './supplier.service.js';

export const supplierController = {
  async create(req, res) {
    const storeId = req.user.storeId;
    const supplier = await supplierService.createSupplier(storeId, req.body);
    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    });
  },

  async getAll(req, res) {
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
  },

  async getById(req, res) {
    const storeId = req.user.storeId;
    const supplier = await supplierService.getSupplierById(storeId, req.params.id);
    res.json({
      success: true,
      data: supplier,
    });
  },

  async update(req, res) {
    const storeId = req.user.storeId;
    const updated = await supplierService.updateSupplier(storeId, req.params.id, req.body);
    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: updated,
    });
  },

  async delete(req, res) {
    const storeId = req.user.storeId;
    await supplierService.deleteSupplier(storeId, req.params.id);
    res.json({
      success: true,
      message: 'Supplier deleted successfully',
    });
  },

  async getDues(req, res) {
    const storeId = req.user.storeId;
    const summary = await supplierService.getDuesSummary(storeId);
    res.json({
      success: true,
      data: summary,
    });
  },
};