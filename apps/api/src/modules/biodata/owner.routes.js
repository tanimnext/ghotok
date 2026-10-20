/**
 * The signed-in user's own biodata: create/edit (autosaved per step), submit for review,
 * hide/show, delete and restore, photo and NID uploads.
 */
import { z } from 'zod';
import { values, HIDE_REASONS, DELETE_REASONS } from '@ghotok/shared';
import { createRouter } from '../../core/router.js';
import { notFound, badRequest, conflict, validationError } from '../../core/http.js';
import { assertUpload } from '../../middleware/upload.js';
import { putFile, deleteFile, newKey } from '../../services/storage.js';
import { Biodata, toOwner } from './biodata.model.js';
import { findOwn, saveOwnBiodata, submitOwnBiodata, withdrawProposalsFor } from './biodata.service.js';

const r = createRouter({ prefix: '/me/biodata', tag: 'My biodata', defaults: { auth: 'required' } });

const requireOwn = async (userId) => {
  const b = await findOwn(userId);
  if (!b) throw notFound('BIODATA_REQUIRED');
  return b;
};

r.get('/', { summary: 'My biodata (all fields), or null' }, async (req, res) => {
  const b = await findOwn(req.user._id);
  res.json({ biodata: b ? toOwner(b) : null });
});

r.put(
  '/',
  {
    summary:
      'Save any part of my biodata. Body: { type?, <section>: { <field>: value } }. Returns remaining submission problems.',
    body: z.record(z.string(), z.unknown()),
  },
  async (req, res) => {
    const { biodata, changed, problems } = await saveOwnBiodata(req.user, req.valid.body);
    res.json({ biodata: toOwner(biodata), changed, problems });
  }
);

r.post('/submit', { summary: 'Submit my biodata for review' }, async (req, res) => {
  const b = await submitOwnBiodata(req.user);
  res.json({ biodata: toOwner(b) });
});

r.post(
  '/visibility',
  {
    summary: 'Hide or show my biodata',
    body: z.object({ hidden: z.boolean(), reason: z.enum(values(HIDE_REASONS)).optional() }),
  },
  async (req, res) => {
    const { hidden, reason } = req.valid.body;
    if (hidden && !reason) throw validationError({ reason: 'required' });
    const b = await requireOwn(req.user._id);
    if (b.hiddenReason === 'minor_report' || b.hiddenReason === 'staff') throw badRequest('FORBIDDEN'); // only staff can lift these
    b.hidden = hidden;
    b.hiddenReason = hidden ? reason : undefined;
    await b.save();
    if (hidden) await withdrawProposalsFor(b._id);
    res.json({ biodata: toOwner(b) });
  }
);

r.post(
  '/delete',
  {
    summary: 'Delete my biodata (can be restored after review)',
    body: z.object({ reason: z.enum(values(DELETE_REASONS)), note: z.string().trim().max(500).optional() }),
  },
  async (req, res) => {
    const b = await requireOwn(req.user._id);
    Object.assign(b, {
      deletedAt: new Date(),
      deleteReason: req.valid.body.reason,
      deleteNote: req.valid.body.note,
      recovery: { status: 'none' },
    });
    await b.save();
    await withdrawProposalsFor(b._id);
    res.json({ ok: true });
  }
);

r.post(
  '/recovery',
  {
    summary: 'Ask for my deleted biodata to be restored',
    body: z.object({ note: z.string().trim().max(500).optional() }),
  },
  async (req, res) => {
    const b = await Biodata.findOne({ owner: req.user._id, deletedAt: { $ne: null } });
    if (!b) throw notFound('BIODATA_NOT_FOUND');
    if (b.recovery?.status === 'pending') throw conflict('RESTORE_PENDING');
    b.recovery = { status: 'pending', note: req.valid.body.note, requestedAt: new Date() };
    await b.save();
    res.json({ recovery: b.recovery });
  }
);

r.post(
  '/photo',
  { summary: 'Upload my photo (JPG/PNG/WEBP, max 5 MB). Only unlocked viewers can see it.', upload: 'file' },
  async (req, res) => {
    const b = await requireOwn(req.user._id);
    assertUpload(req.file, { images: true });
    const key = await putFile(newKey('photos', req.file.mimetype), req.file.buffer, req.file.mimetype);
    const old = b.photoKey;
    b.photoKey = key;
    await b.save();
    await deleteFile(old);
    res.json({ hasPhoto: true });
  }
);

r.delete('/photo', { summary: 'Remove my photo' }, async (req, res) => {
  const b = await requireOwn(req.user._id);
  await deleteFile(b.photoKey);
  b.photoKey = undefined;
  await b.save();
  res.json({ hasPhoto: false });
});

r.post(
  '/nid',
  { summary: 'Upload my NID (image or PDF) for the verified badge. Never shown publicly.', upload: 'file' },
  async (req, res) => {
    const b = await requireOwn(req.user._id);
    if (b.nid?.status === 'verified') throw badRequest('NID_VERIFIED');
    assertUpload(req.file);
    const key = await putFile(newKey('nid', req.file.mimetype), req.file.buffer, req.file.mimetype);
    const old = b.nid?.fileKey;
    b.nid = { fileKey: key, status: 'submitted' };
    await b.save();
    await deleteFile(old);
    res.json({ nid: { status: 'submitted', uploaded: true } });
  }
);

export default r.router;
