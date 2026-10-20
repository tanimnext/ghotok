import { Router } from 'express';
import { Biodata } from '../models/Biodata.js';
import { Unlock } from '../models/commerce.js';
import { requireAuth, hasRole } from '../middleware/auth.js';
import { getFile } from '../services/storage.js';
import { ah, notFound, forbidden } from '../utils/http.js';

// Private files are streamed only after an access check. Photos: owner, staff,
// or a user who unlocked the contact. NID: owner or staff only.
const r = Router();
r.use(requireAuth);

async function stream(res, key) {
  const { body, contentType } = await getFile(key);
  res.set('Content-Type', contentType);
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  if (Buffer.isBuffer(body)) return res.end(body);
  if (typeof body?.pipe === 'function') return body.pipe(res);
  res.end(Buffer.from(await body.transformToByteArray()));
}

r.get(
  '/photo/:biodataId',
  ah(async (req, res) => {
    const b = await Biodata.findById(req.params.biodataId).select('owner photoKey');
    if (!b?.photoKey) throw notFound();
    const isOwner = String(b.owner) === String(req.user._id);
    const allowed = isOwner || hasRole(req.user, 'support') || (await Unlock.exists({ user: req.user._id, biodata: b._id }));
    if (!allowed) throw forbidden('Unlock this biodata to see the photo');
    await stream(res, b.photoKey);
  })
);

r.get(
  '/nid/:biodataId',
  ah(async (req, res) => {
    const b = await Biodata.findById(req.params.biodataId).select('owner nid');
    if (!b?.nid?.fileKey) throw notFound();
    const isOwner = String(b.owner) === String(req.user._id);
    if (!isOwner && !hasRole(req.user, 'support')) throw forbidden();
    await stream(res, b.nid.fileKey);
  })
);

export default r;
