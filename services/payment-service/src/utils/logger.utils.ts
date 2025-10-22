import winston from 'winston';
import { maskCardNumber, maskEmail } from './encryption.utils';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      // Sanitize sensitive data before logging
      const sanitized = sanitizeLogData(meta);
      log += ` ${JSON.stringify(sanitized)}`;
    }
    
    return log;
  })
);

/**
 * Sanitize log data to remove/mask sensitive information (PCI Compliance)
 */
const sanitizeLogData = (data: any): any => {
  if (!data) return data;
  
  const sensitiveFields = [
    'cardNumber',
    'cvv',
    'password',
    'token',
    'apiKey',
    'secret',
    'authorization',
  ];
  
  const sanitized: any = { ...data };
  
  for (const key in sanitized) {
    if (sensitiveFields.includes(key)) {
      sanitized[key] = '***REDACTED***';
    } else if (key === 'email' && typeof sanitized[key] === 'string') {
      sanitized[key] = maskEmail(sanitized[key]);
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  
  return sanitized;
};

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: process.env.SERVICE_NAME || 'payment-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    // File transport for audit logs (PCI requirement)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/payment-audit.log',
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default logger;
