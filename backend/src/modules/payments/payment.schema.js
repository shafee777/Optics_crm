import { z } from 'zod';

export const recordPaymentSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID'),
  }),
  body: z.object({
    amount: z.coerce.number().min(0.01, 'Payment amount must be greater than 0'),
    paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']),
    reference: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    markDelivered: z.boolean().optional().default(false),
  }),
});

export const getOrderPaymentsSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID'),
  }),
});
