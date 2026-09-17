import { z } from 'zod';

const opticalNumber = z.coerce
  .number()
  .min(-25)
  .max(25)
  .optional()
  .nullable();

const axisNumber = z.coerce
  .number()
  .int('Axis must be an integer')
  .min(0, 'Axis must be between 0 and 180')
  .max(180, 'Axis must be between 0 and 180')
  .optional()
  .nullable();

export const createPrescriptionSchema = z.object({
  params: z.object({
    customerId: z.string().uuid('Invalid customer ID format'),
  }),
  body: z.object({
    // Right Eye (OD - Oculus Dexter)
    rSph: opticalNumber,
    rCyl: opticalNumber,
    rAxis: axisNumber,
    rAdd: opticalNumber,

    // Left Eye (OS - Oculus Sinister)
    lSph: opticalNumber,
    lCyl: opticalNumber,
    lAxis: axisNumber,
    lAdd: opticalNumber,

    pd: z.coerce.number().min(40).max(85).optional().nullable(),
    notes: z.string().optional().or(z.literal('')),
    testedAt: z.string().datetime().optional(),
  }),
});

export const getPrescriptionsSchema = z.object({
  params: z.object({
    customerId: z.string().uuid('Invalid customer ID format'),
  }),
});