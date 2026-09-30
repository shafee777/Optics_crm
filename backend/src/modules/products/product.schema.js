import { z } from 'zod';

// Canonical item types shared across all modules
export const ITEM_TYPES = [
  'FRAME',
  'LENS',
  'SUNGLASSES',
  'CONTACT_LENS',
  'SOLUTION',
  'ACCESSORY',
  'COATING',
  'SERVICE',
];

export const createProductSchema = z.object({
  body: z.object({
    itemType: z.enum(ITEM_TYPES), // <-- Now includes COATING
    brand: z.string().trim().max(100).optional().nullable(),
    modelCode: z.string().trim().max(100).optional().nullable(),
    name: z.string().trim().min(1, 'Product name is required').max(255),
    description: z.string().trim().optional().nullable(),
    costPrice: z.coerce.number().min(0).default(0),
    sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative'),
    stockQuantity: z.coerce.number().int().min(0).default(0),
    minStockAlert: z.coerce.number().int().min(0).default(3),
    hsnCode: z.string().trim().max(20).optional().nullable(),
    gstRate: z.coerce.number().min(0).max(100).optional().nullable().default(12.00),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: createProductSchema.shape.body.partial(),
});

export const productIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format'),
  }),
});

export const adjustStockSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format'),
  }),
  body: z.object({
    adjustment: z.coerce.number().int().refine((v) => v !== 0, { message: 'Adjustment must be a non-zero integer' }),
    reason: z.string().trim().optional(),
  }),
});

export const listProductsSchema = z.object({
  query: z.object({
    itemType: z.enum(ITEM_TYPES).optional(),
    search: z.string().trim().max(255).optional(),
    lowStockOnly: z.enum(['true', 'false']).default('false'),
    limit: z.coerce.number().int().min(1).max(1000).default(100),
    offset: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
  }),
});
