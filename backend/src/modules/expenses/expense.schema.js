import { z } from 'zod';
import { isValidCalendarDate, isValidDateOrIso } from '../../shared/validators/dateValidator.js';

export const createExpenseSchema = z.object({
  body: z.object({
    category: z.string().min(2, 'Category is required').trim(),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
    paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']),
    incurredAt: z
      .string()
      .refine(isValidDateOrIso, { message: 'Incurred date must be a valid calendar date or ISO datetime' })
      .optional(),
    note: z.string().optional().or(z.literal('')),
  }),
});

export const listExpensesSchema = z.object({
  query: z
    .object({
      category: z.string().optional(),
      from: z
        .string()
        .refine(isValidCalendarDate, { message: 'From date must be a valid calendar date (YYYY-MM-DD)' })
        .optional(),
      to: z
        .string()
        .refine(isValidCalendarDate, { message: 'To date must be a valid calendar date (YYYY-MM-DD)' })
        .optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    })
    .refine(
      (data) => {
        if (data.from && data.to) {
          return data.from <= data.to;
        }
        return true;
      },
      {
        message: 'From date must be on or before To date',
        path: ['to'],
      }
    ),
});
