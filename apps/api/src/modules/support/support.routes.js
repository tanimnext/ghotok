/** The user's reports, notifications and support tickets. */
import { z } from 'zod';
import { values, TICKET_CATEGORIES } from '@ghotok/shared';
import { createRouter } from '../../core/router.js';
import { paging, pageMeta, notFound, badRequest } from '../../core/http.js';
import { Report, Ticket, Notification } from './support.models.js';

const r = createRouter({ prefix: '/me', tag: 'Support', defaults: { auth: 'required' } });

const MAX_OPEN_TICKETS = 5;

r.get('/reports', { summary: 'Reports I made and their outcome' }, async (req, res) => {
  const items = await Report.find({ reporter: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('biodata', 'biodataNo')
    .lean();
  res.json({ items });
});

r.get('/notifications', { summary: 'My latest notifications' }, async (req, res) => {
  const { page, limit, skip } = paging(req.query, 30, 100);
  const filter = { user: req.user._id };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, read: false }),
  ]);
  res.json({ items, unread, ...pageMeta(total, page, limit) });
});

r.post('/notifications/read-all', { summary: 'Mark all my notifications as read' }, async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});

r.post('/notifications/:id/read', { summary: 'Mark one notification as read' }, async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!n) throw notFound();
  res.json({ ok: true });
});

r.get('/tickets', { summary: 'My support tickets' }, async (req, res) => {
  const items = await Ticket.find({ user: req.user._id })
    .sort({ lastActivityAt: -1 })
    .select('-messages')
    .limit(100)
    .lean();
  res.json({ items });
});

r.post(
  '/tickets',
  {
    summary: 'Open a support ticket',
    body: z.object({
      subject: z.string().trim().min(3).max(160),
      category: z.enum(values(TICKET_CATEGORIES)).default('other'),
      body: z.string().trim().min(5).max(4000),
    }),
  },
  async (req, res) => {
    const d = req.valid.body;
    if ((await Ticket.countDocuments({ user: req.user._id, status: { $ne: 'closed' } })) >= MAX_OPEN_TICKETS)
      throw badRequest('TOO_MANY_TICKETS');
    const ticket = await Ticket.create({
      user: req.user._id,
      subject: d.subject,
      category: d.category,
      messages: [{ author: req.user._id, body: d.body }],
    });
    res.status(201).json({ ticket });
  }
);

r.get('/tickets/:id', { summary: 'One of my tickets with its messages' }, async (req, res) => {
  const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!ticket) throw notFound();
  res.json({ ticket });
});

r.post(
  '/tickets/:id/messages',
  { summary: 'Reply on my ticket', body: z.object({ body: z.string().trim().min(1).max(4000) }) },
  async (req, res) => {
    const t = await Ticket.findOne({ _id: req.params.id, user: req.user._id });
    if (!t) throw notFound();
    if (t.status === 'closed') throw badRequest('TICKET_CLOSED');
    t.messages.push({ author: req.user._id, body: req.valid.body.body });
    t.status = 'open';
    t.lastActivityAt = new Date();
    await t.save();
    res.json({ ticket: t });
  }
);

r.post('/tickets/:id/close', { summary: 'Close my ticket' }, async (req, res) => {
  const t = await Ticket.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { status: 'closed', lastActivityAt: new Date() },
    { new: true }
  );
  if (!t) throw notFound();
  res.json({ ticket: t });
});

export default r.router;
