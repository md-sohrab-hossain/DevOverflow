import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isEdge = process.env.NEXT_RUNTIME === 'edge';
const logLevel = process.env.LOG_LEVEL || 'info';

// Transport configuration for non-edge and non-production environments
const transportConfig =
  !isEdge && !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      }
    : undefined;

// Logger configuration
const logger = pino({
  level: logLevel,
  transport: transportConfig,
  formatters: {
    level: label => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
