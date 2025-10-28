import { Router } from 'express';

import categoryController from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createCategorySchema } from '../validators/product.validator';

const router = Router();

// Public routes
router.get('/tree', categoryController.getCategoryTree);
router.get('/slug/:slug', categoryController.getCategoryBySlug);
router.get('/subcategories', categoryController.getSubcategories);
router.get('/:id', categoryController.getCategory);
router.get('/', categoryController.getAllCategories);

// Protected routes
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createCategorySchema),
  categoryController.createCategory
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(createCategorySchema),
  categoryController.updateCategory
);

router.delete('/:id', authenticate, authorize('admin'), categoryController.deleteCategory);

export default router;
