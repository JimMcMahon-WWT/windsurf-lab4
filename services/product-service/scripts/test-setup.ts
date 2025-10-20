import dotenv from 'dotenv';
dotenv.config();

import { testConnection, closePool } from '../src/config/database.config';
import { testRedisConnection, closeRedis } from '../src/config/redis.config';
import { testElasticsearchConnection, createProductIndex, closeElasticsearch } from '../src/config/elasticsearch.config';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'product_db',
});

async function testSetup() {
  console.log('🧪 Testing Product Service Setup\n');
  console.log('════════════════════════════════════════════════════════════\n');

  let exitCode = 0;

  try {
    // Test 1: PostgreSQL Connection
    console.log('📦 Test 1: PostgreSQL Connection');
    console.log('────────────────────────────────────────────────────────────');
    const dbConnected = await testConnection();
    if (dbConnected) {
      console.log('✅ PostgreSQL connection successful\n');
    } else {
      console.log('❌ PostgreSQL connection failed\n');
      exitCode = 1;
    }

    // Test 2: Redis Connection
    console.log('📦 Test 2: Redis Connection');
    console.log('────────────────────────────────────────────────────────────');
    const redisConnected = await testRedisConnection();
    if (redisConnected) {
      console.log('✅ Redis connection successful\n');
    } else {
      console.log('⚠️  Redis connection failed (optional)\n');
    }

    // Test 3: Elasticsearch Connection
    console.log('📦 Test 3: Elasticsearch Connection');
    console.log('────────────────────────────────────────────────────────────');
    try {
      const esConnected = await testElasticsearchConnection();
      if (esConnected) {
        console.log('✅ Elasticsearch connection successful');
        await createProductIndex();
        console.log('✅ Product index created/verified\n');
      } else {
        console.log('⚠️  Elasticsearch connection failed (optional)\n');
      }
    } catch (error: any) {
      console.log(`⚠️  Elasticsearch error: ${error.message} (optional)\n`);
    }

    // Test 4: Database Tables
    console.log('📦 Test 4: Database Tables');
    console.log('────────────────────────────────────────────────────────────');
    const requiredTables = [
      'categories',
      'products',
      'product_variants',
      'inventory',
      'product_images',
      'tags',
      'product_tags',
      'product_reviews',
      'product_discounts',
      'product_discount_mapping',
      'inventory_reservations',
      'inventory_history',
      'product_views',
      'product_recommendations',
      'search_queries',
      'product_attributes',
    ];

    for (const table of requiredTables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );

      if (result.rows[0].exists) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.log(`❌ Table '${table}' missing`);
        exitCode = 1;
      }
    }

    console.log('\n════════════════════════════════════════════════════════════');
    if (exitCode === 0) {
      console.log('🎉 All tests passed! Setup is complete.\n');
      console.log('✨ You can now start the service with: npm run dev\n');
    } else {
      console.log('❌ Some tests failed. Please check the output above.\n');
    }
    console.log('════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Test error:', error);
    exitCode = 1;
  } finally {
    await closePool();
    await closeRedis();
    await closeElasticsearch();
  }

  process.exit(exitCode);
}

testSetup();
