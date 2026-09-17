import { z } from 'zod';
import { ORDER_STATUS } from './order.constants.js';

const orderItemSchema = z.object({
  itemType: z.enum(['FRAME', 'LENS', 'COATING', 'CONTACT_LENS', 'ACCESSORY', 'SERVICE']),
  description: z.string().min(2, 'Description is required').trim(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
  unitPrice: z.coerce.number().min(0, 'Price cannot be negative'),
  discount: z.coerce.number().min(0).default(0),
});

export const createOrderSchema = z.object({
  body: z.object({
    customerId: z.string().uuid('Invalid customer ID'),
    prescriptionId: z.string().uuid('Invalid prescription ID').optional().nullable(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format'),
    items: z.array(orderItemSchema).min(1, 'At least one line item is required'),
    discount: z.coerce.number().min(0).default(0),
    tax: z.coerce.number().min(0).default(0),
    notes: z.string().optional().or(z.literal('')),
    advancePayment: z
      .object({
        amount: z.coerce.number().min(0.01, 'Payment amount must be greater than 0'),
        paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']),
        reference: z.string().optional().or(z.literal('')),
      })
      .optional()
      .nullable(),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID'),
  }),
  body: z.object({
    status: z.enum([
      ORDER_STATUS.PENDING,
      ORDER_STATUS.PROCESSING,
      ORDER_STATUS.READY_FOR_PICKUP,
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.CANCELLED,
    ]),
  }),
});

export const listOrdersSchema = z.object({
  query: z.object({
    status: z.string().optional(),
    customerId: z.string().uuid().optional(),
    overdue: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(10),
  }),
});

export const orderIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID'),
  }),
});
