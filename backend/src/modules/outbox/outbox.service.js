import { outboxRepository } from './outbox.repository.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';
import { AppError } from '../../shared/errors/AppError.js';
import { logger } from '../../config/logger.js';

export const outboxService = {
  async getPendingCount(storeId) {
    return await outboxRepository.getPendingCount(storeId);
  },

  async listMessages(storeId, filters) {
    return await outboxRepository.listMessages(storeId, filters);
  },

  async markSent(storeId, messageId, userId, dispatchMethod = 'MANUAL_WA_ME') {
    return await outboxRepository.markSent(storeId, messageId, userId, dispatchMethod);
  },

  async dismiss(storeId, messageId, userId) {
    return await outboxRepository.dismiss(storeId, messageId, userId);
  },

  async dispatchViaCloud(storeId, messageId, userId) {
    const item = await outboxRepository.getById(storeId, messageId);
    if (!item) throw new AppError('Outbox message not found', 404, 'MESSAGE_NOT_FOUND');
    if (item.status === 'SENT') {
      return { success: true, message: 'Already marked as sent', item };
    }

    try {
      const result = await whatsappService.sendMessage(storeId, {
        phone: item.phone_number,
        message: item.message_body,
        customerId: item.customer_id,
        messageType: item.event_type,
      });

      const updated = await outboxRepository.markSent(storeId, messageId, userId, result.provider || 'META_CLOUD_API');
      return { success: true, item: updated, result };
    } catch (err) {
      await outboxRepository.markFailed(storeId, messageId, err.message);
      throw err;
    }
  },

  async dispatchAllPendingCloud(storeId, userId) {
    const pendingList = await outboxRepository.listMessages(storeId, { status: 'PENDING', limit: 100 });
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const msg of pendingList) {
      try {
        await this.dispatchViaCloud(storeId, msg.id, userId);
        sentCount++;
        // Small delay between calls to respect WhatsApp burst limits
        await new Promise(r => setTimeout(r, 600));
      } catch (err) {
        failedCount++;
        errors.push({ id: msg.id, phone: msg.phone, error: err.message });
      }
    }

    return { total: pendingList.length, sent: sentCount, failed: failedCount, errors };
  },

  async getStoreConfig(storeId) {
    return await whatsappService.getStoreConfig(storeId);
  },

  async updateStoreConfig(storeId, config) {
    return await whatsappService.updateStoreConfig(storeId, config);
  },

  async autoDispatchMessageIfConfigured(storeId, messageId) {
    if (!messageId) return;
    try {
      const config = await this.getStoreConfig(storeId);
      if (config.provider === 'META_CLOUD_API' && config.metaAccessToken && config.metaPhoneNumberId) {
        setImmediate(async () => {
          try {
            await this.dispatchViaCloud(storeId, messageId, null);
          } catch (err) {
            logger.warn({ msgId: messageId, err: err.message }, 'Background auto-dispatch failed');
          }
        });
      }
    } catch {}
  }
};
