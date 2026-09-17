import { z } from 'zod';

export const createExpenseSchema = z.object({
  body: z.object({
    category: z.string().min(2, 'Category is required').trim(),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
    paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']),
    incurredAt: z.string().datetime().optional(),
    note: z.string().optional().or(z.literal('')),
  }),
});

export const listExpensesSchema = z.object({
  query: z.object({
    category: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(10),
  }),
});
