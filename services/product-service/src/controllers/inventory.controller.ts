import { Request, Response, NextFunction } from 'express';

import inventoryService from '../services/inventory.service';

export class InventoryController {
  /**
   * Get inventory for product or variant
   */
  async getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { product_id, variant_id } = req.query;

      const inventory = await inventoryService.getInventory(
        product_id as string,
        variant_id as string
      );

      if (!inventory) {
        res.status(404).json({ error: 'Inventory not found' });
        return;
      }

      res.json(inventory);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update inventory
   */
  async updateInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // product_id and variant_id can come from either query or body
      const product_id = (req.query.product_id as string) || req.body.product_id;
      const variant_id = (req.query.variant_id as string) || req.body.variant_id;
      const data = req.body;
      const userId = req.user?.id; // From auth middleware

      const inventory = await inventoryService.updateInventory(
        product_id,
        variant_id,
        data,
        userId
      );

      res.json(inventory);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reserve inventory
   */
  async reserveInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;

      const reservation = await inventoryService.reserveInventory(data);

      res.status(201).json(reservation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete reservation
   */
  async completeReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      await inventoryService.completeReservation(id);

      res.json({ message: 'Reservation completed successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Release reservation
   */
  async releaseReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      await inventoryService.releaseReservation(id);

      res.json({ message: 'Reservation released successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reservations by order ID
   */
  async getReservationsByOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { order_id } = req.params;

      const reservations = await inventoryService.getReservationsByOrderId(order_id);

      res.json(reservations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { threshold } = req.query;

      const items = await inventoryService.getLowStockItems(
        threshold ? parseInt(threshold as string) : undefined
      );

      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get inventory history
   */
  async getInventoryHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { product_id, variant_id, limit = 50 } = req.query;

      const history = await inventoryService.getInventoryHistory(
        product_id as string,
        variant_id as string,
        parseInt(limit as string)
      );

      res.json(history);
    } catch (error) {
      next(error);
    }
  }
}

export default new InventoryController();
