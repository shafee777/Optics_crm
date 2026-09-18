import { messageRepository } from './message.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

export const messageController = {
  async logMessage(req, res, next) {
    try {
      const { customerId, messageType, channel } = req.body;
      if (!customerId || !messageType) {
        throw new AppError('customerId and messageType are required', 400, 'MISSING_FIELDS');
      }

      const log = await messageRepository.logMessage(
        req.user.storeId,
        customerId,
        messageType,
        channel || 'WHATSAPP'
      );

      res.status(201).json({
        success: true,
        data: log,
      });
    } catch (error) {
      next(error);
    }
  },

  async getCustomerLogs(req, res, next) {
    try {
      const { customerId } = req.params;
      const logs = await messageRepository.findByCustomerId(req.user.storeId, customerId);
      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  },

  async getRecentLogs(req, res, next) {
    try {
      const limit = req.query.limit || 50;
      const logs = await messageRepository.getRecentLogs(req.user.storeId, limit);
      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  },
};
