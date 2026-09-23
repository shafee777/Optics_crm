-- 008_whatsapp_cloud_config.sql
-- Add whatsapp_config JSONB column to stores table for automated messaging

ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS whatsapp_config JSONB DEFAULT '{
  "provider": "MOCK",
  "autoSendOrderCreated": true,
  "autoSendOrderReady": true,
  "autoSendGoogleReview": false,
  "metaPhoneNumberId": "",
  "metaAccessToken": "",
  "metaWabaId": "",
  "twilioAccountSid": "",
  "twilioAuthToken": "",
  "twilioFromPhone": "",
  "customWebhookUrl": ""
}'::jsonb;
