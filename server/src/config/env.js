import 'dotenv/config';

const bool = (v, d = false) => (v === undefined ? d : ['1', 'true', 'yes'].includes(String(v).toLowerCase()));

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ghotok',

  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Comma-separated list of allowed browser origins (web + admin)
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  webUrl: process.env.WEB_URL || 'http://localhost:3000',
  apiPublicUrl: process.env.API_PUBLIC_URL || 'http://localhost:5000',

  // Payments
  manualPaymentNumbers: {
    bkash: process.env.BKASH_MERCHANT_NUMBER || '',
    nagad: process.env.NAGAD_MERCHANT_NUMBER || '',
    rocket: process.env.ROCKET_MERCHANT_NUMBER || '',
  },
  bkash: {
    enabled: bool(process.env.BKASH_API_ENABLED),
    baseUrl: process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
    appKey: process.env.BKASH_APP_KEY || '',
    appSecret: process.env.BKASH_APP_SECRET || '',
    username: process.env.BKASH_USERNAME || '',
    password: process.env.BKASH_PASSWORD || '',
  },

  // Storage: "local" or "r2"
  storageDriver: process.env.STORAGE_DRIVER || 'local',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || '',
  },

  // Mail (optional — falls back to console logging)
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Ghotok <no-reply@ghotok.com.bd>',
  },

  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME || 'Super Admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@ghotok.com.bd',
    password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe!2026',
  },
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-only-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}
