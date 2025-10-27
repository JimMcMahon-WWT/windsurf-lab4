import { Router } from 'express';

import inventoryController from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  updateInventorySchema,
  reserveInventorySchema,
} from '../validators/product.validator';

const router = Router();

// Get inventory (public or protected based on requirements)
router.get('/', inventoryController.getInventory);

// Get inventory history
router.get('/history', authenticate, authorize('admin', 'merchant'), inventoryController.getInventoryHistory);

// Get low stock items
router.get('/low-stock', authenticate, authorize('admin', 'merchant'), inventoryController.getLowStockItems);

// Update inventory
router.put(
  '/',
  authenticate,
  authorize('admin', 'merchant'),
  validate(updateInventorySchema),
  inventoryController.updateInventory
);

// Reserve inventory (used by Order Service)
router.post(
  '/reserve',
  authenticate,
  validate(reserveInventorySchema),
  inventoryController.reserveInventory
);

// Complete reservation
router.post(
  '/reservations/:id/complete',
  authenticate,
  inventoryController.completeReservation
);

// Release/cancel reservation
router.post(
  '/reservations/:id/release',
  authenticate,
  inventoryController.releaseReservation
);

// Get reservations by order
router.get(
  '/reservations/order/:order_id',
  authenticate,
  inventoryController.getReservationsByOrder
);

export default router;
