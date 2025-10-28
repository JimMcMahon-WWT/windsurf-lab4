#!/usr/bin/env node

/**
 * Production Database Migration Script
 * Runs migrations with safety checks and rollback capability
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.env.DRY_RUN === 'true';
const BACKUP_ID = process.env.BACKUP_ID || Date.now().toString();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 5,
  connectionTimeoutMillis: 5000,
});

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const emoji =
    {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }[level] || 'ℹ️';
  console.log(`${timestamp} ${emoji} ${message}`);
}

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      execution_time_ms INTEGER,
      backup_id VARCHAR(255),
      rollback_sql TEXT
    );
  `);
  log('Migrations table ready');
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
  return result.rows.map((row) => row.version);
}

async function getPendingMigrations(appliedVersions) {
  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files.filter((file) => {
    const version = file.split('_')[0];
    return !appliedVersions.includes(version);
  });
}

async function generateRollbackSQL(migrationSQL) {
  // Simple rollback generation - can be enhanced
  const lines = migrationSQL.split('\n');
  const rollback = [];

  for (const line of lines) {
    const trimmed = line.trim().toUpperCase();

    if (trimmed.startsWith('CREATE TABLE')) {
      const tableName = line.match(/CREATE TABLE (\w+)/i)?.[1];
      if (tableName) {
        rollback.push(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
      }
    } else if (trimmed.startsWith('ALTER TABLE') && trimmed.includes('ADD COLUMN')) {
      const match = line.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/i);
      if (match) {
        rollback.push(`ALTER TABLE ${match[1]} DROP COLUMN IF EXISTS ${match[2]};`);
      }
    } else if (trimmed.startsWith('CREATE INDEX')) {
      const indexName = line.match(/CREATE INDEX (\w+)/i)?.[1];
      if (indexName) {
        rollback.push(`DROP INDEX IF EXISTS ${indexName};`);
      }
    }
  }

  return rollback.reverse().join('\n');
}

async function applyMigration(file) {
  const version = file.split('_')[0];
  const name = file.replace('.sql', '').substring(version.length + 1);
  const migrationPath = path.join(__dirname, '../migrations', file);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  log(`Applying migration: ${file}`);

  if (DRY_RUN) {
    log('DRY RUN - Would execute:', 'warning');
    console.log(sql);
    return { version, name, executionTime: 0 };
  }

  const client = await pool.connect();
  const startTime = Date.now();

  try {
    await client.query('BEGIN');

    // Generate rollback SQL
    const rollbackSQL = await generateRollbackSQL(sql);

    // Execute migration
    await client.query(sql);
    const executionTime = Date.now() - startTime;

    // Record migration
    await client.query(
      `INSERT INTO schema_migrations (version, name, execution_time_ms, backup_id, rollback_sql)
       VALUES ($1, $2, $3, $4, $5)`,
      [version, name, executionTime, BACKUP_ID, rollbackSQL]
    );

    await client.query('COMMIT');

    log(`✅ Migration ${file} completed in ${executionTime}ms`, 'success');
    return { version, name, executionTime };
  } catch (error) {
    await client.query('ROLLBACK');
    log(`❌ Migration ${file} failed: ${error.message}`, 'error');
    throw error;
  } finally {
    client.release();
  }
}

async function validateDatabaseState() {
  log('Validating database state...');

  try {
    // Check database connectivity
    const result = await pool.query('SELECT NOW()');
    log(`Database connection OK: ${result.rows[0].now}`);

    // Check for active connections
    const connections = await pool.query(`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
        AND pid != pg_backend_pid()
        AND state = 'active'
    `);

    const activeCount = parseInt(connections.rows[0].count);
    log(`Active connections: ${activeCount}`);

    if (activeCount > 50) {
      log('⚠️ High number of active connections detected', 'warning');
      log('Consider running migrations during low-traffic period', 'warning');
      return false;
    }

    // Check for locks
    const locks = await pool.query(`
      SELECT count(*) as count
      FROM pg_locks
      WHERE NOT granted
    `);

    if (parseInt(locks.rows[0].count) > 0) {
      log('⚠️ Database locks detected', 'warning');
      return false;
    }

    log('Database state validation passed', 'success');
    return true;
  } catch (error) {
    log(`Database validation failed: ${error.message}`, 'error');
    return false;
  }
}

async function runMigrations() {
  log('🚀 Starting production database migration');
  log(`Backup ID: ${BACKUP_ID}`);
  log(`Dry run: ${DRY_RUN}`);

  try {
    // Validate database state
    const isValid = await validateDatabaseState();
    if (!isValid && !DRY_RUN) {
      log('Database validation failed - aborting migration', 'error');
      process.exit(1);
    }

    // Ensure migrations table exists
    await ensureMigrationsTable();

    // Get applied and pending migrations
    const appliedVersions = await getAppliedMigrations();
    log(`Applied migrations: ${appliedVersions.length}`);

    const pendingFiles = await getPendingMigrations(appliedVersions);
    log(`Pending migrations: ${pendingFiles.length}`);

    if (pendingFiles.length === 0) {
      log('No pending migrations', 'success');
      return;
    }

    // List pending migrations
    log('\nPending migrations:');
    pendingFiles.forEach((file) => log(`  - ${file}`));

    // Apply migrations
    const results = [];
    for (const file of pendingFiles) {
      const result = await applyMigration(file);
      results.push(result);
    }

    // Summary
    log('\n' + '='.repeat(60));
    log('Migration Summary', 'success');
    log('='.repeat(60));
    log(`Total migrations applied: ${results.length}`);
    log(`Total execution time: ${results.reduce((sum, r) => sum + r.executionTime, 0)}ms`);
    log('='.repeat(60));

    if (!DRY_RUN) {
      log('\n✅ All migrations completed successfully', 'success');
    } else {
      log('\n✅ Dry run completed', 'success');
    }
  } catch (error) {
    log(`\n❌ Migration failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  log('\n⚠️ Migration interrupted', 'warning');
  await pool.end();
  process.exit(1);
});

// Run migrations
runMigrations();
