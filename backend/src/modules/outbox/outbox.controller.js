import { outboxService } from './outbox.service.js';

export const outboxController = {
  async getPendingCount(req, res, next) {
    try {
      const count = await outboxService.getPendingCount(req.user.storeId);
      res.status(200).json({ success: true, data: { count } });
    } catch (err) {
      next(err);
    }
  },

  async listMessages(req, res, next) {
    try {
      const messages = await outboxService.listMessages(req.user.storeId, req.query);
      res.status(200).json({ success: true, data: messages });
    } catch (err) {
      next(err);
    }
  },

  async markSent(req, res, next) {
    try {
      const dispatchMethod = req.body.dispatchMethod || 'MANUAL_WA_ME';
      const updated = await outboxService.markSent(
        req.user.storeId,
        req.params.messageId,
        req.user.id,
        dispatchMethod
      );
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  async dismiss(req, res, next) {
    try {
      const updated = await outboxService.dismiss(
        req.user.storeId,
        req.params.messageId,
        req.user.id
      );
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  async dispatchCloud(req, res, next) {
    try {
      const result = await outboxService.dispatchViaCloud(
        req.user.storeId,
        req.params.messageId,
        req.user.id
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async dispatchAllCloud(req, res, next) {
    try {
      const summary = await outboxService.dispatchAllPendingCloud(
        req.user.storeId,
        req.user.id
      );
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  },

  async getConfig(req, res, next) {
    try {
      const config = await outboxService.getStoreConfig(req.user.storeId);
      res.status(200).json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  },

  async updateConfig(req, res, next) {
    try {
      const config = await outboxService.updateStoreConfig(req.user.storeId, req.body);
      res.status(200).json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  },

  async testCloud(req, res, next) {
    try {
      const storeConfig = await outboxService.getStoreConfig(req.user.storeId);
      const testPhone = req.body.phone || req.user.phone || '919876543210';
      const result = await outboxService.dispatchViaCloud(req.user.storeId, null, req.user.id, {
        phone: testPhone,
        message: 'Hello from Optics CRM! Your automated background WhatsApp connection is working successfully.',
      }).catch(async () => {
        const { whatsappService } = await import('../whatsapp/whatsapp.service.js');
        return await whatsappService.sendMessage(req.user.storeId, {
          phone: testPhone,
          message: 'Hello from Optics CRM! Your automated background WhatsApp connection is working successfully.',
          messageType: 'TEST',
        });
      });
      res.status(200).json({ success: true, message: 'Test message dispatched successfully!', data: result });
    } catch (err) {
      next(err);
    }
  }
};
