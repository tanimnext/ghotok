import multer from 'multer';
import { HttpError } from '../utils/http.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, fields: err.details, code: err.code });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB)' : err.message });
  }
  if (err?.name === 'ValidationError') {
    const fields = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(400).json({ error: 'Please check the highlighted fields', fields });
  }
  if (err?.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  if (err?.code === 11000) return res.status(409).json({ error: 'This already exists', fields: err.keyValue });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
