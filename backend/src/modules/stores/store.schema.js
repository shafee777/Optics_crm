import { z } from 'zod';

export const updateStoreSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Store name must be at least 2 characters').max(255).optional(),
    phone: z.string().max(50).nullable().optional(),
    email: z.string().email('Invalid email address').nullable().optional().or(z.literal('')),
    address: z.string().nullable().optional(),
    googleReviewLink: z.string().nullable().optional(),
    gstin: z.string().max(20).nullable().optional(),
    logoUrl: z.string().nullable().optional().or(z.literal('')),
    currency: z.string().max(10).optional(),
    timezone: z.string().max(50).optional(),
    whatsappTemplates: z.record(z.string()).optional().nullable(),
  }),
});
