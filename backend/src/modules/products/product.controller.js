import { productService } from './product.service.js';

export const productController = {
  async create(req, res, next) {
    try {
      const product = await productService.create(req.user.storeId, req.body);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const { itemType, search, lowStockOnly, limit, offset } = req.query;
      const products = await productService.list(req.user.storeId, {
        itemType,
        search,
        lowStockOnly: lowStockOnly === 'true',
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });
      res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const product = await productService.getById(req.user.storeId, req.params.id);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const product = await productService.update(req.user.storeId, req.params.id, req.body);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async adjustStock(req, res, next) {
    try {
      const product = await productService.adjustStock(req.user.storeId, req.params.id, req.body.adjustment);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      await productService.archive(req.user.storeId, req.params.id);
      res.json({ success: true, message: 'Product removed from catalog' });
    } catch (err) {
      next(err);
    }
  },
};