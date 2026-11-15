import api from './api.js';

export const enterpriseApi = {
  // Loyalty Engine
  async getLoyaltyProfile(customerId) {
    const res = await api.get(`/loyalty/customer/${customerId}`);
    return res.data.data;
  },

  async adjustLoyaltyPoints(customerId, delta, notes) {
    const res = await api.post(`/loyalty/customer/${customerId}/adjust`, { delta, notes });
    return res.data.data;
  },

  async getLoyaltyConfig() {
    const res = await api.get('/loyalty/config');
    return res.data.data;
  },

  async updateLoyaltyConfig(data) {
    const res = await api.put('/loyalty/config', data);
    return res.data.data;
  },

  // Warranty Contracts
  async getWarrantyPlans(all = false) {
    const res = await api.get(`/warranties/plans${all ? '?all=true' : ''}`);
    return res.data.data;
  },

  async createWarrantyPlan(data) {
    const res = await api.post('/warranties/plans', data);
    return res.data.data;
  },

  async updateWarrantyPlan(planId, data) {
    const res = await api.put(`/warranties/plans/${planId}`, data);
    return res.data.data;
  },

  async getCustomerWarranties(customerId) {
    const res = await api.get(`/warranties/customer/${customerId}`);
    return res.data.data;
  },

  async processWarrantyClaim(warrantyId, data) {
    const res = await api.post(`/warranties/${warrantyId}/claim`, data);
    return res.data.data;
  },

  // Smart Outbox & Messaging
  async getPendingOutboxCount() {
    const res = await api.get('/outbox/pending-count');
    return res.data.data.count;
  },

  async listOutbox(status = 'PENDING', limit = 50) {
    const res = await api.get(`/outbox?status=${status}&limit=${limit}`);
    return res.data.data;
  },

  async markOutboxSent(messageId, dispatchMethod = 'MANUAL_WA_ME') {
    const res = await api.post(`/outbox/${messageId}/sent`, { dispatchMethod });
    return res.data.data;
  },

  async dismissOutboxMessage(messageId) {
    const res = await api.post(`/outbox/${messageId}/dismiss`);
    return res.data.data;
  },

  async dispatchOutboxCloud(messageId) {
    const res = await api.post(`/outbox/${messageId}/dispatch-cloud`);
    return res.data.data;
  },

  async dispatchAllOutboxCloud() {
    const res = await api.post('/outbox/dispatch-all-cloud');
    return res.data.data;
  },

  async getWhatsAppConfig() {
    const res = await api.get('/outbox/config');
    return res.data.data;
  },

  async updateWhatsAppConfig(data) {
    const res = await api.put('/outbox/config', data);
    return res.data.data;
  },

  async testWhatsAppCloud(phone) {
    const res = await api.post('/outbox/test-cloud', { phone });
    return res.data;
  },
};
