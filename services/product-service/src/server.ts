import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { logger } from './utils/logger.utils';
import { testConnection, closePool } from './config/database.config';
import { testRedisConnection, closeRedis } from './config/redis.config';
import { testElasticsearchConnection, createProductIndex, closeElasticsearch } from './config/elasticsearch.config';
import { createProducer, closeKafka } from './config/kafka.config';
import inventoryService from './services/inventory.service';

const PORT = process.env.PORT || 3002;

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting Product Service...');
    logger.info('🚀 Starting Product Service...');

    // Test database connection
    console.log('Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to PostgreSQL');
      throw new Error('Failed to connect to PostgreSQL');
    }
    console.log('✅ Database connected');

    // Test Redis connection
    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      logger.warn('Redis connection failed - caching will be disabled');
    }

    // Test Elasticsearch connection and create index
    try {
      const esConnected = await testElasticsearchConnection();
      if (esConnected) {
        await createProductIndex();
      } else {
        logger.warn('Elasticsearch connection failed - search will be disabled');
      }
    } catch (error) {
      logger.warn('Elasticsearch setup failed:', error);
    }

    // Initialize Kafka producer
    try {
      await createProducer();
    } catch (error) {
      logger.warn('Kafka initialization failed - events will not be published:', error);
    }

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`✅ Product Service listening on port ${PORT}`);
      logger.info(`📝 API: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
      logger.info(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Setup cron job for expiring reservations (every 5 minutes)
    setInterval(async () => {
      try {
        await inventoryService.expireOldReservations();
      } catch (error) {
        logger.error('Error expiring reservations:', error);
      }
    }, 5 * 60 * 1000);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close all connections
        await Promise.all([
          closePool(),
          closeRedis(),
          closeElasticsearch(),
          closeKafka(),
        ]);

        logger.info('All connections closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
