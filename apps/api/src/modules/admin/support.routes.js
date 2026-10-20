/** Staff support tools: reports, tickets and the public contact inbox. */
import { z } from 'zod';
import { createRouter } from '../../core/router.js';
import { paging, pageMeta, notFound } from '../../core/http.js';
import { Biodata } from '../biodata/biodata.model.js';
import { withdrawProposalsFor } from '../biodata/biodata.service.js';
import { Report, Ticket, ContactMessage } from '../support/support.models.js';
import { notify } from '../support/notify.service.js';
import { sendMail } from '../../services/mailer.js';
import { audit } from '../audit/audit.js';
import { USER_BRIEF } from './common.js';

const r = createRouter({ prefix: '/admin', tag: 'Admin · support', defaults: { role: 'support' } });

// ---------- Reports ----------
r.get(
  '/reports',
  {
    summary: 'Reports (status=active for open + reviewing). Urgent reports come first.',
    query: z
      .object({ status: z.enum(['active', 'open', 'reviewing', 'resolved', 'dismissed']).optional() })
      .passthrough(),
  },
  async (req, res) => {
    const { page, limit, skip } = paging(req.query, 25);
    const s = req.valid.query.status;
    const f = s ? { status: s === 'active' ? { $in: ['open', 'reviewing'] } : s } : {};
    const [items, total] = await Promise.all([
      Report.find(f)
        .sort({ priority: -1, createdAt: -1 }) // 'urgent' > 'normal'
        .skip(skip)
        .limit(limit)
        .populate('reporter', USER_BRIEF)
        .populate('biodata', 'biodataNo type status hidden owner')
        .populate('resolvedBy', 'name')
        .lean(),
      Report.countDocuments(f),
    ]);
    res.json({ items, ...pageMeta(total, page, limit) });
  }
);

r.post(
  '/reports/:id',
  {
    summary: 'Update a report; optionally hide the reported biodata',
    body: z.object({
      status: z.enum(['reviewing', 'resolved', 'dismissed']),
      action: z.string().trim().max(500).optional(),
      hideBiodata: z.boolean().optional(),
    }),
  },
  async (req, res) => {
    const d = req.valid.body;
    const rep = await Report.findById(req.params.id);
    if (!rep) throw notFound();
    rep.status = d.status;
    if (d.action) rep.action = d.action;
    if (d.status !== 'reviewing') Object.assign(rep, { resolvedBy: req.user._id, resolvedAt: new Date() });
    await rep.save();
    if (d.hideBiodata) {
      await Biodata.updateOne({ _id: rep.biodata }, { hidden: true, hiddenReason: 'staff' });
      await withdrawProposalsFor(rep.biodata);
    }
    if (d.status !== 'reviewing') await notify(rep.reporter, 'report_resolved', '/dashboard/support');
    await audit(req.user._id, `report.${d.status}`, 'Report', rep._id, {
      action: d.action,
      hideBiodata: d.hideBiodata,
    });
    res.json({ status: rep.status });
  }
);

// ---------- Tickets ----------
r.get(
  '/tickets',
  {
    summary: 'Support tickets',
    query: z.object({ status: z.enum(['open', 'answered', 'closed']).optional() }).passthrough(),
  },
  async (req, res) => {
    const { page, limit, skip } = paging(req.query, 25);
    const f = req.valid.query.status ? { status: req.valid.query.status } : {};
    const [items, total] = await Promise.all([
      Ticket.find(f)
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-messages')
        .populate('user', USER_BRIEF)
        .lean(),
      Ticket.countDocuments(f),
    ]);
    res.json({ items, ...pageMeta(total, page, limit) });
  }
);

r.get('/tickets/:id', { summary: 'One ticket with its conversation' }, async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('user', USER_BRIEF)
    .populate('messages.author', 'name role')
    .lean();
  if (!ticket) throw notFound();
  res.json({ ticket });
});

r.post(
  '/tickets/:id/messages',
  {
    summary: 'Reply to a ticket (and optionally close it)',
    body: z.object({ body: z.string().trim().min(1).max(4000), close: z.boolean().optional() }),
  },
  async (req, res) => {
    const t = await Ticket.findById(req.params.id);
    if (!t) throw notFound();
    t.messages.push({ author: req.user._id, staff: true, body: req.valid.body.body });
    t.status = req.valid.body.close ? 'closed' : 'answered';
    t.lastActivityAt = new Date();
    await t.save();
    await notify(t.user, 'ticket_replied', `/dashboard/support/${t._id}`);
    res.json({ status: t.status });
  }
);

r.post(
  '/tickets/:id/status',
  { summary: 'Change a ticket’s status', body: z.object({ status: z.enum(['open', 'answered', 'closed']) }) },
  async (req, res) => {
    const t = await Ticket.findByIdAndUpdate(req.params.id, { status: req.valid.body.status }, { new: true });
    if (!t) throw notFound();
    res.json({ status: t.status });
  }
);

// ---------- Contact inbox ----------
r.get(
  '/contact-messages',
  {
    summary: 'Messages from the public contact form',
    query: z.object({ status: z.enum(['new', 'replied', 'closed']).optional() }).passthrough(),
  },
  async (req, res) => {
    const { page, limit, skip } = paging(req.query, 25);
    const f = req.valid.query.status ? { status: req.valid.query.status } : {};
    const [items, total] = await Promise.all([
      ContactMessage.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('repliedBy', 'name').lean(),
      ContactMessage.countDocuments(f),
    ]);
    res.json({ items, ...pageMeta(total, page, limit) });
  }
);

r.post(
  '/contact-messages/:id/reply',
  { summary: 'Email a reply to the sender', body: z.object({ reply: z.string().trim().min(2).max(4000) }) },
  async (req, res) => {
    const m = await ContactMessage.findById(req.params.id);
    if (!m) throw notFound();
    await sendMail({
      to: m.email,
      subject: `Re: ${m.subject}`,
      text: `${req.valid.body.reply}\n\n— Ghotok\n\n> ${m.message.split('\n').join('\n> ')}`,
    });
    Object.assign(m, {
      reply: req.valid.body.reply,
      status: 'replied',
      repliedBy: req.user._id,
      repliedAt: new Date(),
    });
    await m.save();
    await audit(req.user._id, 'contact.reply', 'ContactMessage', m._id);
    res.json({ status: m.status });
  }
);

r.post(
  '/contact-messages/:id/status',
  { summary: 'Close or reopen a contact message', body: z.object({ status: z.enum(['new', 'replied', 'closed']) }) },
  async (req, res) => {
    const m = await ContactMessage.findByIdAndUpdate(req.params.id, { status: req.valid.body.status }, { new: true });
    if (!m) throw notFound();
    res.json({ status: m.status });
  }
);

export default r.router;
