import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const logoutSchema = refreshSchema;

export const recoverPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    recoveryKey: z.string().min(10, 'Recovery key is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').max(72, 'Password cannot exceed 72 characters'),
  }),
});

export const generateRecoveryKeySchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
  }),
});