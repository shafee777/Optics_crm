import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid PostgreSQL connection string' }),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
    .default('dev-access-secret-change-me-please-123456'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' })
    .default('dev-refresh-secret-change-me-please-654321'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('Environment configuration validation failed:');
  console.error(JSON.stringify(parseResult.error.format(), null, 2));
  process.exit(1);
}

// Refuse to start in production with well-known development secrets.
// The desktop app always injects freshly-generated random secrets, so this
// guard only triggers when someone accidentally deploys without configuring
// JWT_ACCESS_SECRET / JWT_REFRESH_SECRET in their server environment.
if (parseResult.data.NODE_ENV === 'production') {
  const DEV_SECRETS = new Set([
    'dev-access-secret-change-me-please-123456',
    'dev-refresh-secret-change-me-please-654321',
  ]);
  if (
    DEV_SECRETS.has(parseResult.data.JWT_ACCESS_SECRET) ||
    DEV_SECRETS.has(parseResult.data.JWT_REFRESH_SECRET)
  ) {
    console.error(
      'FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set to unique, ' +
      'randomly-generated values in production. The development defaults are publicly ' +
      'known and must never be used in a live environment.'
    );
    process.exit(1);
  }
}

export const env = parseResult.data;