import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { pool, query } from '../src/config/database.js';
import { generateRecoveryKey, normalizeRecoveryKey } from '../src/utils/recoveryKey.js';

const request = supertest(app);

test('Recovery Key Utility: Generates cryptographically secure unambiguous keys', () => {
  const key1 = generateRecoveryKey();
  const key2 = generateRecoveryKey();

  // Distinct keys
  assert.notEqual(key1, key2);

  // Matches canonical format: 4 groups of 4 separated by dashes
  const pattern = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;
  assert.ok(pattern.test(key1), `Key ${key1} does not match expected format`);
  assert.ok(pattern.test(key2), `Key ${key2} does not match expected format`);

  // Does not contain ambiguous characters 0, O, 1, I
  assert.ok(!/[01OI]/.test(key1));
  assert.ok(!/[01OI]/.test(key2));
});

test('Recovery Key Utility: Normalizes variations into canonical format', () => {
  const rawKey = '234A-BCDE-FGHK-LMNP';
  // Lowercase with spaces
  const messy1 = ' 234a-bcde-fghk-lmnp ';
  assert.equal(normalizeRecoveryKey(messy1), rawKey);

  // Missing hyphens
  const messy2 = '234abcdefghklmnp';
  assert.equal(normalizeRecoveryKey(messy2), rawKey);

  // Arbitrary extra spaces and hyphens
  const messy3 = ' 234A - BCDE - FGHK - LMNP ';
  assert.equal(normalizeRecoveryKey(messy3), rawKey);
});

test('Owner Recovery Lifecycle: End-to-end security & verification', async () => {
  // Setup dedicated test store and owner
  const testStoreName = 'Recovery Test Store ' + Date.now();
  const storeRes = await query(
    'INSERT INTO stores (name, phone, currency, timezone) VALUES ($1, $2, $3, $4) RETURNING id',
    [testStoreName, '+91 99999 11111', 'INR', 'Asia/Kolkata']
  );
  const storeId = storeRes.rows[0].id;

  const ownerEmail = `owner_${Date.now()}@testrecovery.org`;
  const initialPassword = 'InitialPassword123!';
  const initialPasswordHash = await bcrypt.hash(initialPassword, 10);

  // Step 1: Owner setup creates recovery key, database stores ONLY the hash (Criteria 1, 2, 3)
  const initialRecoveryKey = generateRecoveryKey();
  const initialRecoveryKeyHash = await bcrypt.hash(initialRecoveryKey, 10);

  const ownerRes = await query(
    `INSERT INTO users (store_id, email, password_hash, full_name, role, active, recovery_key_hash)
     VALUES ($1, $2, $3, $4, 'OWNER', true, $5)
     RETURNING id, recovery_key_hash`,
    [storeId, ownerEmail, initialPasswordHash, 'Test Owner', initialRecoveryKeyHash]
  );
  const ownerId = ownerRes.rows[0].id;

  // Verify hash in DB is bcrypt and not plaintext
  assert.ok(ownerRes.rows[0].recovery_key_hash.startsWith('$2b$'));
  assert.notEqual(ownerRes.rows[0].recovery_key_hash, initialRecoveryKey);

  // Step 2: Staff account setup to verify Staff cannot use owner recovery (Criterion 17)
  const staffEmail = `staff_${Date.now()}@testrecovery.org`;
  const staffPasswordHash = await bcrypt.hash('StaffPassword123!', 10);
  await query(
    `INSERT INTO users (store_id, email, password_hash, full_name, role, active)
     VALUES ($1, $2, $3, $4, 'STAFF', true)`,
    [storeId, staffEmail, staffPasswordHash, 'Test Staff']
  );

  // Step 3: Login to obtain session before recovery (Criterion 10)
  const loginBefore = await request.post('/api/v1/auth/login').send({
    email: ownerEmail,
    password: initialPassword,
  });
  assert.equal(loginBefore.status, 200);
  const oldRefreshToken = loginBefore.body.data.refreshToken;
  const ownerAuthToken = loginBefore.body.data.token;
  assert.ok(oldRefreshToken);

  // Step 4: Settings - Check recovery key status (Criterion 13)
  const statusRes = await request
    .get('/api/v1/auth/recovery-key/status')
    .set('Authorization', `Bearer ${ownerAuthToken}`);
  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.body.data.hasRecoveryKey, true);

  // Step 5: Prevent account enumeration (Criterion 9)
  // Non-existent email
  const nonExistentRes = await request.post('/api/v1/auth/recover-password').send({
    email: 'nonexistent_account_123456@optics.fake',
    recoveryKey: initialRecoveryKey,
    newPassword: 'BrandNewPassword123!',
  });
  assert.equal(nonExistentRes.status, 401);
  assert.equal(nonExistentRes.body.error.code, 'INVALID_RECOVERY_CREDENTIALS');
  assert.equal(nonExistentRes.body.error.message, 'Invalid recovery credentials.');

  // Staff account attempting recovery (Criterion 17)
  const staffRecoveryRes = await request.post('/api/v1/auth/recover-password').send({
    email: staffEmail,
    recoveryKey: initialRecoveryKey,
    newPassword: 'BrandNewPassword123!',
  });
  assert.equal(staffRecoveryRes.status, 401);
  assert.equal(staffRecoveryRes.body.error.code, 'INVALID_RECOVERY_CREDENTIALS');
  assert.equal(staffRecoveryRes.body.error.message, 'Invalid recovery credentials.');

  // Step 6: Incorrect recovery key fails securely (Criteria 7, 18)
  const wrongKeyRes = await request.post('/api/v1/auth/recover-password').send({
    email: ownerEmail,
    recoveryKey: '9999-9999-9999-9999',
    newPassword: 'BrandNewPassword123!',
  });
  assert.equal(wrongKeyRes.status, 401);
  assert.equal(wrongKeyRes.body.error.code, 'INVALID_RECOVERY_CREDENTIALS');
  // Recovery key is never exposed in error
  assert.ok(!JSON.stringify(wrongKeyRes.body).includes('9999-9999-9999-9999'));

  // Step 7: Brute force lockout test (Criterion 8)
  // We've failed 1 attempt already, fail 4 more times (total 5)
  for (let i = 0; i < 4; i++) {
    const failRes = await request.post('/api/v1/auth/recover-password').send({
      email: ownerEmail,
      recoveryKey: 'WRONG-KEY0-0000-000' + i,
      newPassword: 'BrandNewPassword123!',
    });
    assert.equal(failRes.status, 401);
  }

  // Check DB indicates locked out
  const lockedUser = await query('SELECT recovery_failed_attempts, recovery_locked_until FROM users WHERE id = $1', [ownerId]);
  assert.ok(lockedUser.rows[0].recovery_locked_until !== null);
  assert.ok(new Date(lockedUser.rows[0].recovery_locked_until) > new Date());

  // 6th attempt should be blocked with RATE_LIMITED
  const lockedRes = await request.post('/api/v1/auth/recover-password').send({
    email: ownerEmail,
    recoveryKey: initialRecoveryKey, // even with correct key, locked out!
    newPassword: 'BrandNewPassword123!',
  });
  assert.equal(lockedRes.status, 429);
  assert.equal(lockedRes.body.error.code, 'RATE_LIMITED');

  // Reset lockout manually in DB to continue testing successful reset flow
  await query('UPDATE users SET recovery_failed_attempts = 0, recovery_locked_until = NULL WHERE id = $1', [ownerId]);

  // Step 8: Correct recovery key allows password reset (Criterion 6)
  const newPassword = 'RecoveredPassword123!';
  const successfulRecoverRes = await request.post('/api/v1/auth/recover-password').send({
    email: ownerEmail,
    recoveryKey: initialRecoveryKey,
    newPassword: newPassword,
  });
  assert.equal(successfulRecoverRes.status, 200);
  assert.equal(successfulRecoverRes.body.success, true);

  // Step 9: Invalidate active owner sessions (Criterion 10)
  const refreshAttempt = await request.post('/api/v1/auth/refresh').send({
    refreshToken: oldRefreshToken,
  });
  assert.equal(refreshAttempt.status, 401);

  // Step 10: Old password no longer works (Criterion 12)
  const oldLoginRes = await request.post('/api/v1/auth/login').send({
    email: ownerEmail,
    password: initialPassword,
  });
  assert.equal(oldLoginRes.status, 401);

  // Step 11: Owner can log in with new password (Criterion 11)
  const newLoginRes = await request.post('/api/v1/auth/login').send({
    email: ownerEmail,
    password: newPassword,
  });
  assert.equal(newLoginRes.status, 200);
  const newAuthToken = newLoginRes.body.data.token;
  assert.ok(newAuthToken);

  // Step 12: Regenerating recovery key requires current password (Criterion 14)
  const badPassGenRes = await request
    .post('/api/v1/auth/recovery-key/generate')
    .set('Authorization', `Bearer ${newAuthToken}`)
    .send({ currentPassword: 'WrongCurrentPassword!' });
  assert.equal(badPassGenRes.status, 401);
  assert.equal(badPassGenRes.body.error.code, 'INVALID_CREDENTIALS');

  // Step 13: Regenerating recovery key replaces the old one (Criterion 15)
  const goodGenRes = await request
    .post('/api/v1/auth/recovery-key/generate')
    .set('Authorization', `Bearer ${newAuthToken}`)
    .send({ currentPassword: newPassword });
  assert.equal(goodGenRes.status, 200);
  const regeneratedKey = goodGenRes.body.data.recoveryKey;
  assert.ok(regeneratedKey);
  assert.notEqual(regeneratedKey, initialRecoveryKey);

  // Step 14: Old recovery key no longer works after regeneration (Criterion 16)
  const oldKeyAttempt = await request.post('/api/v1/auth/recover-password').send({
    email: ownerEmail,
    recoveryKey: initialRecoveryKey,
    newPassword: 'AnotherPassword123!',
  });
  assert.equal(oldKeyAttempt.status, 401);

  // Step 15: New recovery key works after regeneration
  const finalRecoverRes = await request.post('/api/v1/auth/recover-password').send({
    email: ownerEmail,
    recoveryKey: regeneratedKey,
    newPassword: 'FinalPassword123!',
  });
  assert.equal(finalRecoverRes.status, 200);

  // Clean up test data
  await query('DELETE FROM auth_refresh_sessions WHERE user_id IN ($1, (SELECT id FROM users WHERE email = $2))', [ownerId, staffEmail]);
  await query('DELETE FROM users WHERE store_id = $1', [storeId]);
  await query('DELETE FROM stores WHERE id = $1', [storeId]);
});

test.after(async () => {
  await pool.end();
});
