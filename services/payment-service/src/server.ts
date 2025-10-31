import './tracing';

import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { testConnection } from './config/database.config';
import { connectRedis } from './config/redis.config';
import paymentRoutes from './routes/payment.routes';
import { logger } from './utils/logger.utils';
import { metricsMiddleware, getMetrics } from './utils/metrics.utils';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3004;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
};
app.use(cors(corsOptions));

// Rate limiting (PCI requirement)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Metrics middleware (track all requests)
app.use(metricsMiddleware);

// Metrics endpoint (Prometheus scraping)
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', 'text/plain');
    res.send(await getMetrics());
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});

// Request logging
app.use((req: Request, res: Response, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/v1', paymentRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Error handler
app.use((error: Error, _req: Request, res: Response) => {
  logger.error('Unhandled error:', error);

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing connections...');

  // Give time for in-flight requests to complete
  setTimeout(() => {
    logger.info('Shutdown complete');
    process.exit(0);
  }, 5000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    logger.info('🚀 Starting Payment Service...');

    // Test database connection
    await testConnection();

    // Connect to Redis
    await connectRedis();

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`✅ Payment Service listening on port ${PORT}`);
      logger.info(`📝 API: http://localhost:${PORT}/api/v1`);
      logger.info(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('🔒 PCI Compliance Mode: Active');
      logger.info('🛡️  Fraud Detection: Enabled');
    });
  } catch (error) {
    logger.error('Failed to start Payment Service:', error);
    process.exit(1);
  }
};

startServer();

export default app;
