import { authService } from './auth.service.js';

export const authController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async me(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.userId);
      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req, res, next) {
    try {
      const tokens = await authService.refresh(req.body.refreshToken);
      res.status(200).json({ success: true, data: tokens });
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res, next) {
    try {
      await authService.logout(req.body.refreshToken);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};