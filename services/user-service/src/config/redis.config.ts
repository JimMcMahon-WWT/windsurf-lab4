import Redis from 'ioredis';

import { logger } from '../utils/logger.utils';

// Create Redis client
export const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Redis event handlers
redisClient.on('connect', () => {
  logger.info('✅ Redis connection established');
});

redisClient.on('error', (err) => {
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

// Session management helpers
export const sessionTTL = parseInt(process.env.REDIS_SESSION_TTL || '3600');

export const setSession = async (
  userId: string,
  sessionToken: string,
  data: any
): Promise<void> => {
  const key = `session:${userId}:${sessionToken}`;
  await redisClient.setex(key, sessionTTL, JSON.stringify(data));
};

export const getSession = async (userId: string, sessionToken: string): Promise<any | null> => {
  const key = `session:${userId}:${sessionToken}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

export const deleteSession = async (userId: string, sessionToken: string): Promise<void> => {
  const key = `session:${userId}:${sessionToken}`;
  await redisClient.del(key);
};

export const deleteAllUserSessions = async (userId: string): Promise<void> => {
  const pattern = `session:${userId}:*`;
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
};

// Cache helpers
export const cacheSet = async (key: string, value: any, ttl: number = 3600): Promise<void> => {
  await redisClient.setex(`cache:${key}`, ttl, JSON.stringify(value));
};

export const cacheGet = async (key: string): Promise<any | null> => {
  const data = await redisClient.get(`cache:${key}`);
  return data ? JSON.parse(data) : null;
};

export const cacheDelete = async (key: string): Promise<void> => {
  await redisClient.del(`cache:${key}`);
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
