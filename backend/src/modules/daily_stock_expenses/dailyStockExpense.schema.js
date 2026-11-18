import { z } from 'zod';
import { isValidDateOrIso } from '../../shared/validators/dateValidator.js';

export const createDailyStockExpenseSchema = z.object({
  body: z.object({
    category: z.enum(['LENS', 'FRAME'], {
      required_error: 'Category must be either LENS or FRAME',
    }),
    companyName: z.string().trim().min(1, 'Company name is required').max(255),
    brandDetails: z.string().trim().max(255).optional().nullable(),
    stockNotes: z.string().trim().max(1000).optional().nullable(),
    billDate: z
      .string()
      .refine(isValidDateOrIso, { message: 'Bill date must be a valid calendar date or ISO datetime' })
      .optional()
      .nullable(),
    totalAmount: z.coerce.number().min(0, 'Total amount must be non-negative'),
    paidAmount: z.coerce.number().min(0, 'Paid amount must be non-negative').default(0),
    paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE']).default('CASH'),
    invoiceNumber: z.string().trim().max(100).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
  }),
});

export const updateDailyStockExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid expense ID format'),
  }),
  body: z.object({
    category: z.enum(['LENS', 'FRAME']).optional(),
    companyName: z.string().trim().min(1).max(255).optional(),
    brandDetails: z.string().trim().max(255).optional().nullable(),
    stockNotes: z.string().trim().max(1000).optional().nullable(),
    billDate: z
      .string()
      .refine(isValidDateOrIso, { message: 'Bill date must be a valid calendar date or ISO datetime' })
      .optional()
      .nullable(),
    totalAmount: z.coerce.number().min(0).optional(),
    paidAmount: z.coerce.number().min(0).optional(),
    paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE']).optional(),
    invoiceNumber: z.string().trim().max(100).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
  }),
});

export const updatePaymentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid expense ID format'),
  }),
  body: z.object({
    paidAmount: z.coerce.number().min(0, 'Paid amount must be non-negative'),
    paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE']).optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  }),
});

export const dailyStockExpenseIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid expense ID format'),
  }),
});

export const listDailyStockExpenseSchema = z.object({
  query: z.object({
    category: z.enum(['LENS', 'FRAME', 'ALL']).optional().default('ALL'),
    companyName: z.string().trim().optional(),
    search: z.string().trim().optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format').optional(),
    startDate: z.string().refine(isValidDateOrIso).optional(),
    endDate: z.string().refine(isValidDateOrIso).optional(),
    paymentStatus: z.enum(['PAID', 'PARTIAL', 'UNPAID', 'ALL']).optional().default('ALL'),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(50),
  }),
});

export const companySummarySchema = z.object({
  query: z.object({
    category: z.enum(['LENS', 'FRAME', 'ALL']).optional().default('ALL'),
    companyName: z.string().trim().optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format').optional(),
  }),
});
