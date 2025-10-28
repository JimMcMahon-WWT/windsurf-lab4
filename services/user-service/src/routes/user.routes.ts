import { Router } from 'express';

import userController from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { apiLimiter } from '../middlewares/rate-limit.middleware';

const router = Router();

// Protected routes - require authentication and rate limiting
router.get('/profile', apiLimiter, authenticate, userController.getProfile.bind(userController));
router.put('/profile', apiLimiter, authenticate, userController.updateProfile.bind(userController));

// Admin only route with rate limiting
router.get(
  '/:id',
  apiLimiter,
  authenticate,
  authorize('admin'),
  userController.getProfile.bind(userController)
);

export default router;
