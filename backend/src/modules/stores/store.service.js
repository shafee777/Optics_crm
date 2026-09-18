import { storeRepository } from './store.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

export const storeService = {
  async getStore(storeId) {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404, 'STORE_NOT_FOUND');
    }
    return {
      id: store.id,
      name: store.name,
      phone: store.phone,
      address: store.address,
      googleReviewLink: store.google_review_link,
      currency: store.currency,
      timezone: store.timezone,
      createdAt: store.created_at,
      updatedAt: store.updated_at,
    };
  },

  async updateStore(storeId, updateData) {
    const existing = await storeRepository.findById(storeId);
    if (!existing) {
      throw new AppError('Store not found', 404, 'STORE_NOT_FOUND');
    }

    const updated = await storeRepository.update(storeId, updateData);
    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      address: updated.address,
      googleReviewLink: updated.google_review_link,
      currency: updated.currency,
      timezone: updated.timezone,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  },
};
