/** Admin dictionary checks: same keys in both languages, and every `t.x.y` used in the code exists. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../src/i18n/en.js';
import bn from '../src/i18n/bn.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const leaves = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => {
    const p = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v) ? leaves(v, p) : [p];
  });

test('English and Bangla have the same keys', () => {
  assert.deepEqual(leaves(bn).sort(), leaves(en).sort());
});

test('every dictionary key used in the code exists', () => {
  const files = [];
  const walk = (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (f === 'i18n') continue;
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.jsx?$/.test(f)) files.push(p);
    }
  };
  walk(root);
  const get = (o, k) => k.split('.').reduce((x, y) => (x == null ? undefined : x[y]), o);
  const missing = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const aliases = { t: '' };
    for (const m of src.matchAll(/const (\w+) = t\.([\w.]+);/g)) aliases[m[1]] = m[2];
    for (const [alias, prefix] of Object.entries(aliases)) {
      const re = new RegExp(`(?<![\\w.])${alias}\\.([a-zA-Z_]\\w*(?:\\.[a-zA-Z_]\\w*)*)`, 'g');
      for (const m of src.matchAll(re)) {
        const key = (prefix ? `${prefix}.${m[1]}` : m[1]).replace(/\.(map|join|length|replace|slice)$/, '');
        if (get(en, key) === undefined) missing.push(`${key} (${path.relative(root, f)})`);
      }
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});
