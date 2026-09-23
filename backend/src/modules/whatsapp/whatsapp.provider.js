import { logger } from '../../config/logger.js';

export class MetaCloudProvider {
  constructor(config = {}) {
    this.phoneNumberId = config.metaPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = config.metaAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    this.apiVersion = 'v19.0';
  }

  async send({ to, message }) {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('Meta WhatsApp Cloud API credentials missing (Phone Number ID or Access Token).');
    }

    const cleanPhone = to.replace(/\D/g, '');
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errDetail = data?.error?.message || response.statusText;
      logger.error(`[Meta WhatsApp] Send error: ${errDetail}`);
      throw new Error(`Meta Cloud API Error: ${errDetail}`);
    }

    return {
      success: true,
      provider: 'META',
      messageId: data?.messages?.[0]?.id || `meta-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export class TwilioProvider {
  constructor(config = {}) {
    this.accountSid = config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
    this.authToken = config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
    this.fromPhone = config.twilioFromPhone || process.env.TWILIO_WHATSAPP_FROM || '+14155238886';
  }

  async send({ to, message }) {
    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials missing (Account SID or Auth Token).');
    }

    const cleanPhone = to.replace(/\D/g, '');
    const formattedTo = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
    const formattedFrom = this.fromPhone.startsWith('+') ? this.fromPhone : `+${this.fromPhone}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const authHeader = `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`;

    const params = new URLSearchParams();
    params.append('From', `whatsapp:${formattedFrom}`);
    params.append('To', `whatsapp:${formattedTo}`);
    params.append('Body', message);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      const errDetail = data?.message || response.statusText;
      logger.error(`[Twilio WhatsApp] Send error: ${errDetail}`);
      throw new Error(`Twilio Error: ${errDetail}`);
    }

    return {
      success: true,
      provider: 'TWILIO',
      messageId: data?.sid || `twilio-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export class WebhookProvider {
  constructor(config = {}) {
    this.webhookUrl = config.customWebhookUrl || process.env.WHATSAPP_WEBHOOK_URL;
  }

  async send({ to, message, customerId, messageType }) {
    if (!this.webhookUrl) {
      throw new Error('Custom Webhook URL missing.');
    }

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: to.replace(/\D/g, ''),
        message,
        customerId,
        messageType,
        sentAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Custom Webhook failed with status ${response.status}: ${response.statusText}`);
    }

    return {
      success: true,
      provider: 'WEBHOOK',
      messageId: `webhook-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export class MockProvider {
  async send({ to, message, messageType }) {
    logger.info(`[MOCK WhatsApp] Auto-dispatching to ${to} (${messageType}): ${message.slice(0, 50)}...`);
    return {
      success: true,
      provider: 'MOCK',
      messageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      note: 'Simulated automatic delivery (Configure Meta/Twilio credentials in Settings for live cloud delivery)',
    };
  }
}

export function getWhatsAppProvider(config = {}) {
  const providerType = (config?.provider || 'MOCK').toUpperCase();

  switch (providerType) {
    case 'META':
      return new MetaCloudProvider(config);
    case 'TWILIO':
      return new TwilioProvider(config);
    case 'WEBHOOK':
      return new WebhookProvider(config);
    case 'MOCK':
    default:
      return new MockProvider();
  }
}
