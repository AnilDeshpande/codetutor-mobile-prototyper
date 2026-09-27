#!/usr/bin/env node
// Create the prototype workspace in the user's project: the prototype template plus the notes files.
// Existing files are never overwritten (use --force to replace template files, never notes).
//
//   node scaffold.mjs [--out prototype] [--name "App name"] [--force]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, '..', 'assets');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const out = path.resolve(opt('out', 'prototype'));
const appName = opt('name', 'App');
const force = args.includes('--force');

const created = [];
const kept = [];

function copy(src, dest, { allowForce }) {
  if (fs.existsSync(dest) && !(force && allowForce)) { kept.push(dest); return; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let text = fs.readFileSync(src, 'utf8');
  text = text.replaceAll('{{APP_NAME}}', appName).replaceAll('{{DATE}}', new Date().toISOString().slice(0, 10));
  fs.writeFileSync(dest, text);
  created.push(dest);
}

for (const f of fs.readdirSync(path.join(assets, 'prototype-template'))) {
  copy(path.join(assets, 'prototype-template', f), path.join(out, f), { allowForce: true });
}

const notes = ['STATE.md', 'INPUTS.md', 'CLARIFICATIONS.md', 'DECISIONS.md', 'VERIFICATION.md'];
for (const f of notes) copy(path.join(assets, 'templates', f), path.join(out, 'notes', f), { allowForce: false });

for (const d of ['scenarios', 'screenshots']) fs.mkdirSync(path.join(out, d), { recursive: true });
const keep = path.join(out, 'screenshots', '.gitkeep');
if (!fs.existsSync(keep)) fs.writeFileSync(keep, '');

const r = (p) => { const x = path.relative(process.cwd(), p); return x.startsWith('..') ? p : x; };
console.log(`Prototype workspace: ${r(out)}`);
if (created.length) console.log(`  created: ${created.map(r).join(', ')}`);
if (kept.length) console.log(`  kept existing: ${kept.map(r).join(', ')}`);
console.log(`Scenario template: ${r(path.join(assets, 'templates', 'SCENARIO.md'))}`);
console.log(`Handoff template:  ${r(path.join(assets, 'templates', 'HANDOFF.md'))}`);
