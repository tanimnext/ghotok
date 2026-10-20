import multer from 'multer';
import { badRequest } from '../core/http.js';

export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) return cb(badRequest('FILE_TYPE'));
    cb(null, true);
  },
});

/** Check magic bytes so a renamed file cannot pass as an image or PDF. */
export function sniffOk(buf, mime) {
  if (!buf || buf.length < 12) return false;
  const hex = buf.subarray(0, 12).toString('hex');
  if (mime === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (mime === 'image/png') return hex.startsWith('89504e470d0a1a0a');
  if (mime === 'image/webp') return hex.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP';
  if (mime === 'application/pdf') return buf.subarray(0, 5).toString() === '%PDF-';
  return false;
}

/** Validate an uploaded file (presence + magic bytes) or throw. */
export function assertUpload(file, { images = false } = {}) {
  if (!file) throw badRequest('FILE_REQUIRED');
  if (images && file.mimetype === 'application/pdf') throw badRequest('FILE_TYPE');
  if (!sniffOk(file.buffer, file.mimetype)) throw badRequest('FILE_INVALID');
}
