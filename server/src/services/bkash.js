import { env } from '../config/env.js';

// bKash Tokenized Checkout (v1.2.0-beta). Enabled only when BKASH_API_ENABLED=true
// and merchant credentials are set. Sandbox base URL is the default.

let cached = { token: null, expiresAt: 0 };

export const bkashEnabled = () =>
  env.bkash.enabled && env.bkash.appKey && env.bkash.appSecret && env.bkash.username && env.bkash.password;

async function call(pathname, body, withAuth = true) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (withAuth) {
    headers.Authorization = await grantToken();
    headers['X-APP-Key'] = env.bkash.appKey;
  } else {
    headers.username = env.bkash.username;
    headers.password = env.bkash.password;
  }
  const res = await fetch(`${env.bkash.baseUrl}${pathname}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.statusMessage || data.errorMessage || `bKash HTTP ${res.status}`);
  return data;
}

async function grantToken() {
  if (cached.token && Date.now() < cached.expiresAt) return cached.token;
  const data = await call('/tokenized/checkout/token/grant', { app_key: env.bkash.appKey, app_secret: env.bkash.appSecret }, false);
  if (!data.id_token) throw new Error(data.statusMessage || 'bKash token grant failed');
  cached = { token: data.id_token, expiresAt: Date.now() + (Number(data.expires_in || 3600) - 120) * 1000 };
  return cached.token;
}

export async function createPayment({ amount, invoice, payerReference, callbackURL }) {
  const data = await call('/tokenized/checkout/create', {
    mode: '0011',
    payerReference: payerReference || 'ghotok',
    callbackURL,
    amount: String(amount),
    currency: 'BDT',
    intent: 'sale',
    merchantInvoiceNumber: invoice,
  });
  if (!data.bkashURL || !data.paymentID) throw new Error(data.statusMessage || 'bKash create payment failed');
  return { paymentID: data.paymentID, bkashURL: data.bkashURL, raw: data };
}

export async function executePayment(paymentID) {
  const data = await call('/tokenized/checkout/execute', { paymentID });
  return {
    completed: data.transactionStatus === 'Completed' && data.statusCode === '0000',
    trxID: data.trxID,
    amount: Number(data.amount),
    raw: data,
  };
}
