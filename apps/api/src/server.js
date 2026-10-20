/** Process entry point: connect to MongoDB, start HTTP, shut down gracefully. */
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDb, disconnectDb } from './config/db.js';
import { createApp } from './app.js';

async function main() {
  await connectDb(env.mongoUri);
  const server = createApp().listen(env.port, () =>
    logger.info({ port: env.port, env: env.nodeEnv }, 'Ghotok API listening')
  );

  let closing = false;
  const shutdown = (signal) => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref(); // do not hang forever on open connections
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled promise rejection'));

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
