import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

// Private file storage. Files are never served from a public URL: the API
// streams them after checking who is asking (see routes/files.js).
// Driver "r2" uses Cloudflare R2 (S3 compatible); "local" writes to disk.

let s3;
function r2() {
  if (!s3) {
    s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
    });
  }
  return s3;
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
export const ALLOWED_TYPES = Object.keys(EXT);

export function newKey(folder, mime) {
  return `${folder}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${EXT[mime] || 'bin'}`;
}

function localPath(key) {
  const root = path.resolve(env.uploadDir);
  const p = path.resolve(root, key);
  if (!p.startsWith(root + path.sep)) throw new Error('Invalid key');
  return p;
}

export async function putFile(key, buffer, contentType) {
  if (env.storageDriver === 'r2') {
    await r2().send(new PutObjectCommand({ Bucket: env.r2.bucket, Key: key, Body: buffer, ContentType: contentType }));
    return key;
  }
  const p = localPath(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, buffer);
  return key;
}

/** Returns { body: Buffer|ReadableStream, contentType } */
export async function getFile(key) {
  if (env.storageDriver === 'r2') {
    const out = await r2().send(new GetObjectCommand({ Bucket: env.r2.bucket, Key: key }));
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
    if (env.storageDriver === 'r2') await r2().send(new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: key }));
    else await fs.unlink(localPath(key));
  } catch {
    /* already gone */
  }
}
