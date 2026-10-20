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

/** Settings for the admin editor: like getSettings, but the announcement keeps its text and flag. */
export async function getAdminSettings() {
  const [pub, raw] = await Promise.all([getSettings({ fresh: true }), Setting.findById('site').lean()]);
  return {
    ...pub,
    announcement: {
      en: raw?.announcement?.en || '',
      bn: raw?.announcement?.bn || '',
      active: Boolean(raw?.announcement?.active),
    },
  };
}

export async function updateSettings(patch, actorId) {
  await Setting.findByIdAndUpdate(
    'site',
    { $set: { ...patch, updatedBy: actorId } },
    { upsert: true, new: true, runValidators: true }
  );
  cache = { value: null, at: 0 };
  return getAdminSettings();
}

/** For tests. */
export const resetSettingsCache = () => (cache = { value: null, at: 0 });
