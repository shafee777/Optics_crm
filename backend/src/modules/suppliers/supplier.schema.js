import { z } from 'zod';

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Supplier name is required').max(255),
    contactPerson: z.string().trim().max(100).optional().nullable(),
    phone: z.string().trim().max(50).optional().nullable(),
    email: z.string().trim().email().optional().nullable().or(z.literal('')),
    gstin: z.string().trim().max(20).optional().nullable(),
    address: z.string().trim().optional().nullable(),
    category: z.enum(['LENS_LAB', 'FRAME_VENDOR', 'CONTACT_LENS', 'ACCESSORIES', 'GENERAL']).default('FRAME_VENDOR'),
  }),
});

export const updateSupplierSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid supplier ID format'),
  }),
  body: createSupplierSchema.shape.body.partial(),
});

export const supplierIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid supplier ID format'),
  }),
});

export const listSuppliersSchema = z.object({
  query: z.object({
    category: z.enum(['LENS_LAB', 'FRAME_VENDOR', 'CONTACT_LENS', 'ACCESSORIES', 'GENERAL']).optional(),
    search: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  }),
});