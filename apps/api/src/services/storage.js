/**
 * File storage. Driver "r2" uses Cloudflare R2 (S3 compatible); "local" writes to disk.
 * Private files (photos, NID) are never served from a public URL — routes stream them
 * after an access check. Public resources (downloads) are streamed without auth.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const { driver, uploadDir, r2: r2cfg } = env.storage;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

let s3;
function r2() {
  s3 ||= new S3Client({
    region: 'auto',
    endpoint: `https://${r2cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2cfg.accessKeyId, secretAccessKey: r2cfg.secretAccessKey },
  });
  return s3;
}

/** e.g. photos/2026-10/2b1c….jpg */
export const newKey = (folder, mime) =>
  `${folder}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${EXT[mime] || 'bin'}`;

function localPath(key) {
  const root = path.resolve(uploadDir);
  const p = path.resolve(root, key);
  if (!p.startsWith(root + path.sep)) throw new Error('Invalid storage key');
  return p;
}

export async function putFile(key, buffer, contentType) {
  if (driver === 'r2') {
    await r2().send(new PutObjectCommand({ Bucket: r2cfg.bucket, Key: key, Body: buffer, ContentType: contentType }));
  } else {
    const p = localPath(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, buffer);
  }
  return key;
}

/** @returns {Promise<{ body: Buffer | import('stream').Readable, contentType: string }>} */
export async function getFile(key) {
  if (driver === 'r2') {
    const out = await r2().send(new GetObjectCommand({ Bucket: r2cfg.bucket, Key: key }));
    return { body: out.Body, contentType: out.ContentType || 'application/octet-stream' };
  }
  const body = await fs.readFile(localPath(key));
  const ext = path.extname(key).slice(1);
  const contentType = Object.entries(EXT).find(([, e]) => e === ext)?.[0] || 'application/octet-stream';
  return { body, contentType };
}

export async function deleteFile(key) {
  if (!key) return;
  try {
    if (driver === 'r2') await r2().send(new DeleteObjectCommand({ Bucket: r2cfg.bucket, Key: key }));
    else await fs.unlink(localPath(key));
  } catch (err) {
    logger.warn({ err, key }, 'Could not delete stored file');
  }
}

/** Stream a stored file to an Express response. */
export async function streamFile(res, key, { cache = 'private, no-store', filename } = {}) {
  const { body, contentType } = await getFile(key);
  res.set('Content-Type', contentType);
  res.set('Cache-Control', cache);
  res.set('X-Content-Type-Options', 'nosniff');
  if (filename) res.set('Content-Disposition', `attachment; filename="${filename.replace(/[^\w.-]+/g, '_')}"`);
  if (Buffer.isBuffer(body)) return res.end(body);
  if (typeof body?.pipe === 'function') return body.pipe(res);
  res.end(Buffer.from(await body.transformToByteArray()));
}
