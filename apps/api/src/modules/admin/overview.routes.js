/** Admin home (work queues, totals, 14-day series) and the audit log. */
import { z } from 'zod';
import { createRouter } from '../../core/router.js';
import { paging, pageMeta, escapeRegex, dhakaDay } from '../../core/http.js';
import { User } from '../auth/user.model.js';
import { Biodata } from '../biodata/biodata.model.js';
import { Payment, RefundRequest } from '../billing/billing.models.js';
import { Report, Ticket, ContactMessage } from '../support/support.models.js';
import { AuditLog } from '../audit/audit.js';

const r = createRouter({ prefix: '/admin', tag: 'Admin', defaults: { role: 'support' } });

const DAY_FMT = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone: 'Asia/Dhaka' } });

r.get(
  '/overview',
  { summary: 'Work queues, totals and a 14-day series of sign-ups and revenue' },
  async (_req, res) => {
    const since30 = new Date(Date.now() - 30 * 86400000);
    const since14 = new Date(`${dhakaDay(13)}T00:00:00+06:00`);
    const [
      paymentsPending,
      biodatasPending,
      nidPending,
      reportsOpen,
      reportsUrgent,
      recoveryPending,
      refundsPending,
      ticketsOpen,
      contactNew,
      usersTotal,
      biodatasApproved,
      revenueAgg,
      signupSeries,
      revenueSeries,
      statusAgg,
      typeAgg,
    ] = await Promise.all([
      Payment.countDocuments({ status: 'pending' }),
      Biodata.countDocuments({ status: 'pending', deletedAt: null }),
      Biodata.countDocuments({ 'nid.status': 'submitted', deletedAt: null }),
      Report.countDocuments({ status: { $in: ['open', 'reviewing'] } }),
      Report.countDocuments({ status: { $in: ['open', 'reviewing'] }, priority: 'urgent' }),
      Biodata.countDocuments({ 'recovery.status': 'pending', deletedAt: { $ne: null } }),
      RefundRequest.countDocuments({ status: 'pending' }),
      Ticket.countDocuments({ status: 'open' }),
      ContactMessage.countDocuments({ status: 'new' }),
      User.countDocuments({ role: 'user', status: { $ne: 'deleted' } }),
      Biodata.countDocuments({ status: 'approved', deletedAt: null }),
      Payment.aggregate([
        { $match: { status: 'approved', reviewedAt: { $gte: since30 } } },
        { $group: { _id: null, sum: { $sum: '$amount' }, n: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: since14 }, role: 'user' } },
        { $group: { _id: DAY_FMT('$createdAt'), n: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'approved', reviewedAt: { $gte: since14 } } },
        { $group: { _id: DAY_FMT('$reviewedAt'), sum: { $sum: '$amount' } } },
      ]),
      Biodata.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Biodata.aggregate([
        { $match: { status: 'approved', deletedAt: null } },
        { $group: { _id: '$type', n: { $sum: 1 } } },
      ]),
    ]);
    const sMap = Object.fromEntries(signupSeries.map((x) => [x._id, x.n]));
    const rMap = Object.fromEntries(revenueSeries.map((x) => [x._id, x.sum]));
    const days = Array.from({ length: 14 }, (_, i) => dhakaDay(13 - i));
    res.json({
      queues: {
        paymentsPending,
        biodatasPending,
        nidPending,
        reportsOpen,
        reportsUrgent,
        recoveryPending,
        refundsPending,
        ticketsOpen,
        contactNew,
      },
      totals: { usersTotal, biodatasApproved, revenue30: revenueAgg[0]?.sum || 0, payments30: revenueAgg[0]?.n || 0 },
      biodataByStatus: Object.fromEntries(statusAgg.map((x) => [x._id, x.n])),
      biodataByType: Object.fromEntries(typeAgg.map((x) => [x._id, x.n])),
      series: days.map((day) => ({ day, signups: sMap[day] || 0, revenue: rMap[day] || 0 })),
    });
  }
);

r.get(
  '/audit',
  {
    summary: 'Audit log of staff actions (filter by action prefix, e.g. "payment.")',
    role: 'admin',
    query: z.object({ action: z.string().max(60).optional() }).passthrough(),
  },
  async (req, res) => {
    const { page, limit, skip } = paging(req.query, 50);
    const f = {};
    if (req.valid.query.action) f.action = new RegExp(`^${escapeRegex(req.valid.query.action)}`);
    const [items, total] = await Promise.all([
      AuditLog.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actor', 'name role').lean(),
      AuditLog.countDocuments(f),
    ]);
    res.json({ items, ...pageMeta(total, page, limit) });
  }
);

export default r.router;
