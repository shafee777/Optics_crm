import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { logger } from './config/logger.js';

const server = app.listen(env.PORT, () => {
  logger.info(` Optical CRM Backend listening on http://localhost:${env.PORT}`);
  logger.info(` Health check: http://localhost:${env.PORT}/health/ready`);
});

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await pool.end();
      logger.info('PostgreSQL pool drained successfully.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error closing PostgreSQL pool.');
      process.exit(1);
    }
  });

  // Force close after 10s if stuck
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));