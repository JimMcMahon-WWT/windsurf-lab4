import reviewRepository from '../repositories/review.repository';
import productRepository from '../repositories/product.repository';
import { logger } from '../utils/logger.utils';
import { ProductReview, CreateReviewRequest } from '../types/product.types';

export class ReviewService {
  /**
   * Get reviews for a product
   */
  async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ reviews: ProductReview[]; total: number; page: number; limit: number }> {
    try {
      const offset = (page - 1) * limit;
      const { reviews, total } = await reviewRepository.findByProductId(
        productId,
        limit,
        offset
      );

      return { reviews, total, page, limit };
    } catch (error) {
      logger.error('Error getting reviews:', error);
      throw error;
    }
  }

  /**
   * Get reviews by user
   */
  async getUserReviews(userId: string): Promise<ProductReview[]> {
    try {
      return await reviewRepository.findByUserId(userId);
    } catch (error) {
      logger.error('Error getting user reviews:', error);
      throw error;
    }
  }

  /**
   * Create a review
   */
  async createReview(
    userId: string,
    data: CreateReviewRequest,
    isVerifiedPurchase: boolean = false
  ): Promise<ProductReview> {
    try {
      // Check if product exists
      const product = await productRepository.findById(data.product_id);
      if (!product) {
        throw new Error('Product not found');
      }

      // Create review
      const review = await reviewRepository.create({
        product_id: data.product_id,
        user_id: userId,
        rating: data.rating,
        title: data.title || null,
        comment: data.comment || null,
        is_verified_purchase: isVerifiedPurchase,
        is_approved: true, // Auto-approve, can be changed to require moderation
        helpful_count: 0,
        not_helpful_count: 0,
        merchant_response: null,
        merchant_response_at: null,
      });

      logger.info(`Review created: ${review.id} for product ${data.product_id}`);

      return review;
    } catch (error) {
      logger.error('Error creating review:', error);
      throw error;
    }
  }

  /**
   * Update a review
   */
  async updateReview(
    reviewId: string,
    userId: string,
    data: Partial<ProductReview>
  ): Promise<ProductReview> {
    try {
      const review = await reviewRepository.findById(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      // Check ownership
      if (review.user_id !== userId) {
        throw new Error('Unauthorized to update this review');
      }

      const updated = await reviewRepository.update(reviewId, data);

      logger.info(`Review updated: ${reviewId}`);

      return updated;
    } catch (error) {
      logger.error('Error updating review:', error);
      throw error;
    }
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string, userId: string): Promise<void> {
    try {
      const review = await reviewRepository.findById(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      // Check ownership
      if (review.user_id !== userId) {
        throw new Error('Unauthorized to delete this review');
      }

      await reviewRepository.delete(reviewId);

      logger.info(`Review deleted: ${reviewId}`);
    } catch (error) {
      logger.error('Error deleting review:', error);
      throw error;
    }
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string, helpful: boolean): Promise<void> {
    try {
      await reviewRepository.markHelpful(reviewId, helpful);
      logger.debug(`Review ${reviewId} marked as ${helpful ? 'helpful' : 'not helpful'}`);
    } catch (error) {
      logger.error('Error marking review:', error);
      throw error;
    }
  }

  /**
   * Add merchant response
   */
  async addMerchantResponse(reviewId: string, response: string): Promise<ProductReview> {
    try {
      const updated = await reviewRepository.addMerchantResponse(reviewId, response);
      logger.info(`Merchant response added to review: ${reviewId}`);
      return updated;
    } catch (error) {
      logger.error('Error adding merchant response:', error);
      throw error;
    }
  }

  /**
   * Get rating distribution for a product
   */
  async getRatingDistribution(productId: string): Promise<Record<number, number>> {
    try {
      return await reviewRepository.getRatingDistribution(productId);
    } catch (error) {
      logger.error('Error getting rating distribution:', error);
      throw error;
    }
  }
}

export default new ReviewService();
