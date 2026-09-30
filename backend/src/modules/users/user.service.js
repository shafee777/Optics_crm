import bcrypt from 'bcrypt';
import { userRepository } from './user.repository.js';
import { authRepository } from '../auth/auth.repository.js';
import { AppError } from '../../shared/errors/AppError.js';
import { withTransaction } from '../../config/database.js';

export const userService = {
  async listUsers(storeId) {
    return userRepository.findByStoreId(storeId);
  },

  async createUser(storeId, { fullName, email, password, role }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('A user with this email address already exists', 409, 'EMAIL_EXISTS');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    return userRepository.create(storeId, {
      fullName,
      email,
      passwordHash,
      role,
    });
  },

  async updateUserStatus(storeId, currentUserId, targetUserId, active) {
    if (currentUserId === targetUserId && !active) {
      throw new AppError('You cannot deactivate your own account', 400, 'CANNOT_DEACTIVATE_SELF');
    }

    const targetUser = await userRepository.findById(storeId, targetUserId);
    if (!targetUser) {
      throw new AppError('User not found in this store', 404, 'USER_NOT_FOUND');
    }

    if (targetUser.role === 'OWNER' && !active) {
      const activeOwners = await userRepository.countActiveOwners(storeId);
      if (activeOwners <= 1) {
        throw new AppError('Cannot deactivate the last active owner of the store', 400, 'CANNOT_DEACTIVATE_LAST_OWNER');
      }
    }

    return withTransaction(async (client) => {
      const updated = await userRepository.updateStatus(storeId, targetUserId, active);
      // On deactivation, immediately invalidate all active sessions so the
      // user cannot continue using an existing refresh token to get new access tokens.
      if (!active) {
        await authRepository.revokeAllUserSessions(targetUserId, client);
      }
      return updated;
    });
  },

  async resetPassword(storeId, targetUserId, newPassword) {
    const targetUser = await userRepository.findById(storeId, targetUserId);
    if (!targetUser) {
      throw new AppError('User not found in this store', 404, 'USER_NOT_FOUND');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    return withTransaction(async (client) => {
      const updated = await userRepository.updatePassword(storeId, targetUserId, passwordHash);
      // Revoke all existing sessions so holders of old refresh tokens must
      // log in again with the new password.
      await authRepository.revokeAllUserSessions(targetUserId, client);
      return updated;
    });
  },
};
