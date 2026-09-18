import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(255),
    email: z.string().email('Please provide a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['OWNER', 'STAFF']).default('STAFF'),
  }),
});

export const updateUserStatusSchema = z.object({
  body: z.object({
    active: z.boolean({ required_error: 'Active status is required' }),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(6, 'New password must be at least 6 characters'),
  }),
});
