/**
 * Starts the API for end-to-end tests: an in-memory MongoDB seeded with the super admin,
 * packages and demo biodatas. Set E2E_MONGODB_URI to use a real database instead (CI).
 */
import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test'; // relaxed rate limits, quiet logs
process.env.PORT ||= '5000';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `ghotok-e2e-uploads-${process.pid}`);
process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:5173';
process.env.SMS_DRIVER = 'log';
process.env.BKASH_MERCHANT_NUMBER ||= '01700000000';
process.env.NAGAD_MERCHANT_NUMBER ||= '01800000000';
process.env.LOG_LEVEL ||= 'warn';

let uri = process.env.E2E_MONGODB_URI;
let mongo;
if (!uri) {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongo = await MongoMemoryServer.create();
  uri = mongo.getUri();
}

const { connectDb } = await import('../apps/api/src/config/db.js');
const { createApp } = await import('../apps/api/src/app.js');
const { seed } = await import('../apps/api/src/scripts/seed.js');
const { smsOutbox } = await import('../apps/api/src/services/sms.js');
const { outbox } = await import('../apps/api/src/services/mailer.js');

await connectDb(uri);
await seed({ withDemo: true, log: () => {} });

const app = createApp();
// Test-only helpers so browser tests can read one-time codes and emails.
app.get('/__e2e/sms', (req, res) => res.json(smsOutbox.filter((m) => !req.query.to || m.to === req.query.to)));
app.get('/__e2e/mail', (req, res) => res.json(outbox.filter((m) => !req.query.to || m.to === req.query.to)));

const server = app.listen(Number(process.env.PORT), () => console.log(`E2E API on :${process.env.PORT}`));
const stop = async () => {
  server.close();
  await mongo?.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
