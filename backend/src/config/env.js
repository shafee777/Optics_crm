import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const DEV_DEFAULT_SECRETS = new Set([
  'dev-access-secret-change-me-please-123456',
  'dev-refresh-secret-change-me-please-654321',
]);

export const INSECURE_PASSWORDS = new Set([
  'postgres',
  'password',
  'admin',
  'root',
  '123456',
  '12345678',
  '1234',
  'pass',
  'toor',
  'test',
]);

export function validateProductionSafeguards(config) {
  const errors = [];

  if (config.NODE_ENV !== 'production') {
    return { valid: true, errors: [] };
  }

  // 1. JWT Access Secret Safeguards
  if (!config.JWT_ACCESS_SECRET || DEV_DEFAULT_SECRETS.has(config.JWT_ACCESS_SECRET)) {
    errors.push('JWT_ACCESS_SECRET must be set to a secure, non-default value in production.');
  } else if (config.JWT_ACCESS_SECRET.length < 32) {
    errors.push('JWT_ACCESS_SECRET must be at least 32 characters in production.');
  }

  // 2. JWT Refresh Secret Safeguards
  if (!config.JWT_REFRESH_SECRET || DEV_DEFAULT_SECRETS.has(config.JWT_REFRESH_SECRET)) {
    errors.push('JWT_REFRESH_SECRET must be set to a secure, non-default value in production.');
  } else if (config.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters in production.');
  }

  if (
    config.JWT_ACCESS_SECRET &&
    config.JWT_REFRESH_SECRET &&
    config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET
  ) {
    errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct and cannot be identical.');
  }

  // 3. Database URL & Credentials Safeguards
  if (!config.DATABASE_URL) {
    errors.push('DATABASE_URL is required in production.');
  } else {
    try {
      const parsedUrl = new URL(config.DATABASE_URL);
      const username = (parsedUrl.username || '').toLowerCase().trim();
      const password = parsedUrl.password || '';

      if (!password || password.trim() === '') {
        errors.push('DATABASE_URL must include a non-empty password in production.');
      } else if (INSECURE_PASSWORDS.has(password.toLowerCase()) || password.toLowerCase() === username) {
        errors.push(`Default or trivial database credentials (user: "${username}", password: "${password}") are prohibited in production.`);
      }
    } catch {
      errors.push('DATABASE_URL must be a valid connection string in production.');
    }
  }

  // 4. Frontend URL Safeguards
  if (!config.FRONTEND_URL) {
    errors.push('FRONTEND_URL is required in production.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const envSchema = z.object({
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

if (parseResult.data.NODE_ENV === 'production') {
  const safeguards = validateProductionSafeguards(parseResult.data);
  if (!safeguards.valid) {
    console.error('FATAL: Production configuration safeguards failed:');
    safeguards.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
}

export const env = parseResult.data;