import { storeRepository } from '../stores/store.repository.js';
import { messageRepository } from '../messages/message.repository.js';
import { getWhatsAppProvider } from './whatsapp.provider.js';
import { AppError } from '../../shared/errors/AppError.js';
import { logger } from '../../config/logger.js';

export const whatsappService = {
  async getStoreConfig(storeId) {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404, 'STORE_NOT_FOUND');
    }

    const config = store.whatsapp_config || {
      provider: 'MOCK',
      autoSendOrderCreated: true,
      autoSendOrderReady: true,
      autoSendGoogleReview: false,
      metaPhoneNumberId: '',
      metaAccessToken: '',
      metaWabaId: '',
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioFromPhone: '',
      customWebhookUrl: '',
    };

    return config;
  },

  async updateStoreConfig(storeId, configData) {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404, 'STORE_NOT_FOUND');
    }

    const currentConfig = store.whatsapp_config || {};
    const mergedConfig = {
      ...currentConfig,
      ...configData,
      updatedAt: new Date().toISOString(),
    };

    const updated = await storeRepository.update(storeId, {
      whatsappConfig: mergedConfig,
    });

    return updated.whatsapp_config;
  },

  async sendMessage(storeId, { phone, message, customerId = null, messageType = 'CUSTOM' }) {
    if (!phone) {
      throw new AppError('Customer phone number is required', 400, 'PHONE_REQUIRED');
    }
    if (!message || message.trim() === '') {
      throw new AppError('Message body cannot be empty', 400, 'MESSAGE_EMPTY');
    }

    const store = await storeRepository.findById(storeId);
    const config = store?.whatsapp_config || { provider: 'MOCK' };

    const provider = getWhatsAppProvider(config);

    try {
      const result = await provider.send({
        to: phone,
        message,
        customerId,
        messageType,
      });

      // Log message audit trail in database
      if (customerId) {
        try {
          await messageRepository.logMessage(storeId, customerId, messageType, 'WHATSAPP');
        } catch (logErr) {
          logger.warn(`[WhatsApp Service] Failed to log message in DB: ${logErr.message}`);
        }
      }

      return {
        success: true,
        provider: result.provider,
        messageId: result.messageId,
        phone,
        messageType,
        timestamp: result.timestamp,
        note: result.note,
      };
    } catch (err) {
      logger.error(`[WhatsApp Service] Message send failed for ${phone}: ${err.message}`);
      throw new AppError(`WhatsApp delivery failed: ${err.message}`, 502, 'WHATSAPP_SEND_FAILED');
    }
  },

  async testConnection(storeId, { phone, testConfig = null }) {
    if (!phone) {
      throw new AppError('Test recipient phone number is required', 400, 'PHONE_REQUIRED');
    }

    const store = await storeRepository.findById(storeId);
    const config = testConfig || store?.whatsapp_config || { provider: 'MOCK' };

    const provider = getWhatsAppProvider(config);
    const testMessage = `👓 *Optics CRM Integration Test*\n\nHello! This is a test message confirming your automated WhatsApp messaging integration is working successfully. Sent at: ${new Date().toLocaleTimeString()}`;

    const result = await provider.send({
      to: phone,
      message: testMessage,
      customerId: null,
      messageType: 'INTEGRATION_TEST',
    });

    return {
      success: true,
      provider: result.provider,
      messageId: result.messageId,
      phone,
      message: 'Test message dispatched successfully',
      timestamp: result.timestamp,
    };
  },
};
