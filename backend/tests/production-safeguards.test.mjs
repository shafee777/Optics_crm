import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionSafeguards } from '../src/config/env.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { env } from '../src/config/env.js';

test('Production Safeguards: validateProductionSafeguards permits development and test modes', () => {
  const devConfig = {
    NODE_ENV: 'development',
    JWT_ACCESS_SECRET: 'dev-access-secret-change-me-please-123456',
    JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me-please-654321',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/optics_crm',
    FRONTEND_URL: 'http://localhost:5173',
  };
  const devRes = validateProductionSafeguards(devConfig);
  assert.equal(devRes.valid, true);
  assert.equal(devRes.errors.length, 0);

  const testConfig = {
    ...devConfig,
    NODE_ENV: 'test',
  };
  const testRes = validateProductionSafeguards(testConfig);
  assert.equal(testRes.valid, true);
  assert.equal(testRes.errors.length, 0);
});

test('Production Safeguards: Rejects default and weak JWT secrets in production', () => {
  const validProd = {
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'a_very_strong_random_access_secret_32chars!',
    JWT_REFRESH_SECRET: 'a_very_strong_random_refresh_secret_32chars!',
    DATABASE_URL: 'postgresql://prod_app_user:StrongRandomDbPassw0rd99!@db.internal:5432/optics_crm_prod',
    FRONTEND_URL: 'https://optics.production.app',
  };

  // 1. Default Access Secret
  const defaultAccess = validateProductionSafeguards({
    ...validProd,
    JWT_ACCESS_SECRET: 'dev-access-secret-change-me-please-123456',
  });
  assert.equal(defaultAccess.valid, false);
  assert.ok(defaultAccess.errors.some((e) => e.includes('JWT_ACCESS_SECRET')));

  // 2. Short Access Secret (< 32 chars)
  const shortAccess = validateProductionSafeguards({
    ...validProd,
    JWT_ACCESS_SECRET: 'too-short-secret',
  });
  assert.equal(shortAccess.valid, false);
  assert.ok(shortAccess.errors.some((e) => e.includes('JWT_ACCESS_SECRET')));

  // 3. Default Refresh Secret
  const defaultRefresh = validateProductionSafeguards({
    ...validProd,
    JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me-please-654321',
  });
  assert.equal(defaultRefresh.valid, false);
  assert.ok(defaultRefresh.errors.some((e) => e.includes('JWT_REFRESH_SECRET')));

  // 4. Short Refresh Secret (< 32 chars)
  const shortRefresh = validateProductionSafeguards({
    ...validProd,
    JWT_REFRESH_SECRET: 'short-refresh-secret',
  });
  assert.equal(shortRefresh.valid, false);
  assert.ok(shortRefresh.errors.some((e) => e.includes('JWT_REFRESH_SECRET')));

  // 5. Matching Access and Refresh Secrets
  const sameSecret = 'same_secret_for_both_access_and_refresh_32_chars!';
  const matchingSecrets = validateProductionSafeguards({
    ...validProd,
    JWT_ACCESS_SECRET: sameSecret,
    JWT_REFRESH_SECRET: sameSecret,
  });
  assert.equal(matchingSecrets.valid, false);
  assert.ok(matchingSecrets.errors.some((e) => e.includes('cannot be identical')));
});

test('Production Safeguards: Rejects default, empty, or trivial database credentials in production', () => {
  const validProd = {
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'a_very_strong_random_access_secret_32chars!',
    JWT_REFRESH_SECRET: 'a_very_strong_random_refresh_secret_32chars!',
    DATABASE_URL: 'postgresql://prod_app_user:StrongRandomDbPassw0rd99!@db.internal:5432/optics_crm_prod',
    FRONTEND_URL: 'https://optics.production.app',
  };

  // 1. postgres:postgres default
  const defaultDb1 = validateProductionSafeguards({
    ...validProd,
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/optics_crm',
  });
  assert.equal(defaultDb1.valid, false);
  assert.ok(defaultDb1.errors.some((e) => e.includes('Default or trivial database credentials')));

  // 2. postgres:password default
  const defaultDb2 = validateProductionSafeguards({
    ...validProd,
    DATABASE_URL: 'postgresql://postgres:password@db.example.com:5432/optics_crm',
  });
  assert.equal(defaultDb2.valid, false);
  assert.ok(defaultDb2.errors.some((e) => e.includes('Default or trivial database credentials')));

  // 3. postgres:admin default
  const defaultDb3 = validateProductionSafeguards({
    ...validProd,
    DATABASE_URL: 'postgresql://postgres:admin@db.example.com:5432/optics_crm',
  });
  assert.equal(defaultDb3.valid, false);

  // 4. empty password
  const emptyPass = validateProductionSafeguards({
    ...validProd,
    DATABASE_URL: 'postgresql://app_user@db.example.com:5432/optics_crm',
  });
  assert.equal(emptyPass.valid, false);
  assert.ok(emptyPass.errors.some((e) => e.includes('DATABASE_URL must include a non-empty password')));

  // 5. password matching username
  const sameUserPass = validateProductionSafeguards({
    ...validProd,
    DATABASE_URL: 'postgresql://optics_user:optics_user@db.example.com:5432/optics_crm',
  });
  assert.equal(sameUserPass.valid, false);

  // 6. Missing FRONTEND_URL
  const missingFrontend = validateProductionSafeguards({
    ...validProd,
    FRONTEND_URL: '',
  });
  assert.equal(missingFrontend.valid, false);
  assert.ok(missingFrontend.errors.some((e) => e.includes('FRONTEND_URL is required')));
});

test('Production Safeguards: Passes completely when all production settings are properly configured', () => {
  const validProd = {
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'k8JmN9vP2xR5zT7qW3yB6eL1uC4aB7dE8f',
    JWT_REFRESH_SECRET: 'd9XmP4kL8vN2yR6zT1qW7eB3uC5aB7dE8f',
    DATABASE_URL: 'postgresql://optics_secure_admin:StrongProdDbPassw0rd99@pg-cluster.internal:5432/optics_crm_production',
    FRONTEND_URL: 'https://optics-crm.yourdomain.com',
  };

  const res = validateProductionSafeguards(validProd);
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
});

test('Production Safeguards: Demo accounts and default passwords are prohibited during login in production', async () => {
  const originalEnv = env.NODE_ENV;
  try {
    env.NODE_ENV = 'production';

    // 1. Owner demo account
    await assert.rejects(
      async () => {
        await authService.login('owner@visioncare.com', 'AnyPassword!');
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'DEMO_ACCOUNTS_PROHIBITED');
        return true;
      }
    );

    // 2. Staff demo account
    await assert.rejects(
      async () => {
        await authService.login('staff@visioncare.com', 'AnyPassword!');
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'DEMO_ACCOUNTS_PROHIBITED');
        return true;
      }
    );

    // 3. Store B demo account
    await assert.rejects(
      async () => {
        await authService.login('owner@cityeye.com', 'AnyPassword!');
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'DEMO_ACCOUNTS_PROHIBITED');
        return true;
      }
    );

    // 4. Any account attempting default demo password Password123!
    await assert.rejects(
      async () => {
        await authService.login('custom_user@mystore.com', 'Password123!');
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'DEMO_ACCOUNTS_PROHIBITED');
        return true;
      }
    );
  } finally {
    env.NODE_ENV = originalEnv;
  }
});
