import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authRepository } from './auth.repository.js';

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

    // Sign JWT with minimal payload
    const token = jwt.sign(
      {
        userId: user.id,
        storeId: user.store_id,
        role: user.role,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    console.log(token);
    return {
      token,
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