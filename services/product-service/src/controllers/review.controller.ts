import { Request, Response, NextFunction } from 'express';

import reviewService from '../services/review.service';

export class ReviewController {
  /**
   * Get product reviews
   */
  async getProductReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { product_id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await reviewService.getProductReviews(
        product_id,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user reviews
   */
  async getUserReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id; // From auth middleware

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const reviews = await reviewService.getUserReviews(userId);

      res.json(reviews);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create review
   */
  async createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = req.body;

      // TODO: Check if user has purchased the product
      const isVerifiedPurchase = false;

      const review = await reviewService.createReview(userId, data, isVerifiedPurchase);

      res.status(201).json(review);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update review
   */
  async updateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = req.body;

      const review = await reviewService.updateReview(id, userId, data);

      res.json(review);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete review
   */
  async deleteReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await reviewService.deleteReview(id, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { helpful } = req.body;

      await reviewService.markHelpful(id, helpful);

      res.json({ message: 'Review marked successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add merchant response
   */
  async addMerchantResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { response } = req.body;

      // TODO: Check if user is merchant/admin

      const review = await reviewService.addMerchantResponse(id, response);

      res.json(review);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rating distribution
   */
  async getRatingDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { product_id } = req.params;

      const distribution = await reviewService.getRatingDistribution(product_id);

      res.json(distribution);
    } catch (error) {
      next(error);
    }
  }
}

export default new ReviewController();
