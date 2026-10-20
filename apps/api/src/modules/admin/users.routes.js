/** Staff user tools: search, profile, roles, suspension and verification flags. */
import { z } from 'zod';
import { ROLES, hasRole, normalizeBdPhone } from '@ghotok/shared';
import { createRouter } from '../../core/router.js';
import { paging, pageMeta, notFound, badRequest, forbidden, escapeRegex } from '../../core/http.js';
import { User } from '../auth/user.model.js';
import { Biodata } from '../biodata/biodata.model.js';
import { syncVerification, withdrawProposalsFor } from '../biodata/biodata.service.js';
import { Payment, Unlock } from '../billing/billing.models.js';
import { Report } from '../support/support.models.js';
import { notify } from '../support/notify.service.js';
import { audit } from '../audit/audit.js';

const r = createRouter({ prefix: '/admin', tag: 'Admin · users', defaults: { role: 'support' } });

const notSelf = (req) => {
  if (String(req.params.id) === String(req.user._id)) throw badRequest('SELF_ACTION');
};

r.get(
  '/users',
  {
    summary: 'Search users by name, email or phone',
    query: z
      .object({
        role: z.enum(ROLES).optional(),
        status: z.enum(['active', 'suspended', 'deleted']).optional(),
        q: z.string().trim().max(80).optional(),
      })
      .passthrough(),
  },
  async (req, res) => {
    const { role, status, q } = req.valid.query;
    const { page, limit, skip } = paging(req.query, 25);
    const f = {};
    if (role) f.role = role;
    if (status) f.status = status;
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      const phone = normalizeBdPhone(q);
      f.$or = [{ name: rx }, { email: rx }, phone ? { phone } : { phone: rx }];
    }
    const [items, total] = await Promise.all([
      User.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(f),
    ]);
    res.json({
      items: items.map((u) => ({
        ...u.toSafe(),
        _id: u._id,
        lastLoginAt: u.lastLoginAt,
        suspendReason: u.suspendReason,
      })),
      ...pageMeta(total, page, limit),
    });
  }
);

r.get('/users/:id', { summary: 'User profile with biodata, payments and activity counts' }, async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) throw notFound();
  const [biodata, payments, unlocks, reportsFiled] = await Promise.all([
    Biodata.findOne({ owner: u._id }).select('biodataNo type status hidden deletedAt nid.status verification').lean(),
    Payment.find({ user: u._id }).sort({ createdAt: -1 }).limit(20).populate('package', 'name').lean(),
    Unlock.countDocuments({ user: u._id }),
    Report.countDocuments({ reporter: u._id }),
  ]);
  res.json({
    user: {
      ...u.toSafe(),
      _id: u._id,
      lastLoginAt: u.lastLoginAt,
      suspendReason: u.suspendReason,
      deletedAt: u.deletedAt,
    },
    biodata,
    payments,
    counts: { unlocks, reportsFiled },
  });
});

r.post(
  '/users/:id/role',
  { summary: 'Change a user’s role (signs them out)', role: 'superadmin', body: z.object({ role: z.enum(ROLES) }) },
  async (req, res) => {
    notSelf(req);
    const u = await User.findById(req.params.id);
    if (!u) throw notFound();
    const from = u.role;
    u.role = req.valid.body.role;
    u.revokeTokens();
    await u.save();
    await audit(req.user._id, 'user.role', 'User', u._id, { from, to: u.role });
    res.json({ role: u.role });
  }
);

r.post(
  '/users/:id/status',
  {
    summary: 'Suspend or reactivate a user',
    role: 'admin',
    body: z.object({ status: z.enum(['active', 'suspended']), reason: z.string().trim().max(300).optional() }),
  },
  async (req, res) => {
    notSelf(req);
    const { status, reason } = req.valid.body;
    const u = await User.findById(req.params.id);
    if (!u || u.status === 'deleted') throw notFound();
    if (u.role !== 'user' && !hasRole(req.user.role, 'superadmin')) throw forbidden();
    u.status = status;
    u.suspendReason = status === 'suspended' ? reason : undefined;
    if (status === 'suspended') {
      u.revokeTokens();
      const b = await Biodata.findOneAndUpdate({ owner: u._id }, { hidden: true, hiddenReason: 'suspended' });
      if (b) await withdrawProposalsFor(b._id);
    } else {
      await Biodata.updateOne(
        { owner: u._id, hiddenReason: 'suspended' },
        { hidden: false, $unset: { hiddenReason: 1 } }
      );
    }
    await u.save();
    if (status === 'suspended') await notify(u._id, 'account_suspended', '/support');
    await audit(req.user._id, `user.${status}`, 'User', u._id, { reason });
    res.json({ status: u.status });
  }
);

r.post(
  '/users/:id/verification',
  {
    summary: 'Mark a phone or email as verified (e.g. confirmed on a call)',
    role: 'admin',
    body: z.object({ phone: z.boolean().optional(), email: z.boolean().optional() }),
  },
  async (req, res) => {
    const u = await User.findById(req.params.id);
    if (!u) throw notFound();
    const { phone, email } = req.valid.body;
    if (phone !== undefined) u.phoneVerifiedAt = phone && u.phone ? u.phoneVerifiedAt || new Date() : undefined;
    if (email !== undefined) u.emailVerifiedAt = email && u.email ? u.emailVerifiedAt || new Date() : undefined;
    await u.save();
    await syncVerification(u._id);
    await audit(req.user._id, 'user.verification', 'User', u._id, { phone, email });
    res.json({ user: u.toSafe() });
  }
);

export default r.router;
