/** Super-admin content tools: site settings and downloadable resources. */
import { z } from 'zod';
import { createRouter } from '../../core/router.js';
import { notFound, validationError } from '../../core/http.js';
import { assertUpload } from '../../middleware/upload.js';
import { putFile, deleteFile, newKey } from '../../services/storage.js';
import { normalizeWalletNumber } from '@ghotok/shared';
import { Resource } from '../content/content.models.js';
import { getAdminSettings, updateSettings } from '../content/settings.service.js';
import { audit } from '../audit/audit.js';

const r = createRouter({ prefix: '/admin', tag: 'Admin · content', defaults: { role: 'superadmin' } });

const optionalUrl = z.union([z.url().max(300), z.literal('')]).optional();
const bilingual = (max) =>
  z.object({ en: z.string().trim().max(max).default(''), bn: z.string().trim().max(max).default('') });

const settingsBody = z.object({
  paymentNumbers: z
    .object({ bkash: z.string().trim().max(20), nagad: z.string().trim().max(20), rocket: z.string().trim().max(20) })
    .partial()
    .optional(),
  supportEmail: z.union([z.email(), z.literal('')]).optional(),
  supportPhone: z.string().trim().max(20).optional(),
  officeAddress: bilingual(300).optional(),
  tradeLicense: z.string().trim().max(60).optional(),
  social: z
    .object({
      facebook: optionalUrl,
      youtube: optionalUrl,
      instagram: optionalUrl,
      whatsapp: optionalUrl,
      messenger: optionalUrl,
    })
    .optional(),
  chatLink: optionalUrl,
  announcement: z
    .object({
      en: z.string().trim().max(300).default(''),
      bn: z.string().trim().max(300).default(''),
      active: z.boolean().default(false),
    })
    .optional(),
});

r.get('/settings', { summary: 'Current site settings', role: 'admin' }, async (_req, res) => {
  res.json({ settings: await getAdminSettings() });
});

r.put('/settings', { summary: 'Update site settings (only the parts sent)', body: settingsBody }, async (req, res) => {
  const d = req.valid.body;
  const patch = {};
  if (d.paymentNumbers) {
    for (const [k, v] of Object.entries(d.paymentNumbers)) {
      const number = v ? normalizeWalletNumber(k, v) : '';
      if (number === null) throw validationError({ [`paymentNumbers.${k}`]: 'invalid_phone' });
      patch[`paymentNumbers.${k}`] = number;
    }
  }
  for (const k of ['supportEmail', 'supportPhone', 'officeAddress', 'tradeLicense', 'chatLink', 'announcement'])
    if (d[k] !== undefined) patch[k] = d[k];
  if (d.social) for (const [k, v] of Object.entries(d.social)) if (v !== undefined) patch[`social.${k}`] = v;
  const settings = await updateSettings(patch, req.user._id);
  await audit(req.user._id, 'settings.update', 'Setting', undefined, { keys: Object.keys(patch) });
  res.json({ settings });
});

// ---------- Resources ----------
const resourceBody = z.object({
  titleEn: z.string().trim().min(2).max(120),
  titleBn: z.string().trim().min(2).max(120),
  descriptionEn: z.string().trim().max(500).optional(),
  descriptionBn: z.string().trim().max(500).optional(),
  published: z.enum(['true', 'false']).optional(),
  sort: z.coerce.number().int().optional(),
});
const resourceFields = (d) => ({
  title: { en: d.titleEn, bn: d.titleBn },
  description: { en: d.descriptionEn || '', bn: d.descriptionBn || '' },
  ...(d.published !== undefined && { published: d.published === 'true' }),
  ...(d.sort !== undefined && { sort: d.sort }),
});

r.get('/resources', { summary: 'All resources, including unpublished', role: 'admin' }, async (_req, res) => {
  res.json({ items: await Resource.find().sort({ sort: 1, createdAt: -1 }).lean() });
});

r.post(
  '/resources',
  { summary: 'Upload a resource (multipart: file + fields)', upload: 'file', body: resourceBody },
  async (req, res) => {
    assertUpload(req.file);
    const fileKey = await putFile(newKey('resources', req.file.mimetype), req.file.buffer, req.file.mimetype);
    const previewKey = req.file.mimetype.startsWith('image/') ? fileKey : undefined;
    const x = await Resource.create({
      ...resourceFields(req.valid.body),
      fileKey,
      previewKey,
      fileName: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
    });
    await audit(req.user._id, 'resource.create', 'Resource', x._id, { title: x.title.en });
    res.status(201).json({ resource: x });
  }
);

r.put(
  '/resources/:id',
  { summary: 'Edit a resource; optionally replace its file', upload: 'file', body: resourceBody },
  async (req, res) => {
    const x = await Resource.findById(req.params.id);
    if (!x) throw notFound();
    Object.assign(x, resourceFields(req.valid.body));
    if (req.file) {
      assertUpload(req.file);
      const old = x.fileKey;
      x.fileKey = await putFile(newKey('resources', req.file.mimetype), req.file.buffer, req.file.mimetype);
      x.previewKey = req.file.mimetype.startsWith('image/') ? x.fileKey : undefined;
      Object.assign(x, { fileName: req.file.originalname, mime: req.file.mimetype, size: req.file.size });
      await deleteFile(old);
    }
    await x.save();
    await audit(req.user._id, 'resource.update', 'Resource', x._id);
    res.json({ resource: x });
  }
);

r.delete('/resources/:id', { summary: 'Delete a resource and its file' }, async (req, res) => {
  const x = await Resource.findByIdAndDelete(req.params.id);
  if (!x) throw notFound();
  await deleteFile(x.fileKey);
  await audit(req.user._id, 'resource.delete', 'Resource', x._id, { title: x.title?.en });
  res.json({ ok: true });
});

export default r.router;
