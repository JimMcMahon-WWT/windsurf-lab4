import { Request, Response } from 'express';
import userService from '../services/user.service';
import logger from '../config/logger';

export class UserController {
  /**
   * GET /api/users/profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // In a real app, userId would come from authenticated user
      const userId = req.params.id || (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const user = await userService.getProfile(userId);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      logger.error('Get profile error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'User not found',
      });
    }
  }

  /**
   * PUT /api/users/profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const user = await userService.updateProfile(userId, req.body);
      res.status(200).json({
        success: true,
        data: user,
        message: 'Profile updated successfully',
      });
    } catch (error: any) {
      logger.error('Update profile error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Profile update failed',
      });
    }
  }
}

export default new UserController();
