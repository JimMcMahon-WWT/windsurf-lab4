import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'user_db',
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
