import bcrypt from 'bcrypt';
import { userRepository } from './user.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

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

    const updated = await userRepository.updateStatus(storeId, targetUserId, active);
    return updated;
  },

  async resetPassword(storeId, targetUserId, newPassword) {
    const targetUser = await userRepository.findById(storeId, targetUserId);
    if (!targetUser) {
      throw new AppError('User not found in this store', 404, 'USER_NOT_FOUND');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    return userRepository.updatePassword(storeId, targetUserId, passwordHash);
  }
};
