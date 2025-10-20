import productRepository from '../repositories/product.repository';
import categoryRepository from '../repositories/category.repository';
import inventoryRepository from '../repositories/inventory.repository';
import searchService from './search.service';
import imageService from './image.service';
import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from '../config/redis.config';
import { publishProductEvent } from '../config/kafka.config';
import { logger } from '../utils/logger.utils';
import {
  CreateProductRequest,
  UpdateProductRequest,
  Product,
  ProductResponse,
  ProductVariant,
  BulkProductOperation,
  CategoryResponse,
} from '../types/product.types';

export class ProductService {
  /**
   * Get product by ID with caching
   */
  async getProductById(id: string): Promise<ProductResponse | null> {
    try {
      // Try cache first
      const cached = await cacheGet(`product:${id}`);
      if (cached) {
        logger.debug(`Product ${id} retrieved from cache`);
        return cached;
      }

      const product = await productRepository.findById(id);
      if (!product) {
        return null;
      }

      const response = await this.buildProductResponse(product);

      // Cache for 1 hour
      await cacheSet(`product:${id}`, response, 3600);

      // Track view
      await productRepository.updateViewCount(id);

      return response;
    } catch (error) {
      logger.error(`Error getting product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug: string): Promise<ProductResponse | null> {
    try {
      const cached = await cacheGet(`product:slug:${slug}`);
      if (cached) {
        return cached;
      }

      const product = await productRepository.findBySlug(slug);
      if (!product) {
        return null;
      }

      const response = await this.buildProductResponse(product);
      await cacheSet(`product:slug:${slug}`, response, 3600);
      await productRepository.updateViewCount(product.id);

      return response;
    } catch (error) {
      logger.error(`Error getting product by slug ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async createProduct(
    data: CreateProductRequest,
    images?: Express.Multer.File[]
  ): Promise<ProductResponse> {
    try {
      // Check if SKU already exists
      const existing = await productRepository.findBySku(data.sku);
      if (existing) {
        throw new Error(`Product with SKU ${data.sku} already exists`);
      }

      // Create product
      const product = await productRepository.create(data);

      // Handle image uploads
      if (images && images.length > 0) {
        await this.uploadProductImages(product.id, images);
      }

      // Create initial inventory record
      await inventoryRepository.create({
        product_id: product.id,
        variant_id: null,
        quantity: 0,
        reserved_quantity: 0,
        low_stock_threshold: 10,
        reorder_point: 20,
        reorder_quantity: 50,
        warehouse_id: null,
        location_code: null,
        last_restocked_at: null,
        last_sold_at: null,
      });

      // Index in Elasticsearch
      await searchService.indexProduct(product.id);

      // Publish event
      await publishProductEvent('product.created', {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
      });

      logger.info(`Product created: ${product.id}`);

      return this.buildProductResponse(product);
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Update a product
   */
  async updateProduct(
    id: string,
    data: UpdateProductRequest
  ): Promise<ProductResponse> {
    try {
      const product = await productRepository.update(id, data);

      // Invalidate caches
      await this.invalidateProductCache(id);

      // Update in Elasticsearch
      await searchService.updateProduct(id, data);

      // Publish event
      await publishProductEvent('product.updated', {
        product_id: id,
        updates: data,
      });

      logger.info(`Product updated: ${id}`);

      return this.buildProductResponse(product);
    } catch (error) {
      logger.error(`Error updating product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<void> {
    try {
      const product = await productRepository.findById(id);
      if (!product) {
        throw new Error('Product not found');
      }

      // Delete images from S3
      const images = await productRepository.findImagesByProductId(id);
      await Promise.all(
        images.map((img) => imageService.deleteImage(img.url))
      );

      // Remove from Elasticsearch
      await searchService.removeProduct(id);

      // Delete from database
      await productRepository.delete(id);

      // Invalidate cache
      await this.invalidateProductCache(id);

      // Publish event
      await publishProductEvent('product.deleted', { product_id: id });

      logger.info(`Product deleted: ${id}`);
    } catch (error) {
      logger.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all products with filters
   */
  async getProducts(
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ products: ProductResponse[]; total: number; page: number; limit: number }> {
    try {
      const offset = (page - 1) * limit;
      const { products, total } = await productRepository.findAll(filters, limit, offset);

      const productResponses = await Promise.all(
        products.map((p) => this.buildProductResponse(p))
      );

      return {
        products: productResponses,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting products:', error);
      throw error;
    }
  }

  /**
   * Upload product images
   */
  async uploadProductImages(
    productId: string,
    files: Express.Multer.File[]
  ): Promise<void> {
    try {
      for (const file of files) {
        // Validate
        const validation = imageService.validateImage(file);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // Process and upload
        const processed = await imageService.processAndUpload(file, 'products');

        // Save to database
        await productRepository.addImage({
          product_id: productId,
          variant_id: null,
          url: processed.medium, // Use medium as main URL
          thumbnail_url: processed.thumbnail,
          alt_text: null,
          display_order: 0,
          is_primary: false,
          width: processed.width,
          height: processed.height,
          file_size: processed.size,
          format: processed.format,
        });
      }

      // Invalidate cache
      await this.invalidateProductCache(productId);

      // Update in Elasticsearch
      await searchService.indexProduct(productId);
    } catch (error) {
      logger.error(`Error uploading images for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Create product variant
   */
  async createVariant(data: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>): Promise<ProductVariant> {
    try {
      // Check if SKU exists
      const existingSku = await productRepository.findVariantBySku(data.sku);
      if (existingSku) {
        throw new Error(`Variant with SKU ${data.sku} already exists`);
      }

      const variant = await productRepository.createVariant(data);

      // Create inventory for variant
      await inventoryRepository.create({
        product_id: null,
        variant_id: variant.id,
        quantity: 0,
        reserved_quantity: 0,
        low_stock_threshold: 10,
        reorder_point: 20,
        reorder_quantity: 50,
        warehouse_id: null,
        location_code: null,
        last_restocked_at: null,
        last_sold_at: null,
      });

      // Invalidate cache
      await this.invalidateProductCache(data.product_id);

      // Update search index
      await searchService.indexProduct(data.product_id);

      logger.info(`Variant created: ${variant.id} for product ${data.product_id}`);

      return variant;
    } catch (error) {
      logger.error('Error creating variant:', error);
      throw error;
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 10): Promise<ProductResponse[]> {
    try {
      const cached = await cacheGet(`featured:${limit}`);
      if (cached) {
        return cached;
      }

      const products = await productRepository.getFeaturedProducts(limit);
      const responses = await Promise.all(
        products.map((p) => this.buildProductResponse(p))
      );

      await cacheSet(`featured:${limit}`, responses, 1800); // Cache 30 min
      return responses;
    } catch (error) {
      logger.error('Error getting featured products:', error);
      throw error;
    }
  }

  /**
   * Get bestsellers
   */
  async getBestSellers(limit: number = 10): Promise<ProductResponse[]> {
    try {
      const products = await productRepository.getBestSellers(limit);
      return Promise.all(products.map((p) => this.buildProductResponse(p)));
    } catch (error) {
      logger.error('Error getting bestsellers:', error);
      throw error;
    }
  }

  /**
   * Get new arrivals
   */
  async getNewArrivals(limit: number = 10): Promise<ProductResponse[]> {
    try {
      const products = await productRepository.getNewArrivals(limit);
      return Promise.all(products.map((p) => this.buildProductResponse(p)));
    } catch (error) {
      logger.error('Error getting new arrivals:', error);
      throw error;
    }
  }

  /**
   * Bulk operations
   */
  async bulkOperation(operation: BulkProductOperation): Promise<void> {
    try {
      switch (operation.operation) {
        case 'update_status':
          await productRepository.bulkUpdateStatus(
            operation.product_ids,
            operation.data.status
          );
          break;
        case 'delete':
          await Promise.all(
            operation.product_ids.map((id) => this.deleteProduct(id))
          );
          break;
        default:
          throw new Error(`Unknown operation: ${operation.operation}`);
      }

      // Invalidate caches
      await Promise.all(
        operation.product_ids.map((id) => this.invalidateProductCache(id))
      );

      logger.info(`Bulk operation ${operation.operation} completed for ${operation.product_ids.length} products`);
    } catch (error) {
      logger.error('Error in bulk operation:', error);
      throw error;
    }
  }

  /**
   * Build product response with all related data
   */
  private async buildProductResponse(product: Product): Promise<ProductResponse> {
    const [images, variants, inventory, category] = await Promise.all([
      productRepository.findImagesByProductId(product.id),
      productRepository.findVariantsByProductId(product.id),
      inventoryRepository.findByProductId(product.id),
      product.category_id ? categoryRepository.findById(product.category_id) : null,
    ]);

    const primaryImage = images.find((img) => img.is_primary) || images[0];
    const currentPrice = product.sale_price || product.base_price;
    const discountPercentage = product.sale_price
      ? Math.round(((product.base_price - product.sale_price) / product.base_price) * 100)
      : undefined;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      short_description: product.short_description,
      sku: product.sku,
      category: category ? await this.buildCategoryResponse(category) : null,
      brand: product.brand,
      base_price: product.base_price,
      sale_price: product.sale_price,
      current_price: currentPrice,
      discount_percentage: discountPercentage,
      currency: product.currency,
      status: product.status,
      is_featured: product.is_featured,
      is_available: product.is_available,
      in_stock: inventory ? inventory.available_quantity > 0 : false,
      stock_quantity: inventory?.available_quantity,
      average_rating: product.average_rating,
      review_count: product.review_count,
      images,
      primary_image: primaryImage,
      variants: variants.length > 0 ? variants : undefined,
      created_at: product.created_at,
    };
  }

  /**
   * Build category response with hierarchy
   */
  private async buildCategoryResponse(category: any): Promise<CategoryResponse> {
    let parent = null;
    if (category.parent_id) {
      const parentCategory = await categoryRepository.findById(category.parent_id);
      if (parentCategory) {
        parent = {
          id: parentCategory.id,
          name: parentCategory.name,
          slug: parentCategory.slug,
          description: parentCategory.description,
          image_url: parentCategory.image_url,
          parent: null,
          children: undefined,
        };
      }
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image_url: category.image_url,
      parent,
      children: undefined,
    };
  }

  /**
   * Invalidate product cache
   */
  private async invalidateProductCache(productId: string): Promise<void> {
    try {
      await cacheDelete(`product:${productId}`);
      
      // Also invalidate slug cache
      const product = await productRepository.findById(productId);
      if (product) {
        await cacheDelete(`product:slug:${product.slug}`);
      }

      // Invalidate featured products cache
      await cacheDeletePattern('featured:*');
    } catch (error) {
      logger.error('Error invalidating cache:', error);
    }
  }
}

export default new ProductService();
