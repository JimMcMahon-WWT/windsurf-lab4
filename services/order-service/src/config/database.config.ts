import { Pool, PoolConfig } from 'pg';

import { logger } from '../utils/logger.utils';

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432'),
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'order_db',
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  logger.info('PostgreSQL client connected');
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected PostgreSQL error:', err);
});

export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ PostgreSQL connection established successfully');
    return true;
  } catch (error) {
    logger.error('❌ PostgreSQL connection failed:', error);
    return false;
  }
};

export const closeConnection = async (): Promise<void> => {
  await pool.end();
  logger.info('PostgreSQL connection closed');
};
