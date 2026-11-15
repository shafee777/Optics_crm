import { warrantyRepository } from './warranty.repository.js';
import { customerRepository } from '../customers/customer.repository.js';
import { outboxRepository } from '../outbox/outbox.repository.js';
import { outboxService } from '../outbox/outbox.service.js';
import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

export const warrantyService = {
  async listPlans(storeId, activeOnly = true) {
    return await warrantyRepository.listPlans(storeId, activeOnly);
  },

  async createPlan(storeId, data) {
    if (!data.planCode || !data.name) {
      throw new AppError('Plan code and name are required', 400, 'VALIDATION_ERROR');
    }
    return await warrantyRepository.createPlan(storeId, data);
  },

  async updatePlan(storeId, planId, data) {
    return await warrantyRepository.updatePlan(storeId, planId, data);
  },

  async getCustomerWarranties(storeId, customerId) {
    const customer = await customerRepository.findById(storeId, customerId);
    if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    return await warrantyRepository.getCustomerWarranties(storeId, customerId);
  },

  async processClaim(storeId, warrantyId, claimData, userId) {
    return await withTransaction(async (client) => {
      const result = await warrantyRepository.processClaimTx(client, storeId, warrantyId, claimData, userId);
      const contract = await warrantyRepository.getWarrantyById(storeId, warrantyId, client);

      // Auto-enqueue WhatsApp notification for customer!
      if (contract?.customer_phone) {
        const msg = `Dear ${contract.customer_name}, your warranty claim for "${contract.covered_item_description}" has been successfully processed! Replacement: ${claimData.replacementDescription || 'Approved'}. Remaining claims on plan: ${result.updatedWarranty.claims_remaining}. Thank you for choosing Optics CRM!`;
        const enqueued = await outboxRepository.enqueueMessage(storeId, {
          customerId: contract.customer_id,
          phone: contract.customer_phone,
          customerName: contract.customer_name,
          eventType: 'WARRANTY_CLAIM',
          messageBody: msg,
        }, client);
        if (enqueued?.id) {
          outboxService.autoDispatchMessageIfConfigured(storeId, enqueued.id);
        }
      }

      return result;
    });
  }
};
