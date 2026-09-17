import { productRepository } from './product.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

export const productService = {
  async create(storeId, data) {
    return productRepository.create({ storeId, ...data });
  },

  async list(storeId, filters) {
    return productRepository.findAll({ storeId, ...filters });
  },

  async getById(storeId, id) {
    const product = await productRepository.findById(storeId, id);
    if (!product) throw new AppError('Product not found', 404);
    return product;
  },

  async update(storeId, id, data) {
    await this.getById(storeId, id);
    return productRepository.update(storeId, id, data);
  },

  async adjustStock(storeId, id, adjustment) {
    await this.getById(storeId, id);
    return productRepository.adjustStock(storeId, id, adjustment);
  },

  async archive(storeId, id) {
    await this.getById(storeId, id);
    return productRepository.archive(storeId, id);
  },
};