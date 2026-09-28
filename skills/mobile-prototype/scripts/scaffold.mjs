#!/usr/bin/env node
// Create the prototype workspace in the user's project: the prototype template for the target
// platform(s) plus the notes files. Existing files are never overwritten (use --force to replace
// template files, never notes).
//
//   node scaffold.mjs [--out prototype] [--name "App name"] [--platform android|ios|both] [--force]
//   node scaffold.mjs --notes-only [--out prototype] [--name "App name"]
//
// --notes-only (Phase 1) creates just README.md and the notes needed before gate A; the platform
// isn't known yet, so no template files are copied. The full run later adds the rest.
//
// --platform takes one platform, a comma list, or "both"; the first one listed opens by default.
// Running it again with another platform adds that platform's files and rewrites index.html
// (with --force) so both are linked.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, '..', 'assets');
const template = path.join(assets, 'prototype-template');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const out = path.resolve(opt('out', 'prototype'));
const appName = opt('name', 'App');
const force = args.includes('--force');
const notesOnly = args.includes('--notes-only');

// Platforms the template supports: one tokens/<name>.css each.
const supported = fs.readdirSync(path.join(template, 'tokens')).filter((f) => f.endsWith('.css')).map((f) => f.slice(0, -4));
const requested = notesOnly ? 'android' : opt('platform', 'android');
const asked = requested === 'both' ? ['android', 'ios'] : requested.split(',').map((s) => s.trim()).filter(Boolean);
// Platforms an existing prototype already links stay linked, in their original order.
const existingIndex = path.join(out, 'index.html');
const linked = fs.existsSync(existingIndex)
  ? [...fs.readFileSync(existingIndex, 'utf8').matchAll(/data-platform="([\w-]+)"/g)].map((m) => m[1])
  : [];
const platforms = [...new Set([...linked, ...asked])];
const missing = platforms.filter((p) => !supported.includes(p));
if (!platforms.length || missing.length) {
  console.error(`Unsupported platform: ${missing.join(', ') || requested}. This template supports: ${supported.join(', ')}.`);
  process.exit(1);
}

const created = [];
const kept = [];
const vars = {
  '{{APP_NAME}}': appName,
  '{{DATE}}': new Date().toISOString().slice(0, 10),
  '{{PLATFORMS}}': notesOnly ? 'not confirmed yet (settled at gate A)'
    : platforms.length > 1 ? `${platforms.join(', ')} (${platforms[0]} opens by default)` : platforms[0],
  // A theme applied by theme.mjs (tokens/<p>.theme.css) stays linked when index.html is rewritten.
  '{{PLATFORM_STYLES}}': platforms.map((p) =>
    `  <link rel="stylesheet" href="tokens/${p}.css" data-platform="${p}">\n${fs.existsSync(path.join(out, 'tokens', `${p}.theme.css`)) ? `  <link rel="stylesheet" href="tokens/${p}.theme.css" data-platform="${p}" data-theme-link>\n` : ''}  <link rel="stylesheet" href="platform/${p}.css" data-platform="${p}">`).join('\n'),
  '{{PLATFORM_SCRIPTS}}': platforms.map((p) => `  <script src="platform/${p}.js"></script>`).join('\n'),
};

function copy(src, dest, { allowForce }) {
  if (fs.existsSync(dest) && !(force && allowForce)) { kept.push(dest); return; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let text = fs.readFileSync(src, 'utf8');
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(k, v);
  fs.writeFileSync(dest, text);
  created.push(dest);
}

// The reading guide and the notes needed before gate A. Later notes join in the full run.
copy(path.join(assets, 'templates', 'README.md'), path.join(out, 'README.md'), { allowForce: false });
const notes = ['STATE.md', 'INPUTS.md', 'CLARIFICATIONS.md', 'DECISIONS.md'];
if (!notesOnly) notes.push('FLOW.md', 'VERIFICATION.md');
for (const f of notes) copy(path.join(assets, 'templates', f), path.join(out, 'notes', f), { allowForce: false });

const r = (p) => { const x = path.relative(process.cwd(), p); return x.startsWith('..') ? p : x; };
if (notesOnly) {
  console.log(`Prototype notes: ${r(out)}`);
  if (created.length) console.log(`  created: ${created.map(r).join(', ')}`);
  if (kept.length) console.log(`  kept existing: ${kept.map(r).join(', ')}`);
  process.exit(0);
}

// Shared files, then each platform's tokens, shell stylesheet and adapter.
for (const f of fs.readdirSync(template)) {
  if (fs.statSync(path.join(template, f)).isDirectory()) continue;
  copy(path.join(template, f), path.join(out, f), { allowForce: true });
}
for (const p of platforms) {
  for (const rel of [`tokens/${p}.css`, `platform/${p}.css`, `platform/${p}.js`]) {
    copy(path.join(template, rel), path.join(out, rel), { allowForce: true });
  }
}

for (const d of ['scenarios', 'screenshots']) fs.mkdirSync(path.join(out, d), { recursive: true });
const keep = path.join(out, 'screenshots', '.gitkeep');
if (!fs.existsSync(keep)) fs.writeFileSync(keep, '');

console.log(`Prototype workspace: ${r(out)} (platforms: ${platforms.join(', ')})`);
if (created.length) console.log(`  created: ${created.map(r).join(', ')}`);
if (kept.length) console.log(`  kept existing: ${kept.map(r).join(', ')}`);
const unthemed = platforms.filter((p) => !fs.existsSync(path.join(out, 'tokens', `${p}.theme.css`)));
if (unthemed.length && unthemed.length < platforms.length) {
  console.log(`  A theme is applied to the other platform(s): run theme.mjs again to theme ${unthemed.join(', ')} too.`);
}
if (kept.some((k) => k.endsWith('index.html')) && !force) {
  console.log('  index.html was kept: if you added a platform, run again with --force to link it (notes are never replaced).');
}
console.log(`Scenario template: ${r(path.join(assets, 'templates', 'SCENARIO.md'))}`);
console.log(`Handoff template:  ${r(path.join(assets, 'templates', 'HANDOFF.md'))}`);
