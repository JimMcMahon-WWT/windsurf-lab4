import { Router } from 'express';

import reviewController from '../controllers/review.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createReviewSchema } from '../validators/product.validator';

const router = Router();

// Public routes
router.get('/products/:product_id', reviewController.getProductReviews);
router.get('/products/:product_id/distribution', reviewController.getRatingDistribution);

// Protected routes - require authentication
router.get('/me', authenticate, reviewController.getUserReviews);

router.post('/', authenticate, validate(createReviewSchema), reviewController.createReview);

router.put('/:id', authenticate, reviewController.updateReview);

router.delete('/:id', authenticate, reviewController.deleteReview);

router.post('/:id/helpful', reviewController.markHelpful);

router.post(
  '/:id/merchant-response',
  authenticate,
  authorize('admin', 'merchant'),
  reviewController.addMerchantResponse
);

export default router;
