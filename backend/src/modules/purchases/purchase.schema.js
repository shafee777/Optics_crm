import { z } from 'zod';
import { isValidCalendarDate, isValidDateOrIso } from '../../shared/validators/dateValidator.js';

const poItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  itemName: z.string().trim().min(1, 'Item name is required').max(255),
  itemType: z.enum(['FRAME', 'LENS', 'SUNGLASSES', 'CONTACT_LENS', 'SOLUTION', 'ACCESSORY', 'COATING', 'SERVICE']).default('FRAME'),
  brand: z.string().trim().max(100).optional().nullable(),
  modelCode: z.string().trim().max(100).optional().nullable(),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  unitCost: z.coerce.number().min(0, 'Unit cost must be non-negative'),
  gstRate: z.coerce.number().min(0).default(0),
});

const initialPaymentSchema = z.object({
  amount: z.coerce.number().multipleOf(0.01).positive('Payment amount must be positive'),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE']).default('CASH'),
  referenceNote: z.string().trim().max(255).optional().nullable(),
});

export const createPurchaseOrderSchema = z.object({
  body: z.object({
    supplierId: z.string().uuid('Valid supplier ID is required'),
    invoiceNumber: z.string().trim().max(100).optional().nullable(),
    orderDate: z
      .string()
      .refine(isValidDateOrIso, { message: 'Order date must be a valid calendar date or ISO datetime' })
      .optional()
      .nullable(),
    notes: z.string().trim().optional().nullable(),
    items: z.array(poItemSchema).min(1, 'At least 1 item is required in a Purchase Order'),
    initialPayment: initialPaymentSchema.optional().nullable(),
  }),
});

export const recordSupplierPaymentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid purchase order ID format'),
  }),
  body: z.object({
    amount: z.coerce.number().multipleOf(0.01).positive('Payment amount must be greater than 0'),
    paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE']).default('CASH'),
    referenceNote: z.string().trim().max(255).optional().nullable(),
  }),
});

export const purchaseOrderIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid purchase order ID format'),
  }),
});

export const listPurchaseOrdersSchema = z.object({
  query: z.object({
    supplierId: z.string().uuid('Invalid supplier ID format').optional(),
    status: z.enum(['RECEIVED', 'CANCELLED']).optional(),
    from: z
      .string()
      .refine(isValidCalendarDate, { message: 'From date must be a valid calendar date (YYYY-MM-DD)' })
      .optional(),
    to: z
      .string()
      .refine(isValidCalendarDate, { message: 'To date must be a valid calendar date (YYYY-MM-DD)' })
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),
});