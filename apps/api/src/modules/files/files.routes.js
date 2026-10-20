/**
 * Private files are streamed only after an access check — never from a public URL.
 *   Photo: owner, staff, or a user who unlocked the contact.
 *   NID:   owner or staff.
 */
import { hasRole } from '@ghotok/shared';
import { createRouter } from '../../core/router.js';
import { notFound, forbidden } from '../../core/http.js';
import { streamFile } from '../../services/storage.js';
import { Biodata } from '../biodata/biodata.model.js';
import { Unlock } from '../billing/billing.models.js';

const r = createRouter({ prefix: '/files', tag: 'Files', defaults: { auth: 'required' } });

r.get('/photo/:biodataId', { summary: 'Biodata photo (owner, staff or unlocked viewer)' }, async (req, res) => {
  const b = await Biodata.findById(req.params.biodataId).select('owner photoKey').lean();
  if (!b?.photoKey) throw notFound();
  const allowed =
    String(b.owner) === String(req.user._id) ||
    hasRole(req.user.role, 'support') ||
    (await Unlock.exists({ user: req.user._id, biodata: b._id }));
  if (!allowed) throw forbidden();
  await streamFile(res, b.photoKey);
});

r.get('/nid/:biodataId', { summary: 'NID document (owner or staff)' }, async (req, res) => {
  const b = await Biodata.findById(req.params.biodataId).select('owner nid').lean();
  if (!b?.nid?.fileKey) throw notFound();
  if (String(b.owner) !== String(req.user._id) && !hasRole(req.user.role, 'support')) throw forbidden();
  await streamFile(res, b.nid.fileKey);
});

export default r.router;
