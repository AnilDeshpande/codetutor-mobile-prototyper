#!/usr/bin/env node
// Create the prototype workspace in the user's project: the reading guide, the flow spec and the
// notes, from templates. Existing files are never overwritten.
//
//   node scaffold.mjs --out <folder> [--name "App name"]
//   node scaffold.mjs --upgrade [--out <folder>]
//
// --upgrade adds to an existing workspace the sections newer templates have and its files lack
// (in CLARIFICATIONS.md the question-ID legend and the sources, in DECISIONS.md the sources, in
// README.md how to open the sketch). It only inserts whole sections; nothing else changes.
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
import { fillReferences, SKILL_DIR } from './lib/references.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const templates = path.join(here, '..', 'assets', 'templates');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const out = workspace(opt('out'));
const appName = opt('name', 'App');

let skillVersion = 'unknown';
try { skillVersion = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'assets', 'skill.json'), 'utf8')).version; } catch { /* an old copy */ }
const vars = { '{{APP_NAME}}': appName, '{{DATE}}': new Date().toISOString().slice(0, 10), '{{SKILL_VERSION}}': skillVersion };
const created = [], kept = [], upgraded = [];
/** A template with its placeholders filled for dest; links to the skill's references are resolved here. */
function render(src, dest) {
  let text = fs.readFileSync(src, 'utf8');
  // JSON.stringify keeps an app name with quotes or backslashes valid inside flow.json.
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(k, dest.endsWith('.json') ? JSON.stringify(v).slice(1, -1) : v);
  return dest.endsWith('.md') ? fillReferences(text, path.dirname(dest)) : text;
}
function copy(src, dest) {
  if (fs.existsSync(dest)) { kept.push(dest); return; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, render(src, dest));
  created.push(dest);
}

// Sections --upgrade may add, and the heading each goes in front of (null: at the end).
const UPGRADES = {
  'notes/CLARIFICATIONS.md': [['How to read the IDs', /^## .*summary/im], ['Sources', null]],
  'notes/DECISIONS.md': [['Sources', null]],
  'README.md': [['Opening the sketch', /^## All files/im]],
};
const section = (text, heading) => {
  const m = text.match(new RegExp(`^## ${heading}\\s*$[\\s\\S]*?(?=^## |(?![\\s\\S]))`, 'im'));
  return m ? `${m[0].trimEnd()}\n` : null;
};
function upgrade(file) {
  const dest = path.join(out, file);
  if (!fs.existsSync(dest)) return;
  let text = fs.readFileSync(dest, 'utf8');
  const fresh = render(path.join(templates, path.basename(file)), dest);
  const added = [];
  for (const [heading, before] of UPGRADES[file]) {
    if (new RegExp(`^## ${heading}\\s*$`, 'im').test(text)) continue;
    const body = section(fresh, heading);
    const at = before ? text.search(before) : -1;
    text = at >= 0 ? `${text.slice(0, at)}${body}\n${text.slice(at)}` : `${text.trimEnd()}\n\n${body}`;
    added.push(heading);
  }
  if (added.length) { fs.writeFileSync(dest, text); upgraded.push(`${dest} (${added.join(', ')})`); }
}

if (args.includes('--upgrade')) {
  if (!fs.existsSync(path.join(out, 'notes', 'STATE.md'))) { console.error(`✗ No prototype workspace at ${out} (no notes/STATE.md). Pass --out <folder>.`); process.exit(1); }
  for (const f of Object.keys(UPGRADES)) upgrade(f);
} else {
  copy(path.join(templates, 'README.md'), path.join(out, 'README.md'));
  copy(path.join(templates, 'flow.json'), path.join(out, 'flow.json'));
  for (const f of ['STATE.md', 'INPUTS.md', 'CLARIFICATIONS.md', 'DECISIONS.md']) copy(path.join(templates, f), path.join(out, 'notes', f));
}

const r = (p) => { const x = path.relative(process.cwd(), p); return x.startsWith('..') ? p : x; };
console.log(`Prototype workspace: ${r(out)}`);
if (created.length) console.log(`  created: ${created.map(r).join(', ')}`);
if (kept.length) console.log(`  kept existing: ${kept.map(r).join(', ')}`);
if (args.includes('--upgrade')) console.log(upgraded.length ? `  added sections: ${upgraded.map(r).join('; ')}` : '  nothing to add: every file has the current sections');
console.log(`Flow spec format:  ${r(path.join(here, '..', 'references', 'sketch-spec.md'))}`);
console.log(`Handoff template:  ${r(path.join(templates, 'HANDOFF.md'))}`);
