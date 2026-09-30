#!/usr/bin/env node
// Create the prototype workspace in the user's project: the reading guide, the flow spec and the
// notes, from templates. Existing files are never overwritten.
//
//   node scaffold.mjs --out <folder> [--name "App name"]
//
// The folder is the user's choice (recommended: docs/prototypes) and must be inside the project;
// a folder outside it is refused. Without --out, an existing workspace is used, else docs/prototypes.
//
// The sketch (flow.drawio) is written later by sketch.mjs, and the design phase's look/ folder
// by screens.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workspace } from './lib/workspace.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const templates = path.join(here, '..', 'assets', 'templates');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const out = workspace(opt('out'));
const appName = opt('name', 'App');

const vars = { '{{APP_NAME}}': appName, '{{DATE}}': new Date().toISOString().slice(0, 10) };
const created = [], kept = [];
function copy(src, dest) {
  if (fs.existsSync(dest)) { kept.push(dest); return; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let text = fs.readFileSync(src, 'utf8');
  // JSON.stringify keeps an app name with quotes or backslashes valid inside flow.json.
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(k, dest.endsWith('.json') ? JSON.stringify(v).slice(1, -1) : v);
  fs.writeFileSync(dest, text);
  created.push(dest);
}

copy(path.join(templates, 'README.md'), path.join(out, 'README.md'));
copy(path.join(templates, 'flow.json'), path.join(out, 'flow.json'));
for (const f of ['STATE.md', 'INPUTS.md', 'CLARIFICATIONS.md', 'DECISIONS.md']) copy(path.join(templates, f), path.join(out, 'notes', f));

const r = (p) => { const x = path.relative(process.cwd(), p); return x.startsWith('..') ? p : x; };
console.log(`Prototype workspace: ${r(out)}`);
if (created.length) console.log(`  created: ${created.map(r).join(', ')}`);
if (kept.length) console.log(`  kept existing: ${kept.map(r).join(', ')}`);
console.log(`Flow spec format:  ${r(path.join(here, '..', 'references', 'sketch-spec.md'))}`);
console.log(`Handoff template:  ${r(path.join(templates, 'HANDOFF.md'))}`);
