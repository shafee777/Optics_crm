import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    customerCode: z.string().optional(),
    fullName: z.string().min(2, 'Name must be at least 2 characters').trim(),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional().or(z.literal('')),
    age: z.coerce.number().min(1).max(125).optional().nullable(),
    address: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
  }),
});

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid customer ID format'),
  }),
  body: z.object({
    fullName: z.string().min(2).optional(),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional().or(z.literal('')),
    age: z.coerce.number().min(1).max(125).optional().nullable(),
    address: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
  }),
});

export const listCustomersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(10),
  }),
});

export const customerIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid customer ID format'),
  }),
});