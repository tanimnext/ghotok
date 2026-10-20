/** Staff biodata tools: list/search, full view, edit, review, NID verification, hide, restore queue. */
import { z } from 'zod';
import { sanitizeBiodataInput, parseBiodataCode, biodataCode } from '@ghotok/shared';
import { createRouter } from '../../core/router.js';
import { paging, pageMeta, notFound, validationError, escapeRegex } from '../../core/http.js';
import { Biodata, BIODATA_STATUS, toCard, toOwner } from '../biodata/biodata.model.js';
import { nextSeq } from '../biodata/counter.model.js';
import { withdrawProposalsFor } from '../biodata/biodata.service.js';
import { Report } from '../support/support.models.js';
import { Unlock } from '../billing/billing.models.js';
import { Proposal } from '../interactions/interaction.models.js';
import { notify } from '../support/notify.service.js';
import { audit } from '../audit/audit.js';
import { USER_BRIEF } from './common.js';

const r = createRouter({ prefix: '/admin', tag: 'Admin · biodatas', defaults: { role: 'support' } });

const listQuery = z
  .object({
    status: z.enum(BIODATA_STATUS).optional(),
    nid: z.enum(['none', 'submitted', 'verified', 'rejected']).optional(),
    type: z.enum(['groom', 'bride']).optional(),
    deleted: z.enum(['0', '1']).optional(),
    hidden: z.enum(['0', '1']).optional(),
    q: z.string().trim().max(80).optional(),
  })
  .passthrough();

r.get(
  '/biodatas',
  { summary: 'Search biodatas by code, candidate name or guardian phone', query: listQuery },
  async (req, res) => {
    const q = req.valid.query;
    const { page, limit, skip } = paging(req.query, 20);
    const f = { deletedAt: q.deleted === '1' ? { $ne: null } : null };
    if (q.status) f.status = q.status;
    if (q.nid) f['nid.status'] = q.nid;
    if (q.type) f.type = q.type;
    if (q.hidden) f.hidden = q.hidden === '1';
    if (q.q) {
      const n = parseBiodataCode(q.q);
      const rx = new RegExp(escapeRegex(q.q), 'i');
      f.$or = [{ 'contact.candidateName': rx }, { 'contact.guardianPhone': rx }, ...(n ? [{ biodataNo: n }] : [])];
    }
    const sort = q.status === 'pending' ? { submittedAt: 1 } : { updatedAt: -1 };
    const [items, total] = await Promise.all([
      Biodata.find(f).sort(sort).skip(skip).limit(limit).populate('owner', USER_BRIEF).lean(),
      Biodata.countDocuments(f),
    ]);
    res.json({
      items: items.map((b) => ({
        ...toCard(b),
        status: b.status,
        hidden: b.hidden,
        hiddenReason: b.hiddenReason,
        nidStatus: b.nid?.status || 'none',
        submittedAt: b.submittedAt,
        updatedAt: b.updatedAt,
        deletedAt: b.deletedAt,
        owner: b.owner,
        candidateName: b.contact?.candidateName,
      })),
      ...pageMeta(total, page, limit),
    });
  }
);

r.get('/biodatas/:id', { summary: 'Full biodata with owner, reports and activity counts' }, async (req, res) => {
  const b = await Biodata.findById(req.params.id).populate('owner', USER_BRIEF).populate('reviewedBy', 'name');
  if (!b) throw notFound('BIODATA_NOT_FOUND');
  const [reports, unlocks, proposals] = await Promise.all([
    Report.find({ biodata: b._id }).sort({ createdAt: -1 }).limit(20).populate('reporter', 'name').lean(),
    Unlock.countDocuments({ biodata: b._id }),
    Proposal.countDocuments({ toBiodata: b._id }),
  ]);
  res.json({
    biodata: { ...toOwner(b), owner: b.owner, reviewedBy: b.reviewedBy },
    reports,
    counts: { unlocks, proposals },
  });
});

r.put(
  '/biodatas/:id',
  {
    summary: 'Correct biodata fields (same body as PUT /me/biodata). Status is unchanged.',
    role: 'admin',
    body: z.record(z.string(), z.unknown()),
  },
  async (req, res) => {
    const b = await Biodata.findById(req.params.id);
    if (!b) throw notFound('BIODATA_NOT_FOUND');
    const { set, unset, errors } = sanitizeBiodataInput(req.valid.body);
    if (Object.keys(errors).length) throw validationError(errors);
    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    const saved = Object.keys(update).length
      ? await Biodata.findByIdAndUpdate(b._id, update, { new: true, runValidators: true })
      : b;
    await audit(req.user._id, 'biodata.edit', 'Biodata', b._id, {
      fields: [...Object.keys(set), ...Object.keys(unset)],
    });
    res.json({ biodata: toOwner(saved) });
  }
);

r.post(
  '/biodatas/:id/review',
  {
    summary: 'Approve, reject or ask for changes (a note is required unless approving)',
    body: z.object({
      decision: z.enum(['approved', 'rejected', 'changes_requested']),
      note: z.string().trim().max(1000).optional(),
    }),
  },
  async (req, res) => {
    const { decision, note } = req.valid.body;
    if (decision !== 'approved' && !note) throw validationError({ note: 'required' });
    const b = await Biodata.findOne({ _id: req.params.id, deletedAt: null });
    if (!b) throw notFound('BIODATA_NOT_FOUND');
    Object.assign(b, { status: decision, reviewNote: note, reviewedBy: req.user._id, reviewedAt: new Date() });
    if (decision === 'approved') {
      b.approvedAt ||= new Date();
      b.biodataNo ||= await nextSeq('biodataNo', 1000);
    }
    await b.save();
    if (decision !== 'approved') await withdrawProposalsFor(b._id);
    await notify(b.owner, `biodata_${decision}`, '/dashboard/biodata');
    await audit(req.user._id, `biodata.${decision}`, 'Biodata', b._id, { note, code: biodataCode(b.biodataNo) });
    res.json({ status: b.status, code: biodataCode(b.biodataNo) });
  }
);

r.post(
  '/biodatas/:id/nid',
  {
    summary: 'Verify or reject the uploaded NID',
    body: z.object({ decision: z.enum(['verified', 'rejected']), note: z.string().trim().max(500).optional() }),
  },
  async (req, res) => {
    const { decision, note } = req.valid.body;
    const b = await Biodata.findById(req.params.id);
    if (!b?.nid?.fileKey) throw notFound();
    Object.assign(b.nid, { status: decision, note, verifiedBy: req.user._id, verifiedAt: new Date() });
    await b.save();
    await notify(b.owner, `nid_${decision}`, '/dashboard/biodata');
    await audit(req.user._id, `nid.${decision}`, 'Biodata', b._id, { note });
    res.json({ nid: { status: b.nid.status } });
  }
);

r.post(
  '/biodatas/:id/hide',
  {
    summary: 'Hide from (or return to) search, e.g. while a report is investigated',
    body: z.object({ hidden: z.boolean(), reason: z.string().trim().max(200).optional() }),
  },
  async (req, res) => {
    const { hidden, reason } = req.valid.body;
    const b = await Biodata.findById(req.params.id);
    if (!b) throw notFound('BIODATA_NOT_FOUND');
    b.hidden = hidden;
    b.hiddenReason = hidden ? 'staff' : undefined;
    await b.save();
    if (hidden) await withdrawProposalsFor(b._id);
    await audit(req.user._id, hidden ? 'biodata.hide' : 'biodata.unhide', 'Biodata', b._id, { reason });
    res.json({ hidden: b.hidden });
  }
);

// ---------- Restore (soft-delete recovery) queue ----------
r.get(
  '/recovery',
  {
    summary: 'Deleted biodatas waiting to be restored',
    role: 'admin',
    query: z.object({ status: z.enum(['pending', 'approved', 'declined']).optional() }),
  },
  async (req, res) => {
    const status = req.valid.query.status || 'pending';
    const items = await Biodata.find({
      deletedAt: status === 'approved' ? null : { $ne: null },
      'recovery.status': status,
    })
      .sort({ 'recovery.requestedAt': 1 })
      .limit(100)
      .populate('owner', USER_BRIEF)
      .lean();
    res.json({
      items: items.map((b) => ({
        _id: b._id,
        code: biodataCode(b.biodataNo),
        type: b.type,
        owner: b.owner,
        deletedAt: b.deletedAt,
        deleteReason: b.deleteReason,
        deleteNote: b.deleteNote,
        recovery: b.recovery,
        candidateName: b.contact?.candidateName,
      })),
    });
  }
);

r.post(
  '/recovery/:id',
  {
    summary: 'Restore a deleted biodata (it goes back to review) or decline',
    role: 'admin',
    body: z.object({ decision: z.enum(['approve', 'decline']), note: z.string().trim().max(500).optional() }),
  },
  async (req, res) => {
    const { decision, note } = req.valid.body;
    const b = await Biodata.findOne({ _id: req.params.id, deletedAt: { $ne: null }, 'recovery.status': 'pending' });
    if (!b) throw notFound();
    b.recovery.decidedAt = new Date();
    b.recovery.decidedBy = req.user._id;
    if (decision === 'approve') {
      b.recovery.status = 'approved';
      b.deletedAt = null;
      b.status = 'pending';
      b.submittedAt = new Date();
    } else {
      b.recovery.status = 'declined';
      if (note) b.recovery.note = note;
    }
    await b.save();
    await notify(b.owner, decision === 'approve' ? 'recovery_approved' : 'recovery_declined', '/dashboard');
    await audit(req.user._id, `recovery.${decision}`, 'Biodata', b._id, { note });
    res.json({ recovery: b.recovery, deletedAt: b.deletedAt });
  }
);

export default r.router;
