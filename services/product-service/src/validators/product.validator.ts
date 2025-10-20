import Joi from 'joi';

export const createProductSchema = Joi.object({
  name: Joi.string().min(1).max(500).required().messages({
    'string.min': 'Product name must be at least 1 character',
    'string.max': 'Product name must not exceed 500 characters',
    'any.required': 'Product name is required',
  }),
  description: Joi.string().optional().allow('', null),
  short_description: Joi.string().max(500).optional().allow('', null),
  sku: Joi.string().required().messages({
    'any.required': 'SKU is required',
  }),
  category_id: Joi.string().uuid().optional().allow(null),
  brand: Joi.string().max(255).optional().allow('', null),
  base_price: Joi.number().min(0).required().messages({
    'number.min': 'Price must be at least 0',
    'any.required': 'Base price is required',
  }),
  sale_price: Joi.number().min(0).optional().allow(null),
  cost_price: Joi.number().min(0).optional().allow(null),
  currency: Joi.string().length(3).uppercase().optional(),
  status: Joi.string().valid('draft', 'active', 'inactive', 'out_of_stock', 'discontinued').optional(),
  is_featured: Joi.boolean().optional(),
  weight: Joi.number().min(0).optional().allow(null),
  weight_unit: Joi.string().valid('kg', 'g', 'lb', 'oz').optional(),
  dimensions_length: Joi.number().min(0).optional().allow(null),
  dimensions_width: Joi.number().min(0).optional().allow(null),
  dimensions_height: Joi.number().min(0).optional().allow(null),
  dimensions_unit: Joi.string().valid('cm', 'm', 'in', 'ft').optional(),
  meta_title: Joi.string().max(255).optional().allow('', null),
  meta_description: Joi.string().optional().allow('', null),
  meta_keywords: Joi.string().optional().allow('', null),
  tags: Joi.array().items(Joi.string()).optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(1).max(500).optional(),
  description: Joi.string().optional().allow('', null),
  short_description: Joi.string().max(500).optional().allow('', null),
  category_id: Joi.string().uuid().optional().allow(null),
  brand: Joi.string().max(255).optional().allow('', null),
  base_price: Joi.number().min(0).optional(),
  sale_price: Joi.number().min(0).optional().allow(null),
  cost_price: Joi.number().min(0).optional().allow(null),
  status: Joi.string().valid('draft', 'active', 'inactive', 'out_of_stock', 'discontinued').optional(),
  is_featured: Joi.boolean().optional(),
  is_available: Joi.boolean().optional(),
  weight: Joi.number().min(0).optional().allow(null),
  dimensions_length: Joi.number().min(0).optional().allow(null),
  dimensions_width: Joi.number().min(0).optional().allow(null),
  dimensions_height: Joi.number().min(0).optional().allow(null),
  meta_title: Joi.string().max(255).optional().allow('', null),
  meta_description: Joi.string().optional().allow('', null),
  meta_keywords: Joi.string().optional().allow('', null),
});

export const createVariantSchema = Joi.object({
  product_id: Joi.string().uuid().required(),
  sku: Joi.string().required(),
  name: Joi.string().min(1).max(255).required(),
  attributes: Joi.object().required().messages({
    'any.required': 'Variant attributes are required (e.g., size: L, color: Red)',
  }),
  price: Joi.number().min(0).optional().allow(null),
  sale_price: Joi.number().min(0).optional().allow(null),
  cost_price: Joi.number().min(0).optional().allow(null),
  image_url: Joi.string().uri().optional().allow('', null),
  is_available: Joi.boolean().optional(),
  weight: Joi.number().min(0).optional().allow(null),
  dimensions_length: Joi.number().min(0).optional().allow(null),
  dimensions_width: Joi.number().min(0).optional().allow(null),
  dimensions_height: Joi.number().min(0).optional().allow(null),
});

export const searchProductsSchema = Joi.object({
  query: Joi.string().optional().allow(''),
  category_id: Joi.string().uuid().optional(),
  min_price: Joi.number().min(0).optional(),
  max_price: Joi.number().min(0).optional(),
  brand: Joi.string().optional(),
  rating: Joi.number().min(1).max(5).optional(),
  in_stock: Joi.boolean().optional(),
  is_featured: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  sort_by: Joi.string().valid('relevance', 'price_asc', 'price_desc', 'rating', 'newest', 'popular').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

export const createReviewSchema = Joi.object({
  product_id: Joi.string().uuid().required(),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Rating must be between 1 and 5',
    'number.max': 'Rating must be between 1 and 5',
    'any.required': 'Rating is required',
  }),
  title: Joi.string().max(255).optional().allow('', null),
  comment: Joi.string().optional().allow('', null),
});

export const updateInventorySchema = Joi.object({
  product_id: Joi.string().uuid().optional(),
  variant_id: Joi.string().uuid().optional(),
  quantity: Joi.number().integer().required().messages({
    'any.required': 'Quantity is required',
  }),
  reason: Joi.string().optional().allow('', null),
  notes: Joi.string().optional().allow('', null),
  change_type: Joi.string()
    .valid('restock', 'sale', 'adjustment', 'return', 'damaged', 'reservation', 'release')
    .required(),
}).or('product_id', 'variant_id').messages({
  'object.missing': 'Either product_id or variant_id must be provided',
});

export const reserveInventorySchema = Joi.object({
  product_id: Joi.string().uuid().optional(),
  variant_id: Joi.string().uuid().optional(),
  quantity: Joi.number().integer().min(1).required(),
  user_id: Joi.string().uuid().optional(),
  order_id: Joi.string().uuid().optional(),
  ttl_seconds: Joi.number().integer().min(60).max(3600).optional(),
}).or('product_id', 'variant_id').messages({
  'object.missing': 'Either product_id or variant_id must be provided',
});

export const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  slug: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional().allow('', null),
  parent_id: Joi.string().uuid().optional().allow(null),
  image_url: Joi.string().uri().optional().allow('', null),
  is_active: Joi.boolean().optional(),
  display_order: Joi.number().integer().min(0).optional(),
});

export const bulkOperationSchema = Joi.object({
  operation: Joi.string().valid('update_status', 'update_price', 'update_stock', 'delete').required(),
  product_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  data: Joi.object().optional(),
});
