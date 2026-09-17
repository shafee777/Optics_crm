import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    itemType: z.enum(['FRAME', 'LENS', 'SUNGLASSES', 'CONTACT_LENS', 'SOLUTION', 'ACCESSORY', 'SERVICE']),
    brand: z.string().trim().max(100).optional().nullable(),
    modelCode: z.string().trim().max(100).optional().nullable(),
    name: z.string().trim().min(1, 'Product name is required').max(255),
    description: z.string().trim().optional().nullable(),
    costPrice: z.coerce.number().min(0).default(0),
    sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative'),
    stockQuantity: z.coerce.number().int().default(0),
    minStockAlert: z.coerce.number().int().min(0).default(3),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: createProductSchema.shape.body.partial(),
});

export const adjustStockSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    adjustment: z.coerce.number().int(), // can be positive (+5) or negative (-1)
    reason: z.string().trim().optional(),
  }),
});