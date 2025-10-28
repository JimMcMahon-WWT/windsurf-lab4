import { pool } from '../config/database.config';
import { ProductReview } from '../types/product.types';

export class ReviewRepository {
  async findById(id: string): Promise<ProductReview | null> {
    const result = await pool.query('SELECT * FROM product_reviews WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByProductId(
    productId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ reviews: ProductReview[]; total: number }> {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM product_reviews WHERE product_id = $1 AND is_approved = TRUE',
      [productId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM product_reviews 
       WHERE product_id = $1 AND is_approved = TRUE
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    );

    return {
      reviews: result.rows,
      total,
    };
  }

  async findByUserId(userId: string): Promise<ProductReview[]> {
    const result = await pool.query(
      'SELECT * FROM product_reviews WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async create(
    data: Omit<ProductReview, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ProductReview> {
    const result = await pool.query(
      `INSERT INTO product_reviews (
        product_id, user_id, rating, title, comment,
        is_verified_purchase, is_approved
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.product_id,
        data.user_id,
        data.rating,
        data.title || null,
        data.comment || null,
        data.is_verified_purchase || false,
        data.is_approved !== undefined ? data.is_approved : true,
      ]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<ProductReview>): Promise<ProductReview> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (
        value !== undefined &&
        key !== 'id' &&
        key !== 'product_id' &&
        key !== 'user_id' &&
        key !== 'created_at'
      ) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return (await this.findById(id))!;
    }

    values.push(id);

    const query = `
      UPDATE product_reviews 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM product_reviews WHERE id = $1', [id]);
  }

  async markHelpful(reviewId: string, helpful: boolean): Promise<void> {
    const field = helpful ? 'helpful_count' : 'not_helpful_count';
    await pool.query(`UPDATE product_reviews SET ${field} = ${field} + 1 WHERE id = $1`, [
      reviewId,
    ]);
  }

  async addMerchantResponse(reviewId: string, response: string): Promise<ProductReview> {
    const result = await pool.query(
      `UPDATE product_reviews 
       SET merchant_response = $1, merchant_response_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [response, reviewId]
    );
    return result.rows[0];
  }

  async getAverageRatingByProduct(productId: string): Promise<number> {
    const result = await pool.query(
      'SELECT AVG(rating)::DECIMAL(3,2) as avg_rating FROM product_reviews WHERE product_id = $1 AND is_approved = TRUE',
      [productId]
    );
    return parseFloat(result.rows[0].avg_rating) || 0;
  }

  async getRatingDistribution(productId: string): Promise<Record<number, number>> {
    const result = await pool.query(
      `SELECT rating, COUNT(*) as count 
       FROM product_reviews 
       WHERE product_id = $1 AND is_approved = TRUE
       GROUP BY rating
       ORDER BY rating DESC`,
      [productId]
    );

    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    result.rows.forEach((row) => {
      distribution[row.rating] = parseInt(row.count);
    });

    return distribution;
  }
}

export default new ReviewRepository();
