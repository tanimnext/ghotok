import multer from 'multer';
import { ALLOWED_TYPES } from '../services/storage.js';
import { badRequest } from '../utils/http.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) return cb(badRequest('Only JPG, PNG, WEBP or PDF files are allowed'));
    cb(null, true);
  },
});

// Check the file's magic bytes so a renamed file cannot pass as an image.
export function sniffOk(buf, mime) {
  if (!buf || buf.length < 12) return false;
  const hex = buf.subarray(0, 12).toString('hex');
  if (mime === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (mime === 'image/png') return hex.startsWith('89504e470d0a1a0a');
  if (mime === 'image/webp') return hex.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP';
  if (mime === 'application/pdf') return buf.subarray(0, 5).toString() === '%PDF-';
  return false;
}
