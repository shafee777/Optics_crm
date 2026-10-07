import { customerRepository } from './customer.repository.js';
import { storeRepository } from '../stores/store.repository.js';
import { messageRepository } from '../messages/message.repository.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';
import { AppError } from '../../shared/errors/AppError.js';


export const customerService = {
  async getNextCode(storeId) {
    return await customerRepository.getNextCustomerCode(storeId);
  },

  async createCustomer(storeId, data) {
    const code = data.customerCode?.trim() || (await customerRepository.getNextCustomerCode(storeId));

    // 1. Check if BOTH Customer ID and Mobile Number match an existing customer
    if (data.phone) {
      const matchBoth = await customerRepository.findByCodeAndPhone(storeId, code, data.phone);
      if (matchBoth) {
        throw new AppError(
          `Duplicate: A customer with ID "${code}" and Mobile "${data.phone}" already exists (${matchBoth.full_name}).`,
          409,
          'DUPLICATE_CUSTOMER'
        );
      }
    }

    // 2. Check if the Customer ID is already taken by someone else
    const codeExists = await customerRepository.findByCode(storeId, code);
    if (codeExists) {
      throw new AppError(
        `Customer ID "${code}" is already assigned to "${codeExists.full_name}". Please use a different ID.`,
        409,
        'CUSTOMER_ID_EXISTS'
      );
    }

    // 3. Check if same Name and Mobile number already exist
    if (data.phone && data.fullName) {
      const namePhoneExists = await customerRepository.findByNameAndPhone(storeId, data.fullName, data.phone);
      if (namePhoneExists) {
        throw new AppError(
          `Duplicate: Customer "${data.fullName}" with mobile "${data.phone}" is already registered (ID: ${namePhoneExists.customer_code}).`,
          409,
          'DUPLICATE_CUSTOMER'
        );
      }
    }

    return await customerRepository.create(storeId, { ...data, customerCode: code });
  },

  async getCustomer(storeId, customerId) {
    const customer = await customerRepository.findById(storeId, customerId);
    if (!customer) {
      throw new AppError('Customer not found in this store', 404, 'CUSTOMER_NOT_FOUND');
    }
    return customer;
  },

  async listCustomers(storeId, queryParams) {
    return await customerRepository.list(storeId, queryParams);
  },

  async updateCustomer(storeId, customerId, data) {
    const customer = await customerRepository.findById(storeId, customerId);
    if (!customer) {
      throw new AppError('Customer not found in this store', 404, 'CUSTOMER_NOT_FOUND');
    }
    return await customerRepository.update(storeId, customerId, data);
  },

  async archiveCustomer(storeId, customerId) {
    const success = await customerRepository.softDelete(storeId, customerId);
    if (!success) {
      throw new AppError('Customer not found or already archived', 404, 'CUSTOMER_NOT_FOUND');
    }
    return { id: customerId, archived: true };
  },

  async bulkUpdateTags(storeId, { customerIds, tagsToAdd = [], tagsToRemove = [], category = null }) {
    const updatedCount = await customerRepository.bulkUpdateTags(
      storeId,
      customerIds,
      tagsToAdd,
      tagsToRemove,
      category
    );
    return { updatedCount };
  },

  async broadcastWhatsApp(storeId, { customerIds, messageTemplate, imageUrl = null, campaignName = 'Campaign' }) {
    const store = await storeRepository.findById(storeId);
    const customers = await customerRepository.findByIds(storeId, customerIds);

    const storeName = store?.name || 'Optics Store';
    const storePhone = store?.phone || '';
    const storeAddress = store?.address || '';

    const preparedMessages = [];
    let cloudSentCount = 0;

    const isCloudConfigured = Boolean(
      store?.whatsapp_config?.provider === 'META' &&
      store?.whatsapp_config?.metaAccessToken &&
      store?.whatsapp_config?.metaPhoneNumberId
    );

    for (const customer of customers) {
      if (!customer.phone || customer.phone.trim() === '') continue;

      let cleanPhone = customer.phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

      let text = messageTemplate
        .replace(/\{customerName\}/g, customer.full_name || 'Valued Customer')
        .replace(/\{customerCode\}/g, customer.customer_code || '')
        .replace(/\{storeName\}/g, storeName)
        .replace(/\{storePhone\}/g, storePhone)
        .replace(/\{storeAddress\}/g, storeAddress);

      if (imageUrl && imageUrl.trim()) {
        text += `\n\n🖼️ View Image/Offer: ${imageUrl.trim()}`;
      }

      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

      preparedMessages.push({
        customerId: customer.id,
        customerName: customer.full_name,
        customerCode: customer.customer_code,
        phone: cleanPhone,
        message: text,
        waUrl,
      });

      // Log to messages audit table
      try {
        await messageRepository.logMessage(storeId, customer.id, 'CAMPAIGN', 'WHATSAPP');
      } catch (_err) {
        // Continue even if logging encounters a minor issue
      }

      // If store has automated Cloud API configured, attempt direct send
      if (isCloudConfigured) {
        try {
          await whatsappService.sendMessage(storeId, {
            phone: cleanPhone,
            message: text,
            customerId: customer.id,
            messageType: 'CAMPAIGN',
          });
          cloudSentCount++;
        } catch (_err) {
          // Cloud send failed for this customer, client can still use wa.me fallback
        }
      }
    }

    return {
      campaignName,
      totalSelected: customerIds.length,
      totalPrepared: preparedMessages.length,
      skippedNoPhone: customerIds.length - preparedMessages.length,
      cloudSentCount: isCloudConfigured ? cloudSentCount : 0,
      deliveryMode: isCloudConfigured ? 'CLOUD_SENT' : 'QUEUE_READY',
      messages: preparedMessages,
    };
  },
};