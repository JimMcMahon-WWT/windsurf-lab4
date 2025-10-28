import { createClient, RedisClientType } from 'redis';

import { logger } from '../utils/logger.utils';

let redisClient: RedisClientType | null = null;

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  });

  redisClient.on('error', (err) => logger.error('Redis Client Error:', err));
  redisClient.on('connect', () => logger.info('✅ Redis connected'));
  redisClient.on('ready', () => logger.info('Redis client ready'));

  await redisClient.connect();

  return redisClient;
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

// Cache utilities
export const cacheSet = async (
  key: string,
  value: any,
  expirySeconds: number = 3600
): Promise<void> => {
  const client = await getRedisClient();
  await client.setEx(key, expirySeconds, JSON.stringify(value));
};

export const cacheGet = async (key: string): Promise<any | null> => {
  const client = await getRedisClient();
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
};

export const cacheDelete = async (key: string): Promise<void> => {
  const client = await getRedisClient();
  await client.del(key);
};

export const cacheExists = async (key: string): Promise<boolean> => {
  const client = await getRedisClient();
  const exists = await client.exists(key);
  return exists === 1;
};
