/** Write the OpenAPI document to docs/api/openapi.json (run: npm run openapi -w @ghotok/api). */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../app.js';
import { buildOpenApi } from '../core/openapi.js';

createApp(); // registers every route
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../docs/api/openapi.json');
await fs.mkdir(path.dirname(out), { recursive: true });
const doc = buildOpenApi({ serverUrl: 'https://api.ghotok.com.bd' });
await fs.writeFile(out, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote ${Object.keys(doc.paths).length} paths to ${path.relative(process.cwd(), out)}`);
