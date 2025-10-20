import inventoryRepository from '../repositories/inventory.repository';
import productRepository from '../repositories/product.repository';
import { publishInventoryEvent } from '../config/kafka.config';
import { logger } from '../utils/logger.utils';
import {
  Inventory,
  InventoryReservation,
  InventoryChangeType,
  ReserveInventoryRequest,
  UpdateInventoryRequest,
} from '../types/product.types';

export class InventoryService {
  /**
   * Get inventory for a product or variant
   */
  async getInventory(productId?: string, variantId?: string): Promise<Inventory | null> {
    try {
      if (productId) {
        return await inventoryRepository.findByProductId(productId);
      } else if (variantId) {
        return await inventoryRepository.findByVariantId(variantId);
      }
      throw new Error('Either productId or variantId must be provided');
    } catch (error) {
      logger.error('Error getting inventory:', error);
      throw error;
    }
  }

  /**
   * Update inventory quantity
   */
  async updateInventory(
    productId: string | undefined,
    variantId: string | undefined,
    data: UpdateInventoryRequest,
    userId?: string
  ): Promise<Inventory> {
    try {
      // Find inventory
      let inventory = productId
        ? await inventoryRepository.findByProductId(productId)
        : await inventoryRepository.findByVariantId(variantId!);

      // Create inventory if it doesn't exist (for initial stock)
      if (!inventory) {
        logger.info(`Creating initial inventory for ${productId ? 'product' : 'variant'}: ${productId || variantId}`);
        
        // Build inventory data - only include one of product_id or variant_id
        const inventoryData: any = {
          quantity: 0,
          reserved_quantity: 0,
          low_stock_threshold: 10,
          reorder_point: 20,
          reorder_quantity: 50,
          warehouse_id: null,
          location_code: null,
          last_restocked_at: null,
          last_sold_at: null,
        };
        
        // Set either product_id OR variant_id, not both
        if (productId) {
          inventoryData.product_id = productId;
          inventoryData.variant_id = null;
        } else if (variantId) {
          inventoryData.product_id = null;
          inventoryData.variant_id = variantId;
        }
        
        inventory = await inventoryRepository.create(inventoryData);
      }

      // Calculate quantity change
      let quantityChange = 0;
      if (data.change_type === InventoryChangeType.RESTOCK) {
        quantityChange = data.quantity;
      } else if (data.change_type === InventoryChangeType.ADJUSTMENT) {
        quantityChange = data.quantity - inventory.quantity;
      } else {
        quantityChange = -data.quantity; // Negative for sale, damaged, etc.
      }

      // Update inventory
      const updated = await inventoryRepository.updateQuantity(
        inventory.id,
        quantityChange,
        data.change_type,
        userId,
        data.reason
      );

      // Check if product should be marked out of stock
      if (updated.available_quantity === 0) {
        if (productId) {
          await productRepository.updateStatus(productId, 'out_of_stock');
        }
      }

      // Publish inventory event
      await publishInventoryEvent('inventory.updated', {
        product_id: productId,
        variant_id: variantId,
        change_type: data.change_type,
        quantity_change: quantityChange,
        new_quantity: updated.quantity,
        available_quantity: updated.available_quantity,
      });

      // Check for low stock alert
      if (updated.available_quantity <= updated.low_stock_threshold) {
        await publishInventoryEvent('inventory.low_stock', {
          product_id: productId,
          variant_id: variantId,
          available_quantity: updated.available_quantity,
          threshold: updated.low_stock_threshold,
        });

        logger.warn(`Low stock alert: ${productId || variantId}`);
      }

      logger.info(`Inventory updated: ${inventory.id}`);

      return updated;
    } catch (error) {
      logger.error('Error updating inventory:', error);
      throw error;
    }
  }

  /**
   * Reserve inventory for an order
   */
  async reserveInventory(data: ReserveInventoryRequest): Promise<InventoryReservation> {
    try {
      const reservation = await inventoryRepository.createReservation(data);

      await publishInventoryEvent('inventory.reserved', {
        reservation_id: reservation.id,
        product_id: data.product_id,
        variant_id: data.variant_id,
        quantity: data.quantity,
        order_id: data.order_id,
        expires_at: reservation.expires_at,
      });

      logger.info(`Inventory reserved: ${reservation.id}`);

      return reservation;
    } catch (error) {
      logger.error('Error reserving inventory:', error);
      throw error;
    }
  }

  /**
   * Complete a reservation (convert to sale)
   */
  async completeReservation(reservationId: string): Promise<void> {
    try {
      await inventoryRepository.completeReservation(reservationId);

      await publishInventoryEvent('inventory.reservation_completed', {
        reservation_id: reservationId,
      });

      logger.info(`Reservation completed: ${reservationId}`);
    } catch (error) {
      logger.error('Error completing reservation:', error);
      throw error;
    }
  }

  /**
   * Release a reservation (cancel)
   */
  async releaseReservation(reservationId: string): Promise<void> {
    try {
      await inventoryRepository.releaseReservation(reservationId);

      await publishInventoryEvent('inventory.reservation_released', {
        reservation_id: reservationId,
      });

      logger.info(`Reservation released: ${reservationId}`);
    } catch (error) {
      logger.error('Error releasing reservation:', error);
      throw error;
    }
  }

  /**
   * Get reservations by order ID
   */
  async getReservationsByOrderId(orderId: string): Promise<InventoryReservation[]> {
    try {
      return await inventoryRepository.findReservationsByOrderId(orderId);
    } catch (error) {
      logger.error('Error getting reservations:', error);
      throw error;
    }
  }

  /**
   * Expire old reservations (to be called by cron job)
   */
  async expireOldReservations(): Promise<number> {
    try {
      const count = await inventoryRepository.expireOldReservations();

      if (count > 0) {
        await publishInventoryEvent('inventory.reservations_expired', {
          count,
          timestamp: new Date().toISOString(),
        });

        logger.info(`Expired ${count} old reservations`);
      }

      return count;
    } catch (error) {
      logger.error('Error expiring reservations:', error);
      throw error;
    }
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(threshold?: number): Promise<Inventory[]> {
    try {
      return await inventoryRepository.findLowStockItems(threshold);
    } catch (error) {
      logger.error('Error getting low stock items:', error);
      throw error;
    }
  }

  /**
   * Get inventory history
   */
  async getInventoryHistory(
    productId?: string,
    variantId?: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      return await inventoryRepository.getHistory(productId, variantId, limit);
    } catch (error) {
      logger.error('Error getting inventory history:', error);
      throw error;
    }
  }
}

export default new InventoryService();
