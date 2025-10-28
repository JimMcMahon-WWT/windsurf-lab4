import { Request, Response, NextFunction } from 'express';

import { cartService } from '../services/cart.service';
import { logger } from '../utils/logger.utils';

export class CartController {
  /**
   * Get user's cart
   */
  async getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const cart = await cartService.getOrCreateCart(userId);
      const totals = await cartService.getCartTotals(userId);

      res.json({
        cart,
        totals,
      });
    } catch (error) {
      logger.error('Error getting cart:', error);
      next(error);
    }
  }

  /**
   * Add item to cart
   */
  async addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const { productId, productName, productSku, quantity, price } = req.body;

      if (!productId || !productName || !quantity || !price) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const cart = await cartService.addItem(userId, {
        productId,
        productName,
        productSku,
        quantity,
        price,
      });

      const totals = await cartService.getCartTotals(userId);

      res.json({
        cart,
        totals,
      });
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      next(error);
    }
  }

  /**
   * Update item quantity
   */
  async updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { productId } = req.params;
      const { quantity } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      if (quantity === undefined) {
        res.status(400).json({ error: 'Quantity required' });
        return;
      }

      const cart = await cartService.updateItemQuantity(userId, productId, quantity);
      const totals = await cartService.getCartTotals(userId);

      res.json({
        cart,
        totals,
      });
    } catch (error) {
      logger.error('Error updating cart item:', error);
      next(error);
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { productId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const cart = await cartService.removeItem(userId, productId);
      const totals = await cartService.getCartTotals(userId);

      res.json({
        cart,
        totals,
      });
    } catch (error) {
      logger.error('Error removing cart item:', error);
      next(error);
    }
  }

  /**
   * Clear cart
   */
  async clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      await cartService.clearCart(userId);

      res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
      logger.error('Error clearing cart:', error);
      next(error);
    }
  }
}

export const cartController = new CartController();
