import { Router } from 'express';
import productController from '../controllers/product.controller';
import { validate, validateQuery } from '../middleware/validate.middleware';
import { authenticate, optionalAuth, authorize } from '../middleware/auth.middleware';
import { uploadMultiple } from '../middleware/upload.middleware';
import {
  createProductSchema,
  updateProductSchema,
  searchProductsSchema,
  createVariantSchema,
  bulkOperationSchema,
} from '../validators/product.validator';

const router = Router();

// Public routes
router.get('/search', validateQuery(searchProductsSchema), productController.searchProducts);
router.get('/autocomplete', productController.autocomplete);
router.get('/featured', productController.getFeaturedProducts);
router.get('/bestsellers', productController.getBestSellers);
router.get('/new-arrivals', productController.getNewArrivals);
router.get('/slug/:slug', optionalAuth, productController.getProductBySlug);
router.get('/:id', optionalAuth, productController.getProduct);
router.get('/', productController.getProducts);

// Protected routes - require authentication
router.post(
  '/',
  authenticate,
  authorize('admin', 'merchant'),
  uploadMultiple,
  validate(createProductSchema),
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'merchant'),
  validate(updateProductSchema),
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'merchant'),
  productController.deleteProduct
);

router.post(
  '/:id/images',
  authenticate,
  authorize('admin', 'merchant'),
  uploadMultiple,
  productController.uploadImages
);

router.post(
  '/variants',
  authenticate,
  authorize('admin', 'merchant'),
  validate(createVariantSchema),
  productController.createVariant
);

router.post(
  '/bulk',
  authenticate,
  authorize('admin'),
  validate(bulkOperationSchema),
  productController.bulkOperation
);

export default router;
