/**
 * Dictionary checks: both languages have exactly the same keys, no string is empty, and every
 * `t.section.key` used in the code exists (catches typos that would render "undefined").
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../lib/i18n/en.js';
import bn from '../lib/i18n/bn.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function leaves(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const p = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) return [[p, v]];
    if (v && typeof v === 'object') return leaves(v, p);
    return [[p, v]];
  });
}

const shape = (obj) =>
  leaves(obj)
    .map(([p, v]) => (Array.isArray(v) ? `${p}[${v.length}]` : p))
    .sort();

test('English and Bangla have the same keys', () => {
  assert.deepEqual(shape(bn), shape(en));
});

test('no empty strings', () => {
  for (const [lang, d] of Object.entries({ en, bn })) {
    for (const [p, v] of leaves(d)) {
      const values = Array.isArray(v) ? v.flat(2) : [v];
      for (const s of values) assert.ok(typeof s !== 'string' || s.trim(), `${lang}:${p} is empty`);
    }
  }
});

test('every dictionary key used in the code exists', () => {
  const files = [];
  const walk = (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (['node_modules', '.next', 'test', 'i18n'].includes(f)) continue;
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.jsx?$/.test(f)) files.push(p);
    }
  };
  walk(path.join(root, 'app'));
  walk(path.join(root, 'components'));
  const get = (o, k) => k.split('.').reduce((x, y) => (x == null ? undefined : x[y]), o);
  const missing = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const aliases = { t: '' };
    for (const m of src.matchAll(/const (\w+) = t\.([\w.]+);/g)) aliases[m[1]] = m[2];
    for (const [alias, prefix] of Object.entries(aliases)) {
      const re = new RegExp(`(?<![\\w.])${alias}\\.([a-zA-Z_]\\w*(?:\\.[a-zA-Z_]\\w*)*)`, 'g');
      for (const m of src.matchAll(re)) {
        const key = (prefix ? `${prefix}.${m[1]}` : m[1]).replace(
          /\.(replace|map|join|length|slice|split|filter|find|includes)$/,
          ''
        );
        if (get(en, key) === undefined) missing.push(`${key} (${path.relative(root, f)})`);
      }
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});
