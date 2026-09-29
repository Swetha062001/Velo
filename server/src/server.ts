import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`VELO API listening on http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${env.PORT} is already in use. Change PORT in server/.env.`);
  } else {
    logger.error('Server failed to start', { err });
  }
  process.exit(1);
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// A crash in unknown state is safer than continuing; the dev watcher restarts the process.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { err: reason });
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { err });
  process.exit(1);
});
