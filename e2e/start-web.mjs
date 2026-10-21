/**
 * Starts the built website for end-to-end tests. Next.js keeps its data cache on disk
 * between runs; every E2E run gets a fresh database, so the cache is cleared first.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/web');
fs.rmSync(path.join(web, '.next/cache/fetch-cache'), { recursive: true, force: true });
const child = spawn(
  process.execPath,
  [path.join(web, '../../node_modules/next/dist/bin/next'), 'start', '-p', '3000'],
  {
    cwd: web,
    stdio: 'inherit',
  }
);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('exit', (code) => process.exit(code ?? 0));
