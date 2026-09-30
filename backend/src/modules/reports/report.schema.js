import { z } from 'zod';
import { isValidCalendarDate } from '../../shared/validators/dateValidator.js';

export const salesReportSchema = z.object({
  query: z.object({
    period: z.enum(['day', 'month', 'year']).optional(),
    date: z
      .string()
      .refine(isValidCalendarDate, { message: 'Date must be a valid calendar date (YYYY-MM-DD)' })
      .optional(),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')
      .refine((m) => {
        const [_, mm] = m.split('-').map(Number);
        return mm >= 1 && mm <= 12;
      }, { message: 'Month must be between 01 and 12' })
      .optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
  }),
});

export const customRangeReportSchema = z.object({
  query: z
    .object({
      startDate: z
        .string()
        .refine(isValidCalendarDate, { message: 'Start date must be a valid calendar date (YYYY-MM-DD)' }),
      endDate: z
        .string()
        .refine(isValidCalendarDate, { message: 'End date must be a valid calendar date (YYYY-MM-DD)' }),
    })
    .refine((data) => data.startDate <= data.endDate, {
      message: 'Start date must be on or before end date',
      path: ['endDate'],
    }),
});

export const topProductsReportSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});
