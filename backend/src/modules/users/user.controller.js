import { userService } from './user.service.js';

export const userController = {
  async listUsers(req, res, next) {
    try {
      const users = await userService.listUsers(req.user.storeId);
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  },

  async createUser(req, res, next) {
    try {
      const newUser = await userService.createUser(req.user.storeId, req.body);
      res.status(201).json({
        success: true,
        data: newUser,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const updated = await userService.updateUserStatus(
        req.user.storeId,
        req.user.userId,
        req.params.id,
        req.body.active
      );
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const updated = await userService.resetPassword(
        req.user.storeId,
        req.params.id,
        req.body.password
      );
      res.status(200).json({
        success: true,
        data: {
          id: updated.id,
          message: 'Password reset successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
