import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let transport;
/** Messages sent while SMTP is not configured (used by tests and local development). */
export const outbox = [];

export async function sendMail({ to, subject, text, replyTo }) {
  if (!to) return;
  if (!env.smtp.host) {
    outbox.push({ to, subject, text, replyTo, at: new Date() });
    if (outbox.length > 100) outbox.shift();
    logger.info({ to, subject }, 'Email not sent (SMTP not configured)');
    if (!env.isTest) logger.debug({ text }, 'Email body');
    return;
  }
  transport ||= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  try {
    await transport.sendMail({ from: env.smtp.from, to, subject, text, replyTo });
  } catch (err) {
    // Email is best effort: never fail the user's request because SMTP is down.
    logger.error({ err, to, subject }, 'Email delivery failed');
  }
}
