import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'debug';

// Define custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = JSON.stringify(meta);
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`;
  })
);

// Create logger instance  
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let metaString = '';
          if (Object.keys(meta).length > 0 && meta.stack) {
            metaString = `\n${meta.stack}`;
          } else if (Object.keys(meta).length > 0) {
            metaString = ` ${JSON.stringify(meta)}`;
          }
          return `${timestamp} ${level}: ${message}${metaString}`;
        })
      ),
    }),
  ],
  // Only log to console - no file logging in containers
  exitOnError: false,
});

// Don't log to files in test environment
if (process.env.NODE_ENV === 'test') {
  logger.transports.forEach((transport) => {
    if (transport instanceof winston.transports.File) {
      transport.silent = true;
    }
  });
}

export default logger;
