import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Protected routes - require authentication
router.get('/profile', authenticate, userController.getProfile.bind(userController));
router.put('/profile', authenticate, userController.updateProfile.bind(userController));

// Admin only route
router.get('/:id', authenticate, authorize('admin'), userController.getProfile.bind(userController));

export default router;
