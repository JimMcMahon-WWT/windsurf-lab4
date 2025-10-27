import { Client } from '@elastic/elasticsearch';

import { logger } from '../utils/logger.utils';

const node = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const username = process.env.ELASTICSEARCH_USERNAME;
const password = process.env.ELASTICSEARCH_PASSWORD;

// Create Elasticsearch client
export const esClient = new Client({
  node,
  auth: username && password ? { username, password } : undefined,
  maxRetries: 3,
  requestTimeout: 30000,
  sniffOnStart: false,
});

// Index name with prefix
const indexPrefix = process.env.ELASTICSEARCH_INDEX_PREFIX || 'ecommerce_products';
export const PRODUCT_INDEX = `${indexPrefix}_main`;

// Test Elasticsearch connection
export const testElasticsearchConnection = async (): Promise<boolean> => {
  try {
    const health = await esClient.cluster.health();
    logger.info('✅ Elasticsearch connection established', {
      status: health.status,
      cluster_name: health.cluster_name,
    });
    return true;
  } catch (error) {
    logger.error('❌ Elasticsearch connection test failed:', error);
    return false;
  }
};

// Create product index with mapping
export const createProductIndex = async (): Promise<void> => {
  try {
    const exists = await esClient.indices.exists({ index: PRODUCT_INDEX });
    
    if (!exists) {
      await esClient.indices.create({
        index: PRODUCT_INDEX,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1,
            analysis: {
              analyzer: {
                autocomplete: {
                  type: 'custom',
                  tokenizer: 'autocomplete',
                  filter: ['lowercase'],
                },
                autocomplete_search: {
                  type: 'custom',
                  tokenizer: 'lowercase',
                },
              },
              tokenizer: {
                autocomplete: {
                  type: 'edge_ngram',
                  min_gram: 2,
                  max_gram: 10,
                  token_chars: ['letter', 'digit'],
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              name: {
                type: 'text',
                analyzer: 'autocomplete',
                search_analyzer: 'autocomplete_search',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              slug: { type: 'keyword' },
              description: { type: 'text' },
              short_description: { type: 'text' },
              sku: { type: 'keyword' },
              brand: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              category_id: { type: 'keyword' },
              category_name: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              category_path: { type: 'text' },
              base_price: { type: 'float' },
              sale_price: { type: 'float' },
              current_price: { type: 'float' },
              currency: { type: 'keyword' },
              status: { type: 'keyword' },
              is_featured: { type: 'boolean' },
              is_available: { type: 'boolean' },
              in_stock: { type: 'boolean' },
              stock_quantity: { type: 'integer' },
              average_rating: { type: 'float' },
              review_count: { type: 'integer' },
              view_count: { type: 'integer' },
              purchase_count: { type: 'integer' },
              tags: { type: 'keyword' },
              attributes: {
                type: 'nested',
                properties: {
                  name: { type: 'keyword' },
                  value: { type: 'keyword' },
                },
              },
              images: {
                type: 'object',
                properties: {
                  url: { type: 'keyword' },
                  thumbnail_url: { type: 'keyword' },
                  is_primary: { type: 'boolean' },
                },
              },
              created_at: { type: 'date' },
              updated_at: { type: 'date' },
              published_at: { type: 'date' },
            },
          },
        },
      });
      
      logger.info(`✅ Created Elasticsearch index: ${PRODUCT_INDEX}`);
    } else {
      logger.info(`Elasticsearch index already exists: ${PRODUCT_INDEX}`);
    }
  } catch (error) {
    logger.error('❌ Error creating Elasticsearch index:', error);
    throw error;
  }
};

// Index a product document
export const indexProduct = async (product: any): Promise<void> => {
  try {
    await esClient.index({
      index: PRODUCT_INDEX,
      id: product.id,
      document: product,
      refresh: true,
    });
    logger.debug(`Indexed product: ${product.id}`);
  } catch (error) {
    logger.error(`Error indexing product ${product.id}:`, error);
    throw error;
  }
};

// Bulk index products
export const bulkIndexProducts = async (products: any[]): Promise<void> => {
  try {
    const body = products.flatMap((product) => [
      { index: { _index: PRODUCT_INDEX, _id: product.id } },
      product,
    ]);

    const result = await esClient.bulk({ body, refresh: true });
    
    if (result.errors) {
      logger.error('Bulk indexing had errors:', result.items);
    } else {
      logger.info(`Bulk indexed ${products.length} products`);
    }
  } catch (error) {
    logger.error('Error bulk indexing products:', error);
    throw error;
  }
};

// Delete a product document
export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    await esClient.delete({
      index: PRODUCT_INDEX,
      id: productId,
      refresh: true,
    });
    logger.debug(`Deleted product from index: ${productId}`);
  } catch (error) {
    if ((error as any).meta?.statusCode !== 404) {
      logger.error(`Error deleting product ${productId}:`, error);
      throw error;
    }
  }
};

// Update a product document
export const updateProduct = async (
  productId: string,
  updates: any
): Promise<void> => {
  try {
    await esClient.update({
      index: PRODUCT_INDEX,
      id: productId,
      doc: updates,
      refresh: true,
    });
    logger.debug(`Updated product in index: ${productId}`);
  } catch (error) {
    logger.error(`Error updating product ${productId}:`, error);
    throw error;
  }
};

// Search products
export const searchProducts = async (query: any): Promise<any> => {
  try {
    const result = await esClient.search({
      index: PRODUCT_INDEX,
      ...query,
    });
    return result;
  } catch (error) {
    logger.error('Error searching products:', error);
    throw error;
  }
};

// Graceful shutdown
export const closeElasticsearch = async (): Promise<void> => {
  try {
    await esClient.close();
    logger.info('Elasticsearch connection closed');
  } catch (error) {
    logger.error('Error closing Elasticsearch connection:', error);
  }
};
