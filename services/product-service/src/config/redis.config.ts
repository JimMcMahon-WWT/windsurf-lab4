import Redis from 'ioredis';
import { logger } from '../utils/logger.utils';

// Create Redis client
export const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Redis event handlers
redisClient.on('connect', () => {
  logger.info('✅ Redis connection established');
});

redisClient.on('error', (err: Error) => {
  logger.error('❌ Redis connection error:', err);
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
});

// Test Redis connection
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    await redisClient.ping();
    logger.info('✅ Redis connection test successful');
    return true;
  } catch (error) {
    logger.error('❌ Redis connection test failed:', error);
    return false;
  }
};

// Cache TTL from environment
export const cacheTTL = parseInt(process.env.REDIS_CACHE_TTL || '3600');

// Cache helpers
export const cacheSet = async (
  key: string,
  value: any,
  ttl: number = cacheTTL
): Promise<void> => {
  await redisClient.setex(`product:${key}`, ttl, JSON.stringify(value));
};

export const cacheGet = async (key: string): Promise<any | null> => {
  const data = await redisClient.get(`product:${key}`);
  return data ? JSON.parse(data) : null;
};

export const cacheDelete = async (key: string): Promise<void> => {
  await redisClient.del(`product:${key}`);
};

export const cacheDeletePattern = async (pattern: string): Promise<void> => {
  const keys = await redisClient.keys(`product:${pattern}`);
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
};

// Inventory lock helpers (for concurrent inventory updates)
export const acquireLock = async (
  key: string,
  ttl: number = 10
): Promise<boolean> => {
  const result = await redisClient.set(
    `lock:${key}`,
    '1',
    'EX',
    ttl,
    'NX'
  );
  return result === 'OK';
};

export const releaseLock = async (key: string): Promise<void> => {
  await redisClient.del(`lock:${key}`);
};

// Graceful shutdown
export const closeRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
};
