import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transport;

export async function sendMail({ to, subject, text }) {
  if (!env.smtp.host) {
    // No SMTP configured: log instead so local development still works.
    console.log(`[mail] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  transport ||= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  await transport.sendMail({ from: env.smtp.from, to, subject, text });
}
