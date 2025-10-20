// Enums
export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_X_GET_Y = 'buy_x_get_y',
}

export enum InventoryChangeType {
  RESTOCK = 'restock',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
  DAMAGED = 'damaged',
  RESERVATION = 'reservation',
  RELEASE = 'release',
}

export enum ReservationStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum RecommendationType {
  SIMILAR = 'similar',
  FREQUENTLY_BOUGHT_TOGETHER = 'frequently_bought_together',
  CUSTOMERS_ALSO_VIEWED = 'customers_also_viewed',
  TRENDING = 'trending',
}

// Core Interfaces
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sku: string;
  category_id: string | null;
  brand: string | null;
  
  // Pricing
  base_price: number;
  sale_price: number | null;
  cost_price: number | null;
  currency: string;
  
  // Status
  status: ProductStatus;
  is_featured: boolean;
  is_available: boolean;
  
  // SEO
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  
  // Physical attributes
  weight: number | null;
  weight_unit: string;
  dimensions_length: number | null;
  dimensions_width: number | null;
  dimensions_height: number | null;
  dimensions_unit: string;
  
  // Tracking
  view_count: number;
  purchase_count: number;
  average_rating: number;
  review_count: number;
  
  // Merchant
  merchant_id: string | null;
  
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price: number | null;
  sale_price: number | null;
  cost_price: number | null;
  image_url: string | null;
  is_available: boolean;
  weight: number | null;
  dimensions_length: number | null;
  dimensions_width: number | null;
  dimensions_height: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Inventory {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  reorder_point: number;
  reorder_quantity: number;
  warehouse_id: string | null;
  location_code: string | null;
  last_restocked_at: Date | null;
  last_sold_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  width: number | null;
  height: number | null;
  file_size: number | null;
  format: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: Date;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  helpful_count: number;
  not_helpful_count: number;
  merchant_response: string | null;
  merchant_response_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProductDiscount {
  id: string;
  name: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: 'all' | 'category' | 'product' | 'tag';
  category_id: string | null;
  min_purchase_amount: number | null;
  min_quantity: number | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  current_uses: number;
  starts_at: Date;
  ends_at: Date;
  is_active: boolean;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryReservation {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  quantity: number;
  reserved_by_user_id: string | null;
  reserved_by_order_id: string | null;
  status: ReservationStatus;
  expires_at: Date;
  completed_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryHistory {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  change_type: InventoryChangeType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  reference_id: string | null;
  reference_type: string | null;
  performed_by_user_id: string | null;
  created_at: Date;
}

export interface ProductRecommendation {
  product_id: string;
  recommended_product_id: string;
  score: number;
  recommendation_type: RecommendationType;
  updated_at: Date;
}

// Request/Response Types
export interface CreateProductRequest {
  name: string;
  description?: string;
  short_description?: string;
  sku: string;
  category_id?: string;
  brand?: string;
  base_price: number;
  sale_price?: number;
  cost_price?: number;
  currency?: string;
  status?: ProductStatus;
  is_featured?: boolean;
  weight?: number;
  weight_unit?: string;
  dimensions_length?: number;
  dimensions_width?: number;
  dimensions_height?: number;
  dimensions_unit?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  tags?: string[];
  images?: string[];
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  short_description?: string;
  category_id?: string;
  brand?: string;
  base_price?: number;
  sale_price?: number;
  cost_price?: number;
  status?: ProductStatus;
  is_featured?: boolean;
  is_available?: boolean;
  weight?: number;
  dimensions_length?: number;
  dimensions_width?: number;
  dimensions_height?: number;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

export interface ProductSearchFilters {
  category_id?: string;
  min_price?: number;
  max_price?: number;
  brand?: string;
  rating?: number;
  in_stock?: boolean;
  is_featured?: boolean;
  tags?: string[];
  attributes?: Record<string, string[]>;
}

export interface ProductSearchQuery {
  query?: string;
  filters?: ProductSearchFilters;
  sort_by?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export interface ProductSearchResult {
  products: ProductResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  facets?: SearchFacets;
}

export interface SearchFacets {
  categories?: Array<{ id: string; name: string; count: number }>;
  brands?: Array<{ name: string; count: number }>;
  price_ranges?: Array<{ min: number; max: number; count: number }>;
  ratings?: Array<{ rating: number; count: number }>;
}

export interface ProductResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sku: string;
  category: CategoryResponse | null;
  brand: string | null;
  base_price: number;
  sale_price: number | null;
  current_price: number;
  discount_percentage?: number;
  currency: string;
  status: ProductStatus;
  is_featured: boolean;
  is_available: boolean;
  in_stock: boolean;
  stock_quantity?: number;
  average_rating: number;
  review_count: number;
  images: ProductImage[];
  primary_image?: ProductImage;
  tags?: Tag[];
  variants?: ProductVariant[];
  created_at: Date;
}

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent?: CategoryResponse | null;
  children?: CategoryResponse[];
}

export interface CreateReviewRequest {
  product_id: string;
  rating: number;
  title?: string;
  comment?: string;
}

export interface UpdateInventoryRequest {
  quantity: number;
  reason?: string;
  change_type: InventoryChangeType;
}

export interface ReserveInventoryRequest {
  product_id?: string;
  variant_id?: string;
  quantity: number;
  user_id?: string;
  order_id?: string;
  ttl_seconds?: number;
}

export interface BulkProductOperation {
  operation: 'update_status' | 'update_price' | 'update_stock' | 'delete';
  product_ids: string[];
  data?: any;
}
