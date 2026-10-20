/** Public site content: settings (footer, payment numbers), downloadable resources and the contact form. */
import { z } from 'zod';
import { createRouter } from '../../core/router.js';
import { notFound } from '../../core/http.js';
import { contactLimiter } from '../../core/limits.js';
import { streamFile } from '../../services/storage.js';
import { normalizeBdPhone } from '@ghotok/shared';
import { getSettings } from './settings.service.js';
import { Resource } from './content.models.js';
import { ContactMessage } from '../support/support.models.js';
import { sendMail } from '../../services/mailer.js';

const r = createRouter({ tag: 'Site content' });

r.get(
  '/settings',
  { summary: 'Public site settings: contact info, social links, announcement, payment numbers' },
  async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ settings: await getSettings() });
  }
);

const publicResource = (x) => ({
  id: x._id,
  title: x.title,
  description: x.description,
  fileName: x.fileName,
  mime: x.mime,
  size: x.size,
  hasPreview: Boolean(x.previewKey),
  downloads: x.downloads,
});

r.get('/resources', { summary: 'Published downloadable resources' }, async (_req, res) => {
  const items = await Resource.find({ published: true }).sort({ sort: 1, createdAt: -1 }).lean();
  res.json({ items: items.map(publicResource) });
});

r.get('/resources/:id/download', { summary: 'Download a published resource' }, async (req, res) => {
  const x = await Resource.findOneAndUpdate(
    { _id: req.params.id, published: true },
    { $inc: { downloads: 1 } },
    { new: true }
  );
  if (!x) throw notFound();
  await streamFile(res, x.fileKey, { cache: 'public, max-age=3600', filename: x.fileName });
});

r.get('/resources/:id/preview', { summary: 'Preview image of a published resource' }, async (req, res) => {
  const x = await Resource.findOne({ _id: req.params.id, published: true }).lean();
  if (!x?.previewKey) throw notFound();
  await streamFile(res, x.previewKey, { cache: 'public, max-age=86400' });
});

r.post(
  '/contact',
  {
    summary: 'Send a message to the Ghotok team (no account needed)',
    auth: 'optional',
    limit: contactLimiter,
    body: z.object({
      name: z.string().trim().min(2).max(80),
      email: z.email().max(120),
      phone: z.string().trim().max(20).optional(),
      subject: z.string().trim().min(3).max(160),
      message: z.string().trim().min(10).max(4000),
      website: z.string().max(300).optional(), // honeypot: hidden field real people leave empty
    }),
  },
  async (req, res) => {
    const { website, ...d } = req.valid.body;
    if (website) return res.status(201).json({ ok: true }); // pretend success so bots learn nothing
    const msg = await ContactMessage.create({
      ...d,
      phone: d.phone ? normalizeBdPhone(d.phone) || d.phone : undefined,
      user: req.user?._id,
      ip: req.ip,
    });
    const { supportEmail } = await getSettings();
    if (supportEmail) {
      await sendMail({
        to: supportEmail,
        replyTo: d.email,
        subject: `[Contact] ${d.subject}`,
        text: `${d.name} <${d.email}> ${d.phone || ''}\n\n${d.message}`,
      });
    }
    res.status(201).json({ ok: true, id: msg._id });
  }
);

export default r.router;
