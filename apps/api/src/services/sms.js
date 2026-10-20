/**
 * SMS delivery for one-time codes.
 *
 * SMS_DRIVER=log   development only: messages are kept in `smsOutbox` and logged.
 * SMS_DRIVER=http  calls any Bangladeshi SMS gateway with a URL template. Placeholders:
 *                  {to} (8801XXXXXXXXX), {message}, {senderId}, {apiKey}. Example:
 *                  SMS_HTTP_URL=https://gateway.example/api?api_key={apiKey}&senderid={senderId}&number={to}&message={message}
 *                  For POST gateways set SMS_HTTP_METHOD=POST and SMS_HTTP_BODY to a JSON template.
 */
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export const smsOutbox = [];

const fillTemplate = (tpl, vars, encode) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) =>
    encode ? encodeURIComponent(vars[k] ?? '') : JSON.stringify(vars[k] ?? '').slice(1, -1)
  );

export async function sendSms(phone, message) {
  const to = `88${phone}`;
  if (env.sms.driver === 'log') {
    smsOutbox.push({ to: phone, message, at: new Date() });
    if (smsOutbox.length > 100) smsOutbox.shift();
    logger.info({ to: phone }, 'SMS not sent (SMS_DRIVER=log)');
    if (!env.isTest) logger.debug({ message }, 'SMS body');
    return;
  }
  const vars = { to, message, senderId: env.sms.senderId, apiKey: env.sms.apiKey };
  const url = fillTemplate(env.sms.url, vars, true);
  const init = { method: env.sms.method };
  if (env.sms.method === 'POST') {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = fillTemplate(env.sms.body, vars, false);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    logger.error({ status: res.status, to: phone }, 'SMS gateway error');
    throw new Error(`SMS gateway responded ${res.status}`);
  }
}
