import { Request, Response, NextFunction } from 'express';

import { orderService } from '../services/order.service';
import { CreateOrderRequest, OrderStatus } from '../types/order.types';
import { logger } from '../utils/logger.utils';

export class OrderController {
  /**
   * Create a new order
   */
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const orderRequest: CreateOrderRequest = {
        userId,
        ...req.body,
      };

      // Validate required fields
      if (!orderRequest.items || orderRequest.items.length === 0) {
        res.status(400).json({ error: 'Order must have at least one item' });
        return;
      }

      if (!orderRequest.shippingAddress || !orderRequest.billingAddress) {
        res.status(400).json({ error: 'Shipping and billing addresses required' });
        return;
      }

      const order = await orderService.createOrder(orderRequest);

      res.status(201).json(order);
    } catch (error: any) {
      logger.error('Error creating order:', error);
      res.status(500).json({
        error: 'Failed to create order',
        message: error.message,
      });
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const order = await orderService.getOrderById(orderId);

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Check if user owns this order (in production, add proper authorization)
      if (order.userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json(order);
    } catch (error) {
      logger.error('Error getting order:', error);
      next(error);
    }
  }

  /**
   * Get user's orders
   */
  async getUserOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const result = await orderService.getUserOrders(userId, limit, offset);

      res.json({
        orders: result.orders,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      logger.error('Error getting user orders:', error);
      next(error);
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderNumber } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const order = await orderService.getOrderByNumber(orderNumber);

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Check if user owns this order
      if (order.userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json(order);
    } catch (error) {
      logger.error('Error getting order by number:', error);
      next(error);
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { reason } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      if (!reason) {
        res.status(400).json({ error: 'Cancellation reason required' });
        return;
      }

      // Verify ownership
      const existingOrder = await orderService.getOrderById(orderId);
      if (!existingOrder || existingOrder.userId !== userId) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      const order = await orderService.cancelOrder(orderId, reason, userId);

      res.json(order);
    } catch (error: any) {
      logger.error('Error cancelling order:', error);
      res.status(400).json({
        error: 'Failed to cancel order',
        message: error.message,
      });
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;

      const stats = await orderService.getOrderStatistics(userId);

      res.json(stats);
    } catch (error) {
      logger.error('Error getting order statistics:', error);
      next(error);
    }
  }
}

export const orderController = new OrderController();
