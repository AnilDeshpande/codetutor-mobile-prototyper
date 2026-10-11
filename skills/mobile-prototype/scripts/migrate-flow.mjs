#!/usr/bin/env node
// Bring a flow spec written before "appScreens" existed up to date: one canonical name per screen,
// with each frame's free-text "title" turned into its state name. The result draws and checks
// like any current spec; review the names it reports before showing the sketch again.
//
//   node migrate-flow.mjs [--spec docs/prototypes/flow.json] [--out <file>] [--dry-run]
//
// Writes the spec in place (keeping the old one as flow.json.bak) unless --out or --dry-run is
// given. A spec that already has "appScreens" is left alone.
//
// What it does, per screen id:
//   appScreens.<id>.name   the id in words ("create-habit" → "Create habit"): ids were the one
//                          thing that already identified a screen, while titles mixed in states
//                          and entry conditions
//   frame "stateName"      the old title, minus a leading screen name ("Devices · none paired" →
//                          "None paired"); left out when the title was just the screen name
//   frame "title"          removed

import fs from 'node:fs';
import path from 'node:path';
import { workspace } from './lib/workspace.mjs';
import { humanize, checkScreenNames, numberFrames } from './lib/flow.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const flag = (n) => args.includes(`--${n}`);
if (flag('help') || flag('h')) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 21).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const specFile = opt('spec') ? path.resolve(opt('spec')) : path.join(workspace(), 'flow.json');
const rel = (p) => { const r = path.relative(process.cwd(), p) || '.'; return r.startsWith('..') ? p : r; };
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };
if (!fs.existsSync(specFile)) die(`No spec at ${rel(specFile)}.`);
let spec;
try { spec = JSON.parse(fs.readFileSync(specFile, 'utf8')); } catch (e) { die(`${rel(specFile)} is not valid JSON: ${e.message}`); }
if (spec.appScreens != null) { console.log(`✓ ${rel(specFile)} already has "appScreens"; nothing to migrate.`); process.exit(0); }

const frames = numberFrames(spec);
const ids = [...new Set(frames.map((s) => s.screen).filter(Boolean))];
const appScreens = Object.fromEntries(ids.map((id) => [id, { name: humanize(id) }]));
const review = [];
const strip = (title, name) => {
  const t = String(title).trim();
  const m = t.match(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:[·—–:-]\\s*)?(.*)$`, 'i'));
  return m ? m[1].trim() : t;
};
for (const s of frames) {
  if (s.title == null || !s.screen) continue;
  const rest = strip(s.title, appScreens[s.screen].name);
  if (rest && s.stateName == null) {
    s.stateName = rest[0].toUpperCase() + rest.slice(1);
    review.push(`${s.sid} "${s.title}" → ${appScreens[s.screen].name} — ${s.stateName}`);
  }
  delete s.title;
}

// Keep the top-level keys in reading order: app, platforms, appScreens, then the rest.
const out = {};
for (const [k, v] of Object.entries(spec)) {
  if (k === 'tabs' || k === 'journeys') out.appScreens ??= appScreens;
  out[k] = v;
}
out.appScreens ??= appScreens;
for (const s of frames) delete s.sid;

const text = `${JSON.stringify(out, null, 2)}\n`;
const target = opt('out') ? path.resolve(opt('out')) : specFile;
if (flag('dry-run')) process.stdout.write(text);
else {
  if (target === specFile) fs.copyFileSync(specFile, `${specFile}.bak`);
  fs.writeFileSync(target, text);
}

const { errors, warnings } = checkScreenNames(JSON.parse(text));
const log = flag('dry-run') ? console.error : console.log;
log(`${flag('dry-run') ? '(dry run) ' : '✓ '}${rel(target)}: ${ids.length} screen(s) in "appScreens", ${frames.length} frame(s)${target === specFile && !flag('dry-run') ? `; the old spec is ${rel(`${specFile}.bak`)}` : ''}`);
log(`  Screen names (the id in words; rename any that read badly):\n${ids.map((id) => `    ${id}: "${appScreens[id].name}"`).join('\n')}`);
if (review.length) log(`  Old titles kept as state names. Check each: a state says what differs on the screen ("Empty", "Saved");\n  how or when the user gets there ("First launch", "After saving") belongs in "entry" instead:\n${review.map((r) => `    ${r}`).join('\n')}`);
for (const w of warnings) log(`  ! ${w}`);
for (const e of errors) log(`  ✗ ${e}`);
log(`  Then run sketch.mjs --check, and sketch.mjs to redraw: the frame titles change, so every S-number now shows its screen's one name.`);
process.exit(errors.length ? 1 : 0);
