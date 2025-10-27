import { 
  PRODUCT_INDEX, 
  indexProduct, 
  deleteProduct as deleteFromIndex,
  updateProduct as updateInIndex,
  searchProducts as esSearch
} from '../config/elasticsearch.config';
import categoryRepository from '../repositories/category.repository';
import inventoryRepository from '../repositories/inventory.repository';
import productRepository from '../repositories/product.repository';
import { ProductSearchQuery, ProductSearchResult, SearchFacets } from '../types/product.types';
import { logger } from '../utils/logger.utils';

export class SearchService {
  /**
   * Index a product in Elasticsearch
   */
  async indexProduct(productId: string): Promise<void> {
    try {
      const product = await productRepository.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Get additional data
      const [images, inventory, category] = await Promise.all([
        productRepository.findImagesByProductId(productId),
        inventoryRepository.findByProductId(productId),
        product.category_id ? categoryRepository.findById(product.category_id) : null,
      ]);

      // Build search document
      const searchDoc = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        short_description: product.short_description,
        sku: product.sku,
        brand: product.brand,
        category_id: product.category_id,
        category_name: category?.name || null,
        base_price: product.base_price,
        sale_price: product.sale_price,
        current_price: product.sale_price || product.base_price,
        currency: product.currency,
        status: product.status,
        is_featured: product.is_featured,
        is_available: product.is_available,
        in_stock: inventory ? inventory.available_quantity > 0 : false,
        stock_quantity: inventory?.available_quantity || 0,
        average_rating: product.average_rating,
        review_count: product.review_count,
        view_count: product.view_count,
        purchase_count: product.purchase_count,
        images: images.map(img => ({
          url: img.url,
          thumbnail_url: img.thumbnail_url,
          is_primary: img.is_primary,
        })),
        created_at: product.created_at,
        updated_at: product.updated_at,
        published_at: product.published_at,
      };

      await indexProduct(searchDoc);
      logger.debug(`Product indexed: ${productId}`);
    } catch (error) {
      logger.warn(`Elasticsearch not available - skipping product indexing: ${productId}`);
      // Don't throw - allow product creation to succeed without search indexing
    }
  }

  /**
   * Remove a product from Elasticsearch
   */
  async removeProduct(productId: string): Promise<void> {
    try {
      await deleteFromIndex(productId);
      logger.debug(`Product removed from index: ${productId}`);
    } catch (error) {
      logger.warn(`Elasticsearch not available - skipping product removal: ${productId}`);
      // Don't throw - allow product deletion to succeed without search removal
    }
  }

  /**
   * Update product in Elasticsearch
   */
  async updateProduct(productId: string, updates: any): Promise<void> {
    try {
      await updateInIndex(productId, updates);
      logger.debug(`Product updated in index: ${productId}`);
    } catch (error) {
      logger.error(`Error updating product ${productId} in index:`, error);
      // If update fails, try re-indexing
      await this.indexProduct(productId);
    }
  }

  /**
   * Search products with filters, sorting, and pagination
   */
  async search(query: ProductSearchQuery): Promise<ProductSearchResult> {
    try {
      const {
        query: searchQuery,
        filters = {},
        sort_by = 'relevance',
        page = 1,
        limit = 20,
      } = query;

      const from = (page - 1) * limit;

      // Build Elasticsearch query
      const esQuery: any = {
        bool: {
          must: [],
          filter: [
            { term: { status: 'active' } },
            { term: { is_available: true } },
          ],
        },
      };

      // Add search query
      if (searchQuery) {
        esQuery.bool.must.push({
          multi_match: {
            query: searchQuery,
            fields: [
              'name^3',
              'name.keyword^4',
              'brand^2',
              'description',
              'short_description',
              'sku',
            ],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      } else {
        esQuery.bool.must.push({ match_all: {} });
      }

      // Add filters
      if (filters.category_id) {
        esQuery.bool.filter.push({ term: { category_id: filters.category_id } });
      }

      if (filters.brand) {
        esQuery.bool.filter.push({ term: { 'brand.keyword': filters.brand } });
      }

      if (filters.min_price !== undefined || filters.max_price !== undefined) {
        const priceRange: any = {};
        if (filters.min_price !== undefined) priceRange.gte = filters.min_price;
        if (filters.max_price !== undefined) priceRange.lte = filters.max_price;
        esQuery.bool.filter.push({ range: { current_price: priceRange } });
      }

      if (filters.rating !== undefined) {
        esQuery.bool.filter.push({
          range: { average_rating: { gte: filters.rating } },
        });
      }

      if (filters.in_stock) {
        esQuery.bool.filter.push({ term: { in_stock: true } });
      }

      if (filters.is_featured) {
        esQuery.bool.filter.push({ term: { is_featured: true } });
      }

      if (filters.tags && filters.tags.length > 0) {
        esQuery.bool.filter.push({ terms: { tags: filters.tags } });
      }

      // Build sort
      const sort: any[] = [];
      switch (sort_by) {
        case 'price_asc':
          sort.push({ current_price: 'asc' });
          break;
        case 'price_desc':
          sort.push({ current_price: 'desc' });
          break;
        case 'rating':
          sort.push({ average_rating: 'desc' });
          break;
        case 'newest':
          sort.push({ created_at: 'desc' });
          break;
        case 'popular':
          sort.push({ purchase_count: 'desc' });
          break;
        default: // relevance
          if (searchQuery) {
            sort.push('_score');
          } else {
            sort.push({ created_at: 'desc' });
          }
      }

      // Build aggregations for facets
      const aggs: any = {
        brands: {
          terms: { field: 'brand.keyword', size: 20 },
        },
        categories: {
          terms: { field: 'category_id', size: 20 },
        },
        price_ranges: {
          range: {
            field: 'current_price',
            ranges: [
              { to: 25 },
              { from: 25, to: 50 },
              { from: 50, to: 100 },
              { from: 100, to: 200 },
              { from: 200 },
            ],
          },
        },
        ratings: {
          terms: { field: 'average_rating' },
        },
      };

      // Execute search
      const result = await esSearch({
        index: PRODUCT_INDEX,
        body: {
          query: esQuery,
          sort,
          from,
          size: limit,
          aggs,
        },
      });

      // Parse results
      const hits = result.hits.hits;
      const total = typeof result.hits.total === 'number' 
        ? result.hits.total 
        : result.hits.total.value;

      const products = hits.map((hit: any) => hit._source);

      // Parse facets
      const facets: SearchFacets = {
        brands: result.aggregations?.brands?.buckets.map((b: any) => ({
          name: b.key,
          count: b.doc_count,
        })) || [],
        price_ranges: result.aggregations?.price_ranges?.buckets.map((b: any) => ({
          min: b.from || 0,
          max: b.to || 999999,
          count: b.doc_count,
        })) || [],
        ratings: result.aggregations?.ratings?.buckets.map((b: any) => ({
          rating: b.key,
          count: b.doc_count,
        })) || [],
      };

      // Get category names for facets
      if (result.aggregations?.categories?.buckets.length > 0) {
        const categoryIds = result.aggregations.categories.buckets.map((b: any) => b.key);
        const categories = await Promise.all(
          categoryIds.map((id: string) => categoryRepository.findById(id))
        );
        
        facets.categories = result.aggregations.categories.buckets
          .map((b: any, idx: number) => ({
            id: b.key,
            name: categories[idx]?.name || 'Unknown',
            count: b.doc_count,
          }))
          .filter((c: any) => c.name !== 'Unknown');
      }

      return {
        products,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        facets,
      };
    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(query: string, limit: number = 10): Promise<string[]> {
    try {
      const result = await esSearch({
        index: PRODUCT_INDEX,
        body: {
          query: {
            bool: {
              must: [
                {
                  match: {
                    name: {
                      query,
                      operator: 'and',
                      fuzziness: 'AUTO',
                    },
                  },
                },
              ],
              filter: [
                { term: { status: 'active' } },
                { term: { is_available: true } },
              ],
            },
          },
          _source: ['name'],
          size: limit,
        },
      });

      return result.hits.hits.map((hit: any) => hit._source.name);
    } catch (error) {
      logger.error('Error getting autocomplete suggestions:', error);
      return [];
    }
  }

  /**
   * Reindex all products
   */
  async reindexAll(): Promise<void> {
    try {
      logger.info('Starting full reindex...');
      
      let offset = 0;
      const batchSize = 100;
      let hasMore = true;

      while (hasMore) {
        const { products, total } = await productRepository.findAll({}, batchSize, offset);
        
        if (products.length === 0) {
          hasMore = false;
          break;
        }

        // Index batch
        await Promise.all(
          products.map(product => this.indexProduct(product.id))
        );

        offset += batchSize;
        logger.info(`Reindexed ${Math.min(offset, total)} of ${total} products`);
      }

      logger.info('Full reindex completed');
    } catch (error) {
      logger.error('Error during reindex:', error);
      throw error;
    }
  }
}

export default new SearchService();
