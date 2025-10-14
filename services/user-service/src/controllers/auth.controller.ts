import { Request, Response } from 'express';
import userService from '../services/user.service';
import logger from '../config/logger';

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.register(req.body);
      res.status(201).json({
        success: true,
        data: user,
        message: 'User registered successfully',
      });
    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await userService.login(req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Login failed',
      });
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(_req: Request, res: Response): Promise<void> {
    // In a real app, you'd invalidate the token here
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  }
}

export default new AuthController();
