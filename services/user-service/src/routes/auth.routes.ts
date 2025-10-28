import { Router } from 'express';

import authController from '../controllers/auth.controller';
import { authLimiter, createAccountLimiter } from '../middlewares/rate-limit.middleware';

const router = Router();

// Registration with strict rate limiting (3 per hour)
router.post('/register', createAccountLimiter, authController.register.bind(authController));

// Login with auth rate limiting (5 per 15 minutes)
router.post('/login', authLimiter, authController.login.bind(authController));

// Logout with auth rate limiting
router.post('/logout', authLimiter, authController.logout.bind(authController));

export default router;
