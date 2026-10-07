import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authRepository } from './auth.repository.js';
import { withTransaction } from '../../config/database.js';
import { generateRecoveryKey, normalizeRecoveryKey } from '../../utils/recoveryKey.js';

// Pre-computed dummy bcrypt hash of a random string with 10 salt rounds for constant-time comparison
const DUMMY_HASH = '$2b$10$v09gN9m2rM81Ew8q5B97j.s3Z3UuL3H4kU6a8uQeA0FzN3L0P5l1q';

export const authService = {
  async login(email, password) {
    if (env.NODE_ENV === 'production') {
      const DEMO_EMAILS = new Set([
        'owner@visioncare.com',
        'staff@visioncare.com',
        'owner@cityeye.com',
      ]);
      const normalizedEmail = (email || '').toLowerCase().trim();
      if (DEMO_EMAILS.has(normalizedEmail) || password === 'Password123!') {
        throw new AppError(
          'Demo accounts and default passwords cannot be used in production.',
          403,
          'DEMO_ACCOUNTS_PROHIBITED'
        );
      }
    }

    const user = await authRepository.findByEmailWithStore(email);

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.active) {
      throw new AppError('Your account has been deactivated. Please contact store owner.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const tokens = this.issueTokens(user);
    await authRepository.createRefreshSession(
      user.id,
      tokens.refreshJti,
      this.hashToken(tokens.refreshToken),
      tokens.refreshExpiresAt
    );

    return {
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        store: {
          id: user.store_id,
          name: user.store_name,
          phone: user.store_phone,
          email: user.store_email,
          address: user.store_address,
          gstin: user.store_gstin,
          logoUrl: user.store_logo_url,
          currency: user.currency,
          timezone: user.timezone,
        },
      },
    };
  },

  issueTokens(user) {
    const refreshJti = crypto.randomUUID();
    const accessToken = jwt.sign(
      { userId: user.id, storeId: user.store_id, role: user.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
    const refreshToken = jwt.sign(
      { userId: user.id, storeId: user.store_id, type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN, jwtid: refreshJti }
    );
    const refreshExpiresAt = new Date(jwt.decode(refreshToken).exp * 1000);
    return { accessToken, refreshToken, refreshJti, refreshExpiresAt };
  },

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  async refresh(refreshToken) {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch (_error) {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (decoded.type !== 'refresh' || !decoded.jti || !decoded.userId) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    return await withTransaction(async (client) => {
      const session = await authRepository.findActiveRefreshSession(
        decoded.jti,
        this.hashToken(refreshToken),
        client
      );
      if (!session) {
        throw new AppError('Refresh token has been revoked or already used', 401, 'REFRESH_TOKEN_REVOKED');
      }

      const user = await authRepository.findByIdWithStore(decoded.userId);
      if (!user || !user.active) {
        throw new AppError('User not found or inactive', 401, 'USER_NOT_FOUND');
      }

      const tokens = this.issueTokens(user);
      await authRepository.revokeRefreshSession(decoded.jti, client);
      await authRepository.createRefreshSession(
        user.id,
        tokens.refreshJti,
        this.hashToken(tokens.refreshToken),
        tokens.refreshExpiresAt,
        client
      );

      return {
        token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  },

  async logout(refreshToken) {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch (_error) {
      return;
    }
    if (decoded.type === 'refresh' && decoded.jti) {
      await authRepository.revokeRefreshSession(decoded.jti);
    }
  },

  async getCurrentUser(userId) {
    const user = await authRepository.findByIdWithStore(userId);
    if (!user || !user.active) {
      throw new AppError('User not found or inactive', 404, 'USER_NOT_FOUND');
    }

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      store: {
        id: user.store_id,
        name: user.store_name,
        phone: user.store_phone,
        email: user.store_email,
        address: user.store_address,
        gstin: user.store_gstin,
        logoUrl: user.store_logo_url,
        currency: user.currency,
        timezone: user.timezone,
      },
    };
  },

  /**
   * Recovers an owner account using a previously saved recovery key.
   * Mitigates timing attacks and prevents user/role enumeration.
   */
  async recoverPassword(email, recoveryKey, newPassword) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const normalizedKey = normalizeRecoveryKey(recoveryKey);

    const user = await authRepository.findByEmailForRecovery(normalizedEmail);

    // If user does not exist, is deactivated, is NOT an OWNER, or has no recovery key set:
    // Execute dummy bcrypt comparison to ensure constant-time response and prevent account enumeration.
    if (!user || !user.active || user.role !== 'OWNER' || !user.recovery_key_hash) {
      await bcrypt.compare(normalizedKey, DUMMY_HASH);
      throw new AppError('Invalid recovery credentials.', 401, 'INVALID_RECOVERY_CREDENTIALS');
    }

    // Check account lockout
    if (user.recovery_locked_until && new Date(user.recovery_locked_until) > new Date()) {
      throw new AppError('Too many recovery attempts. Please try again later.', 429, 'RATE_LIMITED');
    }

    const isMatch = await bcrypt.compare(normalizedKey, user.recovery_key_hash);
    if (!isMatch) {
      const attempts = (user.recovery_failed_attempts || 0) + 1;
      let lockUntil = null;
      if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minute lockout
      }
      await authRepository.recordFailedRecoveryAttempt(user.id, attempts, lockUntil);
      throw new AppError('Invalid recovery credentials.', 401, 'INVALID_RECOVERY_CREDENTIALS');
    }

    // Key is valid - hash new password and update
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await withTransaction(async (client) => {
      await authRepository.resetPasswordFromRecovery(user.id, newPasswordHash, client);
      await authRepository.revokeAllUserSessions(user.id, client);
    });

    return {
      message: 'Password reset successful. Please sign in with your new password.',
    };
  },

  /**
   * Retrieves whether the authenticated owner currently has an active recovery key.
   */
  async getRecoveryKeyStatus(userId) {
    const hasRecoveryKey = await authRepository.getRecoveryKeyStatus(userId);
    return { hasRecoveryKey };
  },

  /**
   * Generates or regenerates an owner recovery key.
   * Requires the owner's current password for verification.
   * Returns the plaintext key ONCE.
   */
  async generateRecoveryKey(userId, currentPassword) {
    const currentHash = await authRepository.getUserPasswordHash(userId);
    if (!currentHash) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, currentHash);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect.', 401, 'INVALID_CREDENTIALS');
    }

    const plaintextKey = generateRecoveryKey();
    const keyHash = await bcrypt.hash(plaintextKey, 10);

    await authRepository.updateRecoveryKeyHash(userId, keyHash);

    return {
      recoveryKey: plaintextKey,
    };
  },
};