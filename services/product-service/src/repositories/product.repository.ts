import { pool } from '../config/database.config';
import {
  Product,
  ProductVariant,
  ProductImage,
  CreateProductRequest,
  UpdateProductRequest,
  ProductSearchFilters,
} from '../types/product.types';

export class ProductRepository {
  // ==================== PRODUCT CRUD ====================

  async findById(id: string): Promise<Product | null> {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const result = await pool.query('SELECT * FROM products WHERE slug = $1', [slug]);
    return result.rows[0] || null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const result = await pool.query('SELECT * FROM products WHERE sku = $1', [sku]);
    return result.rows[0] || null;
  }

  async create(data: CreateProductRequest): Promise<Product> {
    const slug = this.generateSlug(data.name);

    const result = await pool.query(
      `INSERT INTO products (
        name, slug, description, short_description, sku,
        category_id, brand, base_price, sale_price, cost_price,
        currency, status, is_featured, weight, weight_unit,
        dimensions_length, dimensions_width, dimensions_height, dimensions_unit,
        meta_title, meta_description, meta_keywords
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        data.name,
        slug,
        data.description || null,
        data.short_description || null,
        data.sku,
        data.category_id || null,
        data.brand || null,
        data.base_price,
        data.sale_price || null,
        data.cost_price || null,
        data.currency || 'USD',
        data.status || 'draft',
        data.is_featured || false,
        data.weight || null,
        data.weight_unit || 'kg',
        data.dimensions_length || null,
        data.dimensions_width || null,
        data.dimensions_height || null,
        data.dimensions_unit || 'cm',
        data.meta_title || null,
        data.meta_description || null,
        data.meta_keywords || null,
      ]
    );

    return result.rows[0];
  }

  async update(id: string, data: UpdateProductRequest): Promise<Product> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return (await this.findById(id))!;
    }

    values.push(id);

    const query = `
      UPDATE products 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
  }

  async findAll(
    filters: ProductSearchFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<{ products: Product[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramCount = 1;

    if (filters.category_id) {
      conditions.push(`category_id = $${paramCount}`);
      params.push(filters.category_id);
      paramCount++;
    }

    if (filters.brand) {
      conditions.push(`brand = $${paramCount}`);
      params.push(filters.brand);
      paramCount++;
    }

    if (filters.min_price !== undefined) {
      conditions.push(`base_price >= $${paramCount}`);
      params.push(filters.min_price);
      paramCount++;
    }

    if (filters.max_price !== undefined) {
      conditions.push(`base_price <= $${paramCount}`);
      params.push(filters.max_price);
      paramCount++;
    }

    if (filters.is_featured !== undefined) {
      conditions.push(`is_featured = $${paramCount}`);
      params.push(filters.is_featured);
      paramCount++;
    }

    if (filters.in_stock !== undefined && filters.in_stock) {
      conditions.push('is_available = TRUE');
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get products
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM products 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return {
      products: result.rows,
      total,
    };
  }

  async updateViewCount(id: string): Promise<void> {
    await pool.query('UPDATE products SET view_count = view_count + 1 WHERE id = $1', [id]);
  }

  async updatePurchaseCount(id: string, increment: number = 1): Promise<void> {
    await pool.query('UPDATE products SET purchase_count = purchase_count + $1 WHERE id = $2', [
      increment,
      id,
    ]);
  }

  async updateStatus(id: string, status: string): Promise<Product> {
    const result = await pool.query(
      'UPDATE products SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0];
  }

  async bulkUpdateStatus(ids: string[], status: string): Promise<void> {
    await pool.query(
      'UPDATE products SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2)',
      [status, ids]
    );
  }

  async getFeaturedProducts(limit: number = 10): Promise<Product[]> {
    const result = await pool.query(
      `SELECT * FROM products 
       WHERE is_featured = TRUE AND status = 'active' AND is_available = TRUE
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getBestSellers(limit: number = 10): Promise<Product[]> {
    const result = await pool.query(
      `SELECT * FROM products 
       WHERE status = 'active' AND is_available = TRUE
       ORDER BY purchase_count DESC, average_rating DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getNewArrivals(limit: number = 10): Promise<Product[]> {
    const result = await pool.query(
      `SELECT * FROM products 
       WHERE status = 'active' AND is_available = TRUE
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // ==================== PRODUCT VARIANTS ====================

  async createVariant(
    data: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ProductVariant> {
    const result = await pool.query(
      `INSERT INTO product_variants (
        product_id, sku, name, attributes, price, sale_price, cost_price,
        image_url, is_available, weight, dimensions_length, dimensions_width, dimensions_height
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.product_id,
        data.sku,
        data.name,
        JSON.stringify(data.attributes),
        data.price || null,
        data.sale_price || null,
        data.cost_price || null,
        data.image_url || null,
        data.is_available !== undefined ? data.is_available : true,
        data.weight || null,
        data.dimensions_length || null,
        data.dimensions_width || null,
        data.dimensions_height || null,
      ]
    );
    return result.rows[0];
  }

  async findVariantsByProductId(productId: string): Promise<ProductVariant[]> {
    const result = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY created_at',
      [productId]
    );
    return result.rows;
  }

  async findVariantById(id: string): Promise<ProductVariant | null> {
    const result = await pool.query('SELECT * FROM product_variants WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findVariantBySku(sku: string): Promise<ProductVariant | null> {
    const result = await pool.query('SELECT * FROM product_variants WHERE sku = $1', [sku]);
    return result.rows[0] || null;
  }

  async updateVariant(id: string, data: Partial<ProductVariant>): Promise<ProductVariant> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'product_id' && key !== 'created_at') {
        if (key === 'attributes') {
          fields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return (await this.findVariantById(id))!;
    }

    values.push(id);

    const query = `
      UPDATE product_variants 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async deleteVariant(id: string): Promise<void> {
    await pool.query('DELETE FROM product_variants WHERE id = $1', [id]);
  }

  // ==================== PRODUCT IMAGES ====================

  async addImage(
    data: Omit<ProductImage, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ProductImage> {
    const result = await pool.query(
      `INSERT INTO product_images (
        product_id, variant_id, url, thumbnail_url, alt_text, 
        display_order, is_primary, width, height, file_size, format
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        data.product_id,
        data.variant_id || null,
        data.url,
        data.thumbnail_url || null,
        data.alt_text || null,
        data.display_order || 0,
        data.is_primary || false,
        data.width || null,
        data.height || null,
        data.file_size || null,
        data.format || null,
      ]
    );
    return result.rows[0];
  }

  async findImagesByProductId(productId: string): Promise<ProductImage[]> {
    const result = await pool.query(
      'SELECT * FROM product_images WHERE product_id = $1 ORDER BY display_order, created_at',
      [productId]
    );
    return result.rows;
  }

  async findImagesByVariantId(variantId: string): Promise<ProductImage[]> {
    const result = await pool.query(
      'SELECT * FROM product_images WHERE variant_id = $1 ORDER BY display_order, created_at',
      [variantId]
    );
    return result.rows;
  }

  async setPrimaryImage(imageId: string, productId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Remove primary flag from all images of this product
      await client.query('UPDATE product_images SET is_primary = FALSE WHERE product_id = $1', [
        productId,
      ]);

      // Set the specified image as primary
      await client.query('UPDATE product_images SET is_primary = TRUE WHERE id = $1', [imageId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteImage(id: string): Promise<void> {
    await pool.query('DELETE FROM product_images WHERE id = $1', [id]);
  }

  // ==================== UTILITY METHODS ====================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

export default new ProductRepository();
