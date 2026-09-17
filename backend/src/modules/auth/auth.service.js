import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authRepository } from './auth.repository.js';
import { withTransaction } from '../../config/database.js';

export const authService = {
  async login(email, password) {
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
        currency: user.currency,
        timezone: user.timezone,
      },
    };
  },
};