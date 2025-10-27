import { pool } from '../config/database.config';
import { OrderAggregate } from '../models/order.aggregate';
import { OrderSaga } from '../sagas/order-saga';
import { CreateOrderRequest, OrderData, OrderStatus } from '../types/order.types';
import { logger } from '../utils/logger.utils';

import { cartService } from './cart.service';

export class OrderService {
  /**
   * Create a new order from cart
   */
  async createOrder(request: CreateOrderRequest): Promise<OrderData> {
    try {
      // Create order aggregate
      const order = new OrderAggregate();

      // Create the order (raises OrderCreated event)
      order.createOrder(request, {
        userId: request.userId,
        correlationId: order.getId(),
      });

      // Save order aggregate (persists events)
      await order.save();

      // Create read model projection
      await this.createOrderProjection(order);

      // Execute SAGA for order processing
      const saga = new OrderSaga(order);
      await saga.execute();

      // Clear the user's cart
      await cartService.clearCart(request.userId);

      logger.info(`Order created successfully: ${order.getId()}`);

      return order.getOrderData();
    } catch (error) {
      logger.error('Failed to create order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<OrderData | null> {
    const result = await pool.query(
      `SELECT o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name,
            'productSku', oi.product_sku,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'totalPrice', oi.total_price,
            'status', oi.status
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOrderData(result.rows[0]);
  }

  /**
   * Get orders for a user
   */
  async getUserOrders(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ orders: OrderData[]; total: number }> {
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM orders WHERE user_id = $1',
      [userId]
    );

    const result = await pool.query(
      `SELECT o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name,
            'productSku', oi.product_sku,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'totalPrice', oi.total_price
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      orders: result.rows.map((row: any) => this.mapRowToOrderData(row)),
      total: parseInt(countResult.rows[0].total),
    };
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason: string, userId: string): Promise<OrderData> {
    // Load order aggregate from events
    const order = new OrderAggregate(orderId);
    await order.loadFromHistory(orderId);

    // Cancel the order (raises OrderCancelled event)
    order.cancelOrder(reason, { userId });

    // Save (persists event and publishes)
    await order.save();

    // Update read model
    await this.updateOrderProjection(order);

    logger.info(`Order cancelled: ${orderId}`);

    return order.getOrderData();
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<OrderData | null> {
    const result = await pool.query(
      `SELECT o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name,
            'productSku', oi.product_sku,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'totalPrice', oi.total_price
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.order_number = $1
      GROUP BY o.id`,
      [orderNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOrderData(result.rows[0]);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    userId?: string
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current status
      const result = await client.query(
        'SELECT status FROM orders WHERE id = $1',
        [orderId]
      );

      if (result.rows.length === 0) {
        throw new Error('Order not found');
      }

      const oldStatus = result.rows[0].status;

      // Update status
      await client.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [newStatus, orderId]
      );

      // Record status change
      await client.query(
        `INSERT INTO order_status_history 
         (order_id, from_status, to_status, changed_by)
         VALUES ($1, $2, $3, $4)`,
        [orderId, oldStatus, newStatus, userId || 'system']
      );

      await client.query('COMMIT');

      logger.info(`Order ${orderId} status updated: ${oldStatus} -> ${newStatus}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(userId?: string): Promise<any> {
    const whereClause = userId ? 'WHERE user_id = $1' : '';
    const params = userId ? [userId] : [];

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        SUM(total_amount) FILTER (WHERE status = 'completed') as total_revenue,
        AVG(total_amount) FILTER (WHERE status = 'completed') as average_order_value
      FROM orders ${whereClause}`,
      params
    );

    return result.rows[0];
  }

  // ============= Private Methods =============

  /**
   * Create order projection (read model) from aggregate
   */
  private async createOrderProjection(order: OrderAggregate): Promise<void> {
    const orderData = order.getOrderData();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert order
      await client.query(
        `INSERT INTO orders 
         (id, order_number, user_id, status, subtotal, tax_amount, 
          shipping_amount, discount_amount, total_amount, currency,
          shipping_address, billing_address, payment_method, payment_status,
          fulfillment_status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          orderData.orderId,
          orderData.orderNumber,
          orderData.userId,
          orderData.status,
          orderData.pricing.subtotal,
          orderData.pricing.taxAmount,
          orderData.pricing.shippingAmount,
          orderData.pricing.discountAmount,
          orderData.pricing.totalAmount,
          orderData.pricing.currency,
          orderData.shippingAddress,
          orderData.billingAddress,
          orderData.paymentMethod,
          orderData.paymentStatus,
          orderData.fulfillmentStatus,
          orderData.notes,
        ]
      );

      // Insert order items
      for (const item of orderData.items) {
        await client.query(
          `INSERT INTO order_items 
           (order_id, product_id, product_name, product_sku, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            orderData.orderId,
            item.productId,
            item.productName,
            item.productSku,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update order projection from aggregate
   */
  private async updateOrderProjection(order: OrderAggregate): Promise<void> {
    const orderData = order.getOrderData();

    await pool.query(
      `UPDATE orders 
       SET status = $1, 
           payment_status = $2, 
           fulfillment_status = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [
        orderData.status,
        orderData.paymentStatus,
        orderData.fulfillmentStatus,
        orderData.orderId,
      ]
    );
  }

  /**
   * Map database row to OrderData
   */
  private mapRowToOrderData(row: any): OrderData {
    return {
      orderId: row.id,
      orderNumber: row.order_number,
      userId: row.user_id,
      status: row.status,
      items: row.items || [],
      pricing: {
        subtotal: parseFloat(row.subtotal),
        taxAmount: parseFloat(row.tax_amount),
        shippingAmount: parseFloat(row.shipping_amount),
        discountAmount: parseFloat(row.discount_amount),
        totalAmount: parseFloat(row.total_amount),
        currency: row.currency,
      },
      shippingAddress: row.shipping_address,
      billingAddress: row.billing_address,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      fulfillmentStatus: row.fulfillment_status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const orderService = new OrderService();
