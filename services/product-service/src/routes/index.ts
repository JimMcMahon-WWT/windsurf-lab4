import { Router } from 'express';
import productRoutes from './product.routes';
import inventoryRoutes from './inventory.routes';
import categoryRoutes from './category.routes';
import reviewRoutes from './review.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'product-service',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/categories', categoryRoutes);
router.use('/reviews', reviewRoutes);

export default router;
