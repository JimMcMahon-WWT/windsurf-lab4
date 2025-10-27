import 'dotenv/config';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

import { testConnection, closeConnection } from './config/database.config';
import { getProducer, getConsumer, createTopics, disconnectKafka } from './config/kafka.config';
import { getRedisClient, closeRedisConnection } from './config/redis.config';
import { startOutboxProcessor } from './events/event-publisher';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import { logger } from './utils/logger.utils';
import { metricsMiddleware, getMetrics } from './utils/metrics.utils';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics middleware (track all requests)
app.use(metricsMiddleware);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Metrics endpoint (Prometheus scraping)
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', 'text/plain');
    res.send(await getMetrics());
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'order-service',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

/**
 * Initialize all connections and start the server
 */
async function startServer() {
  try {
    logger.info('🚀 Starting Order Service...');

    // Test PostgreSQL connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to PostgreSQL');
    }

    // Initialize Redis
    await getRedisClient();
    logger.info('✅ Redis connection established');

    // Initialize Kafka
    try {
      await createTopics();
      await getProducer();
      await getConsumer();
      logger.info('✅ Kafka connections established');

      // Start outbox processor
      startOutboxProcessor();
    } catch (kafkaError) {
      logger.warn('⚠️ Kafka connection failed - events will be disabled:', kafkaError);
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`✅ Order Service listening on port ${PORT}`);
      logger.info(`📝 API: http://localhost:${PORT}/api/v1`);
      logger.info(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await closeConnection();
          await closeRedisConnection();
          await disconnectKafka();
          logger.info('All connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
