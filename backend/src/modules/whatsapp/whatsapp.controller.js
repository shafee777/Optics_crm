import { whatsappService } from './whatsapp.service.js';

export const whatsappController = {
  async getConfig(req, res, next) {
    try {
      const storeId = req.user.storeId || req.user.store_id;
      const config = await whatsappService.getStoreConfig(storeId);
      res.json({
        success: true,
        data: config,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateConfig(req, res, next) {
    try {
      const storeId = req.user.storeId || req.user.store_id;
      const updated = await whatsappService.updateStoreConfig(storeId, req.body);
      res.json({
        success: true,
        data: updated,
        message: 'WhatsApp configuration updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async send(req, res, next) {
    try {
      const storeId = req.user.storeId || req.user.store_id;
      const { phone, message, customerId, messageType } = req.body;
      const result = await whatsappService.sendMessage(storeId, {
        phone,
        message,
        customerId,
        messageType,
      });

      res.json({
        success: true,
        data: result,
        message: 'WhatsApp message dispatched successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async testConnection(req, res, next) {
    try {
      const storeId = req.user.storeId || req.user.store_id;
      const { phone, testConfig } = req.body;
      const result = await whatsappService.testConnection(storeId, {
        phone,
        testConfig,
      });

      res.json({
        success: true,
        data: result,
        message: 'Test message sent successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};
