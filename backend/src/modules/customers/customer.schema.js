import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    customerCode: z.string().optional().nullable(),
    fullName: z.string().min(2, 'Name must be at least 2 characters').trim(),
    phone: z.string().optional().or(z.literal('')).nullable(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),
    gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional().or(z.literal('')).nullable(),
    age: z.coerce.number().min(1).max(125).optional().nullable(),
    address: z.string().optional().or(z.literal('')).nullable(),
    notes: z.string().optional().or(z.literal('')).nullable(),
    tags: z.array(z.string().trim()).optional().default([]),
    category: z.string().trim().optional().default('REGULAR'),
  }),
});

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid customer ID format'),
  }),
  body: z.object({
    customerCode: z.string().optional().nullable(),
    fullName: z.string().min(2, 'Name must be at least 2 characters').trim().optional(),
    phone: z.string().optional().or(z.literal('')).nullable(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),
    gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional().or(z.literal('')).nullable(),
    age: z.coerce.number().min(1).max(125).optional().nullable(),
    address: z.string().optional().or(z.literal('')).nullable(),
    notes: z.string().optional().or(z.literal('')).nullable(),
    tags: z.array(z.string().trim()).optional(),
    category: z.string().trim().optional(),
  }),
});

export const listCustomersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(10),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    segment: z.string().optional(),
    tag: z.string().optional(),
    category: z.string().optional(),
    hasBalance: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(['created_at', 'total_spend', 'last_order_date', 'full_name', 'balance_due']).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional().default('desc'),
  }),
});

export const customerIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid customer ID format'),
  }),
});

export const bulkTagSchema = z.object({
  body: z.object({
    customerIds: z.array(z.string().uuid('Invalid customer ID')).min(1, 'At least one customer must be selected'),
    tagsToAdd: z.array(z.string().trim()).optional().default([]),
    tagsToRemove: z.array(z.string().trim()).optional().default([]),
    category: z.string().trim().optional(),
  }),
});

export const broadcastWhatsAppSchema = z.object({
  body: z.object({
    customerIds: z.array(z.string().uuid('Invalid customer ID')).min(1, 'At least one customer must be selected'),
    messageTemplate: z.string().min(1, 'Message cannot be empty').trim(),
    imageUrl: z.string().optional().or(z.literal('')).nullable(),
    campaignName: z.string().optional().default('Marketing Broadcast'),
  }),
});
