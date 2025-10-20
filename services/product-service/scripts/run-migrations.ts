import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'product_db',
});

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established\n');

    // Get migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files:\n`);

    // Run each migration
    for (const file of files) {
      console.log(`📄 Running: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await pool.query(sql);
        console.log(`✅ ${file} completed\n`);
      } catch (error: any) {
        console.error(`❌ Migration error: ${error.message}\n`);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
