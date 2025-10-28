import { pool } from '../config/database.config';
import {
  Inventory,
  InventoryReservation,
  InventoryHistory,
  InventoryChangeType,
  ReservationStatus,
} from '../types/product.types';

export class InventoryRepository {
  // ==================== INVENTORY MANAGEMENT ====================

  async findByProductId(productId: string): Promise<Inventory | null> {
    const result = await pool.query('SELECT * FROM inventory WHERE product_id = $1', [productId]);
    return result.rows[0] || null;
  }

  async findByVariantId(variantId: string): Promise<Inventory | null> {
    const result = await pool.query('SELECT * FROM inventory WHERE variant_id = $1', [variantId]);
    return result.rows[0] || null;
  }

  async create(
    data: Omit<Inventory, 'id' | 'available_quantity' | 'created_at' | 'updated_at'>
  ): Promise<Inventory> {
    const result = await pool.query(
      `INSERT INTO inventory (
        product_id, variant_id, quantity, reserved_quantity,
        low_stock_threshold, reorder_point, reorder_quantity,
        warehouse_id, location_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.product_id || null,
        data.variant_id || null,
        data.quantity,
        data.reserved_quantity || 0,
        data.low_stock_threshold || 10,
        data.reorder_point || 20,
        data.reorder_quantity || 50,
        data.warehouse_id || null,
        data.location_code || null,
      ]
    );
    return result.rows[0];
  }

  async updateQuantity(
    id: string,
    quantityChange: number,
    changeType: InventoryChangeType,
    userId?: string,
    reason?: string
  ): Promise<Inventory> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current inventory
      const currentResult = await client.query('SELECT * FROM inventory WHERE id = $1 FOR UPDATE', [
        id,
      ]);
      const current = currentResult.rows[0];

      if (!current) {
        throw new Error('Inventory not found');
      }

      const newQuantity = current.quantity + quantityChange;

      if (newQuantity < 0) {
        throw new Error('Insufficient inventory');
      }

      // Update inventory
      const updateResult = await client.query(
        `UPDATE inventory 
         SET quantity = $1, 
             last_sold_at = CASE WHEN $3 = 'sale' THEN CURRENT_TIMESTAMP ELSE last_sold_at END,
             last_restocked_at = CASE WHEN $3 = 'restock' THEN CURRENT_TIMESTAMP ELSE last_restocked_at END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [newQuantity, id, changeType]
      );

      // Log history
      await client.query(
        `INSERT INTO inventory_history (
          product_id, variant_id, change_type, quantity_change,
          quantity_before, quantity_after, reason, performed_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          current.product_id,
          current.variant_id,
          changeType,
          quantityChange,
          current.quantity,
          newQuantity,
          reason || null,
          userId || null,
        ]
      );

      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async adjustQuantity(
    id: string,
    newQuantity: number,
    userId?: string,
    reason?: string
  ): Promise<Inventory> {
    const current = await this.findById(id);
    if (!current) {
      throw new Error('Inventory not found');
    }

    const quantityChange = newQuantity - current.quantity;
    return this.updateQuantity(id, quantityChange, InventoryChangeType.ADJUSTMENT, userId, reason);
  }

  async findById(id: string): Promise<Inventory | null> {
    const result = await pool.query('SELECT * FROM inventory WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findLowStockItems(threshold?: number): Promise<Inventory[]> {
    const query = threshold
      ? 'SELECT * FROM inventory WHERE available_quantity <= $1'
      : 'SELECT * FROM inventory WHERE available_quantity <= low_stock_threshold';

    const params = threshold ? [threshold] : [];
    const result = await pool.query(query, params);
    return result.rows;
  }

  // ==================== RESERVATIONS ====================

  async createReservation(data: {
    product_id?: string;
    variant_id?: string;
    quantity: number;
    reserved_by_user_id?: string;
    reserved_by_order_id?: string;
    ttl_seconds?: number;
  }): Promise<InventoryReservation> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Find inventory
      const inventoryQuery = data.product_id
        ? 'SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE'
        : 'SELECT * FROM inventory WHERE variant_id = $1 FOR UPDATE';

      const inventoryResult = await client.query(inventoryQuery, [
        data.product_id || data.variant_id,
      ]);
      const inventory = inventoryResult.rows[0];

      if (!inventory) {
        throw new Error('Inventory not found');
      }

      if (inventory.available_quantity < data.quantity) {
        throw new Error('Insufficient inventory available');
      }

      // Update reserved quantity
      await client.query(
        'UPDATE inventory SET reserved_quantity = reserved_quantity + $1 WHERE id = $2',
        [data.quantity, inventory.id]
      );

      // Create reservation
      const ttl = data.ttl_seconds || 900; // Default 15 minutes
      const expiresAt = new Date(Date.now() + ttl * 1000);

      const reservationResult = await client.query(
        `INSERT INTO inventory_reservations (
          product_id, variant_id, quantity, reserved_by_user_id,
          reserved_by_order_id, expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          data.product_id || null,
          data.variant_id || null,
          data.quantity,
          data.reserved_by_user_id || null,
          data.reserved_by_order_id || null,
          expiresAt,
          ReservationStatus.ACTIVE,
        ]
      );

      // Log history
      await client.query(
        `INSERT INTO inventory_history (
          product_id, variant_id, change_type, quantity_change,
          quantity_before, quantity_after, reason, reference_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          inventory.product_id,
          inventory.variant_id,
          InventoryChangeType.RESERVATION,
          -data.quantity,
          inventory.quantity,
          inventory.quantity,
          'Inventory reserved',
          reservationResult.rows[0].id,
        ]
      );

      await client.query('COMMIT');
      return reservationResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async completeReservation(reservationId: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const reservation = await this.findReservationById(reservationId);
      if (!reservation || reservation.status !== ReservationStatus.ACTIVE) {
        throw new Error('Invalid reservation');
      }

      // Update inventory (remove from both quantity and reserved)
      const inventoryQuery = reservation.product_id
        ? 'SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE'
        : 'SELECT * FROM inventory WHERE variant_id = $1 FOR UPDATE';

      const inventoryResult = await client.query(inventoryQuery, [
        reservation.product_id || reservation.variant_id,
      ]);
      const inventory = inventoryResult.rows[0];

      await client.query(
        `UPDATE inventory 
         SET quantity = quantity - $1, 
             reserved_quantity = reserved_quantity - $1,
             last_sold_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [reservation.quantity, inventory.id]
      );

      // Mark reservation as completed
      await client.query(
        `UPDATE inventory_reservations 
         SET status = $1, completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [ReservationStatus.COMPLETED, reservationId]
      );

      // Log history
      await client.query(
        `INSERT INTO inventory_history (
          product_id, variant_id, change_type, quantity_change,
          quantity_before, quantity_after, reason, reference_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          inventory.product_id,
          inventory.variant_id,
          InventoryChangeType.SALE,
          -reservation.quantity,
          inventory.quantity,
          inventory.quantity - reservation.quantity,
          'Reservation completed',
          reservationId,
        ]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async releaseReservation(reservationId: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const reservation = await this.findReservationById(reservationId);
      if (!reservation || reservation.status !== ReservationStatus.ACTIVE) {
        throw new Error('Invalid reservation');
      }

      // Update inventory (remove from reserved only)
      const inventoryQuery = reservation.product_id
        ? 'UPDATE inventory SET reserved_quantity = reserved_quantity - $1 WHERE product_id = $2'
        : 'UPDATE inventory SET reserved_quantity = reserved_quantity - $1 WHERE variant_id = $2';

      await client.query(inventoryQuery, [
        reservation.quantity,
        reservation.product_id || reservation.variant_id,
      ]);

      // Mark reservation as cancelled
      await client.query(
        `UPDATE inventory_reservations 
         SET status = $1, cancelled_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [ReservationStatus.CANCELLED, reservationId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findReservationById(id: string): Promise<InventoryReservation | null> {
    const result = await pool.query('SELECT * FROM inventory_reservations WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findReservationsByOrderId(orderId: string): Promise<InventoryReservation[]> {
    const result = await pool.query(
      'SELECT * FROM inventory_reservations WHERE reserved_by_order_id = $1',
      [orderId]
    );
    return result.rows;
  }

  async expireOldReservations(): Promise<number> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Find expired reservations
      const expiredResult = await client.query(
        `SELECT * FROM inventory_reservations 
         WHERE status = $1 AND expires_at < NOW()`,
        [ReservationStatus.ACTIVE]
      );

      const expired = expiredResult.rows;

      // Release each expired reservation
      for (const reservation of expired) {
        const inventoryQuery = reservation.product_id
          ? 'UPDATE inventory SET reserved_quantity = reserved_quantity - $1 WHERE product_id = $2'
          : 'UPDATE inventory SET reserved_quantity = reserved_quantity - $1 WHERE variant_id = $2';

        await client.query(inventoryQuery, [
          reservation.quantity,
          reservation.product_id || reservation.variant_id,
        ]);
      }

      // Mark as expired
      await client.query(
        `UPDATE inventory_reservations 
         SET status = $1
         WHERE status = $2 AND expires_at < NOW()`,
        [ReservationStatus.EXPIRED, ReservationStatus.ACTIVE]
      );

      await client.query('COMMIT');
      return expired.length;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== HISTORY ====================

  async getHistory(
    productId?: string,
    variantId?: string,
    limit: number = 50
  ): Promise<InventoryHistory[]> {
    let query = 'SELECT * FROM inventory_history WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (productId) {
      query += ` AND product_id = $${paramCount}`;
      params.push(productId);
      paramCount++;
    }

    if (variantId) {
      query += ` AND variant_id = $${paramCount}`;
      params.push(variantId);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }
}

export default new InventoryRepository();
