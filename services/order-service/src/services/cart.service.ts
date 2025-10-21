import { pool } from '../config/database.config';
import { cacheSet, cacheGet, cacheDelete } from '../config/redis.config';
import { logger } from '../utils/logger.utils';
import { v4 as uuidv4 } from 'uuid';

export interface CartItem {
  id?: string;
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  price: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  status: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class CartService {
  private CART_CACHE_PREFIX = 'cart:';
  private CART_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

  /**
   * Get or create a cart for a user
   */
  async getOrCreateCart(userId: string): Promise<Cart> {
    // Try cache first
    const cached = await cacheGet(`${this.CART_CACHE_PREFIX}${userId}`);
    if (cached) {
      return cached;
    }

    // Get from database
    let cart = await this.getActiveCart(userId);

    if (!cart) {
      cart = await this.createCart(userId);
    }

    // Cache it
    await cacheSet(`${this.CART_CACHE_PREFIX}${userId}`, cart, this.CART_EXPIRY);

    return cart;
  }

  /**
   * Get active cart from database
   */
  private async getActiveCart(userId: string): Promise<Cart | null> {
    const result = await pool.query(
      `SELECT c.*, 
        json_agg(
          json_build_object(
            'id', ci.id,
            'productId', ci.product_id,
            'productName', ci.product_name,
            'productSku', ci.product_sku,
            'quantity', ci.quantity,
            'price', ci.price
          )
        ) FILTER (WHERE ci.id IS NOT NULL) as items
      FROM carts c
      LEFT JOIN cart_items ci ON c.id = ci.cart_id
      WHERE c.user_id = $1 AND c.status = 'active'
      AND (c.expires_at IS NULL OR c.expires_at > NOW())
      GROUP BY c.id
      LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      items: row.items || [],
      status: row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Create a new cart
   */
  private async createCart(userId: string): Promise<Cart> {
    const cartId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO carts (id, user_id, status, expires_at)
       VALUES ($1, $2, 'active', $3)`,
      [cartId, userId, expiresAt]
    );

    logger.info(`Created cart ${cartId} for user ${userId}`);

    return {
      id: cartId,
      userId,
      items: [],
      status: 'active',
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Add item to cart
   */
  async addItem(
    userId: string,
    item: Omit<CartItem, 'id'>
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    // Check if item already exists
    const existingItemResult = await pool.query(
      'SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cart.id, item.productId]
    );

    if (existingItemResult.rows.length > 0) {
      // Update quantity
      await pool.query(
        `UPDATE cart_items 
         SET quantity = quantity + $1, updated_at = NOW()
         WHERE cart_id = $2 AND product_id = $3`,
        [item.quantity, cart.id, item.productId]
      );
    } else {
      // Add new item
      await pool.query(
        `INSERT INTO cart_items 
         (cart_id, product_id, product_name, product_sku, quantity, price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          cart.id,
          item.productId,
          item.productName,
          item.productSku,
          item.quantity,
          item.price,
        ]
      );
    }

    // Update cart timestamp
    await pool.query(
      'UPDATE carts SET updated_at = NOW() WHERE id = $1',
      [cart.id]
    );

    // Invalidate cache
    await cacheDelete(`${this.CART_CACHE_PREFIX}${userId}`);

    logger.info(`Added item to cart ${cart.id}: ${item.productName}`);

    return await this.getOrCreateCart(userId);
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    if (quantity <= 0) {
      // Remove item
      await pool.query(
        'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2',
        [cart.id, productId]
      );
    } else {
      // Update quantity
      await pool.query(
        `UPDATE cart_items 
         SET quantity = $1, updated_at = NOW()
         WHERE cart_id = $2 AND product_id = $3`,
        [quantity, cart.id, productId]
      );
    }

    // Update cart timestamp
    await pool.query(
      'UPDATE carts SET updated_at = NOW() WHERE id = $1',
      [cart.id]
    );

    // Invalidate cache
    await cacheDelete(`${this.CART_CACHE_PREFIX}${userId}`);

    return await this.getOrCreateCart(userId);
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId: string, productId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    await pool.query(
      'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cart.id, productId]
    );

    // Invalidate cache
    await cacheDelete(`${this.CART_CACHE_PREFIX}${userId}`);

    logger.info(`Removed item from cart ${cart.id}: ${productId}`);

    return await this.getOrCreateCart(userId);
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);

    await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
    
    // Mark cart as converted or create new one
    await pool.query(
      `UPDATE carts SET status = 'converted', updated_at = NOW() WHERE id = $1`,
      [cart.id]
    );

    // Invalidate cache
    await cacheDelete(`${this.CART_CACHE_PREFIX}${userId}`);

    logger.info(`Cleared cart ${cart.id}`);
  }

  /**
   * Get cart totals
   */
  async getCartTotals(userId: string): Promise<{
    itemCount: number;
    subtotal: number;
  }> {
    const cart = await this.getOrCreateCart(userId);

    const totals = cart.items.reduce(
      (acc, item) => ({
        itemCount: acc.itemCount + item.quantity,
        subtotal: acc.subtotal + item.price * item.quantity,
      }),
      { itemCount: 0, subtotal: 0 }
    );

    return totals;
  }

  /**
   * Clean up expired carts
   */
  async cleanupExpiredCarts(): Promise<number> {
    const result = await pool.query(
      `UPDATE carts 
       SET status = 'expired'
       WHERE status = 'active' 
       AND expires_at < NOW()
       RETURNING id`
    );

    logger.info(`Cleaned up ${result.rowCount} expired carts`);
    return result.rowCount || 0;
  }
}

export const cartService = new CartService();
