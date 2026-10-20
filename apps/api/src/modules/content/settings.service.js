import { Setting } from './content.models.js';
import { env } from '../../config/env.js';

let cache = { value: null, at: 0 };
const TTL_MS = 30 * 1000;

/** Public site settings, with payment numbers falling back to environment variables. */
export async function getSettings({ fresh = false } = {}) {
  if (!fresh && cache.value && Date.now() - cache.at < TTL_MS) return cache.value;
  const s = (await Setting.findById('site').lean()) || {};
  const value = {
    paymentNumbers: {
      bkash: s.paymentNumbers?.bkash || env.paymentNumbers.bkash || '',
      nagad: s.paymentNumbers?.nagad || env.paymentNumbers.nagad || '',
      rocket: s.paymentNumbers?.rocket || env.paymentNumbers.rocket || '',
    },
    supportEmail: s.supportEmail || env.supportEmail,
    supportPhone: s.supportPhone || '',
    officeAddress: s.officeAddress || { en: '', bn: '' },
    tradeLicense: s.tradeLicense || '',
    social: s.social || {},
    chatLink: s.chatLink || '',
    announcement: s.announcement?.active ? { en: s.announcement.en, bn: s.announcement.bn } : null,
    updatedAt: s.updatedAt || null,
  };
  cache = { value, at: Date.now() };
  return value;
}

export async function updateSettings(patch, actorId) {
  await Setting.findByIdAndUpdate(
    'site',
    { $set: { ...patch, updatedBy: actorId } },
    { upsert: true, new: true, runValidators: true }
  );
  cache = { value: null, at: 0 };
  return getSettings({ fresh: true });
}

/** For tests. */
export const resetSettingsCache = () => (cache = { value: null, at: 0 });
