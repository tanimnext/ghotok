/**
 * Environment configuration, validated once at startup.
 * Every variable is documented in apps/api/.env.example.
 */
import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => (typeof v === 'boolean' ? v : ['1', 'true', 'yes'].includes(String(v ?? '').toLowerCase())));
/** Comma-separated string → array. The default is applied to the raw string before splitting. */
const list = (def) =>
  z
    .string()
    .default(def)
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent', '']).optional(),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/ghotok'),

  JWT_SECRET: z.string().default('dev-only-change-me-dev-only-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGINS: list('http://localhost:3000,http://localhost:5173'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:5000'),
  TRUST_PROXY: z.coerce.number().int().default(1),

  // Manual payment numbers (defaults — editable later in Admin › Settings)
  BKASH_MERCHANT_NUMBER: z.string().default(''),
  NAGAD_MERCHANT_NUMBER: z.string().default(''),
  ROCKET_MERCHANT_NUMBER: z.string().default(''),

  // bKash Tokenized Checkout
  BKASH_API_ENABLED: bool,
  BKASH_BASE_URL: z.string().url().default('https://tokenized.sandbox.bka.sh/v1.2.0-beta'),
  BKASH_APP_KEY: z.string().default(''),
  BKASH_APP_SECRET: z.string().default(''),
  BKASH_USERNAME: z.string().default(''),
  BKASH_PASSWORD: z.string().default(''),

  // Google sign-in (OAuth client id from Google Cloud console)
  GOOGLE_CLIENT_ID: z.string().default(''),

  // SMS for OTP: "log" prints codes to the server log (development only); "http" calls SMS_HTTP_URL
  SMS_DRIVER: z.enum(['log', 'http']).default('log'),
  SMS_HTTP_URL: z.string().default(''),
  SMS_HTTP_METHOD: z.enum(['GET', 'POST']).default('GET'),
  SMS_HTTP_BODY: z.string().default(''),
  SMS_SENDER_ID: z.string().default(''),
  SMS_API_KEY: z.string().default(''),

  // File storage
  STORAGE_DRIVER: z.enum(['local', 'r2']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET: z.string().default(''),

  // Email
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default('Ghotok <no-reply@ghotok.com.bd>'),
  SUPPORT_EMAIL: z.string().default('support@ghotok.com.bd'),

  // First super admin (npm run seed)
  SEED_ADMIN_NAME: z.string().default('Super Admin'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@ghotok.com.bd'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('ChangeMe!2026'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}
const e = parsed.data;

if (e.NODE_ENV === 'production') {
  const problems = [];
  if (e.JWT_SECRET.startsWith('dev-only') || e.JWT_SECRET.length < 32)
    problems.push('JWT_SECRET must be a random string of at least 32 characters');
  if (e.SMS_DRIVER === 'log') problems.push('SMS_DRIVER=log prints OTP codes to logs; configure SMS_DRIVER=http');
  if (e.SEED_ADMIN_PASSWORD === 'ChangeMe!2026') problems.push('SEED_ADMIN_PASSWORD must be changed');
  if (problems.length) throw new Error(`Unsafe production configuration:\n  ${problems.join('\n  ')}`);
}

export const env = {
  nodeEnv: e.NODE_ENV,
  isProd: e.NODE_ENV === 'production',
  isTest: e.NODE_ENV === 'test',
  port: e.PORT,
  logLevel: e.LOG_LEVEL || (e.NODE_ENV === 'test' ? 'silent' : e.NODE_ENV === 'production' ? 'info' : 'debug'),
  mongoUri: e.MONGODB_URI,
  jwtSecret: e.JWT_SECRET,
  jwtExpiresIn: e.JWT_EXPIRES_IN,
  corsOrigins: e.CORS_ORIGINS,
  webUrl: e.WEB_URL,
  apiPublicUrl: e.API_PUBLIC_URL,
  trustProxy: e.TRUST_PROXY,
  paymentNumbers: { bkash: e.BKASH_MERCHANT_NUMBER, nagad: e.NAGAD_MERCHANT_NUMBER, rocket: e.ROCKET_MERCHANT_NUMBER },
  bkash: {
    enabled: e.BKASH_API_ENABLED,
    baseUrl: e.BKASH_BASE_URL,
    appKey: e.BKASH_APP_KEY,
    appSecret: e.BKASH_APP_SECRET,
    username: e.BKASH_USERNAME,
    password: e.BKASH_PASSWORD,
  },
  googleClientId: e.GOOGLE_CLIENT_ID,
  sms: {
    driver: e.SMS_DRIVER,
    url: e.SMS_HTTP_URL,
    method: e.SMS_HTTP_METHOD,
    body: e.SMS_HTTP_BODY,
    senderId: e.SMS_SENDER_ID,
    apiKey: e.SMS_API_KEY,
  },
  storage: {
    driver: e.STORAGE_DRIVER,
    uploadDir: e.UPLOAD_DIR,
    r2: {
      accountId: e.R2_ACCOUNT_ID,
      accessKeyId: e.R2_ACCESS_KEY_ID,
      secretAccessKey: e.R2_SECRET_ACCESS_KEY,
      bucket: e.R2_BUCKET,
    },
  },
  smtp: { host: e.SMTP_HOST, port: e.SMTP_PORT, user: e.SMTP_USER, pass: e.SMTP_PASS, from: e.MAIL_FROM },
  supportEmail: e.SUPPORT_EMAIL,
  seedAdmin: { name: e.SEED_ADMIN_NAME, email: e.SEED_ADMIN_EMAIL, password: e.SEED_ADMIN_PASSWORD },
};
