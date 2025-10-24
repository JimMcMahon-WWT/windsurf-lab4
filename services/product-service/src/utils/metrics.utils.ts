import { Request, Response, NextFunction } from 'express';
import * as promClient from 'prom-client';

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'product-service',
  environment: process.env.NODE_ENV || 'development',
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Business metrics
const productSearches = new promClient.Counter({
  name: 'product_searches_total',
  help: 'Total number of product searches',
  labelNames: ['status'],
  registers: [register],
});

const productViews = new promClient.Counter({
  name: 'product_views_total',
  help: 'Total number of product views',
  registers: [register],
});

const productsCreated = new promClient.Counter({
  name: 'products_created_total',
  help: 'Total number of products created',
  registers: [register],
});

const activeProducts = new promClient.Gauge({
  name: 'active_products',
  help: 'Number of currently active products',
  registers: [register],
});

/**
 * Middleware to track HTTP request metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  activeConnections.inc();

  // Override res.end to capture metrics when request finishes
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encodingOrCallback?: any, callback?: any): Response {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    httpRequestTotal.inc({ method, route, status_code: statusCode });
    activeConnections.dec();

    // Call original end with proper arguments
    return originalEnd(chunk, encodingOrCallback, callback);
  } as any;

  next();
};

/**
 * Get metrics in Prometheus format
 */
export const getMetrics = async (): Promise<string> => {
  return await register.metrics();
};

/**
 * Get metrics registry
 */
export const getRegister = () => register;

/**
 * Business metrics tracking functions
 */
export const metrics = {
  // Product search metrics
  recordProductSearch: (success: boolean) => {
    productSearches.inc({ status: success ? 'success' : 'failure' });
  },

  // Product view metrics
  recordProductView: () => {
    productViews.inc();
  },

  // Product creation metrics
  recordProductCreation: () => {
    productsCreated.inc();
  },

  // Update active products count
  setActiveProducts: (count: number) => {
    activeProducts.set(count);
  },

  // Custom counter
  incrementCounter: (name: string, labels?: Record<string, string>) => {
    const counter = new promClient.Counter({
      name,
      help: `Counter for ${name}`,
      labelNames: labels ? Object.keys(labels) : [],
      registers: [register],
    });
    if (labels) {
      counter.inc(labels);
    } else {
      counter.inc();
    }
  },

  // Custom gauge
  setGauge: (name: string, value: number, labels?: Record<string, string>) => {
    const gauge = new promClient.Gauge({
      name,
      help: `Gauge for ${name}`,
      labelNames: labels ? Object.keys(labels) : [],
      registers: [register],
    });
    gauge.set(labels || {}, value);
  },
};

export default {
  metricsMiddleware,
  getMetrics,
  getRegister,
  metrics,
};
