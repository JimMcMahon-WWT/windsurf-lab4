import dotenv from 'dotenv';
import app from './app';
import pool from './config/database';
import logger from './config/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Test database connection
const testDatabaseConnection = async () => {
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testDatabaseConnection();

    // Start listening
    app.listen(PORT, () => {
      logger.info(`User service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    logger.info('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  pool.end(() => {
    logger.info('Database pool closed');
    process.exit(0);
  });
});

// Start the server
startServer();
