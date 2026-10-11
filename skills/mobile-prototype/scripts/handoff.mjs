#!/usr/bin/env node
// Write the parts of the handoff (docs/prototypes/HANDOFF.md) that come straight from the flow
// spec, and check that the spec, the diagram and the handoff name every screen the same way.
//
//   node handoff.mjs [--spec docs/prototypes/flow.json] [--handoff <file>] [--drawio <file>] [--check]
//
//   (default)  create HANDOFF.md from the template if it doesn't exist, then fill the blocks between
//              its "generated" markers: the screen inventory, the transitions and the diagram's
//              pages. Everything outside the markers is yours and is never touched.
//   --check    write nothing; exit 1 if any S-number resolves to a different screen in flow.json,
//              flow.drawio or HANDOFF.md, or if a generated block is out of date
//
// The spec must name its screens in "appScreens" (references/sketch-spec.md). An older spec
// gets the migration command instead.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workspace } from './lib/workspace.mjs';
import { hasAppScreens, appScreens, checkScreenNames, numberFrames, screenName, stateName, frameTitle, frameLabel, locationOf } from './lib/flow.mjs';
import { fillReferences } from './lib/references.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const flag = (n) => args.includes(`--${n}`);
if (flag('help') || flag('h')) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 14).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const specFile = opt('spec') ? path.resolve(opt('spec')) : path.join(workspace(), 'flow.json');
const dir = path.dirname(specFile);
const handoffFile = path.resolve(opt('handoff', path.join(dir, 'HANDOFF.md')));
const drawioFile = path.resolve(opt('drawio', path.join(dir, 'flow.drawio')));
const rel = (p) => { const r = path.relative(process.cwd(), p) || '.'; return r.startsWith('..') ? p : r; };
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

if (!fs.existsSync(specFile)) die(`No spec at ${rel(specFile)}.`);
let spec;
try { spec = JSON.parse(fs.readFileSync(specFile, 'utf8')); } catch (e) { die(`${rel(specFile)} is not valid JSON: ${e.message}`); }
if (!hasAppScreens(spec)) {
  die(`${rel(specFile)} has no "appScreens", so a screen's name can't be checked across the diagram and the handoff.\n  Migrate it: node ${rel(path.join(here, 'migrate-flow.mjs'))} --spec ${rel(specFile)}\n  then review the names, run sketch.mjs again and come back here (references/sketch-spec.md, "Migrating an older flow.json").`);
}

const names = checkScreenNames(spec); // also numbers the frames S1, S2, … as sketch.mjs does
for (const w of names.warnings) console.log(`! ${w}`);
if (names.errors.length) { for (const e of names.errors) console.error(`✗ ${e}`); die('Fix flow.json first, then run sketch.mjs and this script again.'); }
const frames = numberFrames(spec);
const bySid = new Map(frames.map((s) => [s.sid, s]));
const byId = new Map(frames.map((s) => [s.id, s]));
const journeys = spec.journeys || [];
const screens = appScreens(spec);

// ---------- the diagram ----------
const unxml = (t) => String(t).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#10;/g, '\n').replace(/&amp;/g, '&');
function readDiagram() {
  if (!fs.existsSync(drawioFile)) return null;
  const xml = fs.readFileSync(drawioFile, 'utf8');
  const pages = [...xml.matchAll(/<diagram\b[^>]*>/g)].map((m) => ({
    id: unxml((m[0].match(/\bid="([^"]*)"/) || [])[1] || ''),
    name: unxml((m[0].match(/\bname="([^"]*)"/) || [])[1] || ''),
  }));
  const shapes = [...xml.matchAll(/<UserObject\b[^>]*\bsid="[^"]*"[^>]*>/g)].map((m) => {
    const attr = (k) => { const a = m[0].match(new RegExp(`\\s${k}="([^"]*)"`)); return a ? unxml(a[1]) : undefined; };
    return { sid: attr('sid'), screen: attr('screen'), screenName: attr('screenName'), state: attr('state') };
  });
  return { pages, shapes };
}
const diagram = readDiagram();

// ---------- the generated blocks ----------
const cell = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n');

function screensBlock() {
  const order = [...new Set(frames.map((s) => s.screen))];
  const perScreen = table(['Screen', 'Screen id', 'Purpose', 'App screen / navigation location', 'Frames (S-number state)'],
    order.map((id) => [screens[id].name, `\`${id}\``, screens[id].purpose || '—', locationOf(spec, id),
      frames.filter((s) => s.screen === id).map((s) => `${s.sid} ${stateName(s)}`).join(' · ')]));
  const perFrame = table(['S-number', 'Screen', 'State', 'Entry condition', 'Reached from'],
    frames.map((s) => {
      const j = journeys.find((x) => (x.screens || []).includes(s));
      const from = (j.flows || []).filter((f) => f.to === s.id && byId.has(f.from)).map((f) => `${byId.get(f.from).sid} (${f.label || 'no label'})`);
      return [s.sid, screenName(spec, s), stateName(s), s.entry || '—', from.join(', ') || (j.screens[0] === s ? 'start of the journey' : '—')];
    }));
  return `${perScreen}\n\n${perFrame}`;
}

function transitionsBlock() {
  return table(['Journey', 'From', 'User action', 'Next screen (transition target)'],
    journeys.flatMap((j) => (j.flows || []).filter((f) => byId.has(f.from) && byId.has(f.to))
      .map((f) => [j.title || j.id, frameLabel(spec, byId.get(f.from)), f.label || '—', frameLabel(spec, byId.get(f.to))])));
}

function pagesBlock() {
  if (!diagram) return '_No `flow.drawio` yet: run sketch.mjs, then this script again._';
  const rows = journeys.filter((j) => (j.screens || []).length).map((j) => {
    const own = diagram.pages.filter((p) => p.id === `flow-${j.id}` || p.id === `map-${j.id}` || (p.id.startsWith('page-') && j.screens.some((s) => p.id === `page-${s.id}`)));
    const overview = own.filter((p) => !p.id.startsWith('page-')).map((p) => `"${p.name}" (${p.id.startsWith('map-') ? 'map' : 'wireflow'})`);
    const perScreen = own.filter((p) => p.id.startsWith('page-'));
    const desc = [...overview, perScreen.length ? `${perScreen.length} screen pages, "${perScreen[0].name}" … "${perScreen[perScreen.length - 1].name}"` : null].filter(Boolean).join('; ');
    return [j.title || j.id, desc || '—', `${j.screens[0].sid}–${j.screens[j.screens.length - 1].sid}`];
  });
  return table(['Journey', 'Pages in `flow.drawio`', 'Screens'], rows);
}

const BLOCKS = { screens: screensBlock, transitions: transitionsBlock, pages: pagesBlock };
const blockRe = (name) => new RegExp(`(<!-- generated:${name}\\b[^>]*-->)([\\s\\S]*?)(<!-- /generated:${name} -->)`);
const wanted = Object.fromEntries(Object.entries(BLOCKS).map(([k, f]) => [k, `\n${f()}\n`]));

// ---------- checks ----------
function check(text) {
  const errors = [], warnings = [];
  const fix = `Carry any hand edits into flow.json, then run sketch.mjs (with --force if the diagram was edited by hand) and handoff.mjs again.`;
  // 1. The diagram: every S-number names the screen flow.json gives it.
  if (!diagram) errors.push(`${rel(drawioFile)} doesn't exist. Run sketch.mjs first.`);
  else if (!diagram.shapes.length) errors.push(`${rel(drawioFile)} carries no screen data: it was drawn by an older sketch.mjs or from a flow.json without "appScreens". Run sketch.mjs again.`);
  else {
    const seen = new Set();
    for (const d of diagram.shapes) {
      const s = bySid.get(d.sid);
      if (!s) { errors.push(`${rel(drawioFile)} has a frame ${d.sid} ("${d.screenName}"), but flow.json has only ${frames.length} frames. The diagram is out of date. ${fix}`); continue; }
      seen.add(d.sid);
      const want = screenName(spec, s);
      if (d.screen !== s.screen || d.screenName !== want) errors.push(`${d.sid}: flow.drawio names it "${d.screenName}" (screen "${d.screen}"), but flow.json says "${want}" (screen "${s.screen}", frame "${s.id}"). ${fix}`);
      else if (d.state !== s.state) errors.push(`${d.sid} (${want}): flow.drawio shows state "${d.state}", but flow.json says "${s.state}". ${fix}`);
    }
    for (const s of frames) if (!seen.has(s.sid)) errors.push(`${s.sid} (${frameTitle(spec, s)}) isn't in ${rel(drawioFile)}. ${fix}`);
    for (const p of diagram.pages) {
      const m = p.name.match(/^(S\d+) /);
      if (m && bySid.has(m[1]) && p.name !== `${m[1]} ${frameTitle(spec, bySid.get(m[1]))}`) errors.push(`flow.drawio page "${p.name}" should be "${m[1]} ${frameTitle(spec, bySid.get(m[1]))}". ${fix}`);
    }
  }
  if (text == null) return { errors, warnings };
  // 2. The handoff's generated blocks: present and current, with the exact rows that differ.
  for (const [name, body] of Object.entries(wanted)) {
    const m = text.match(blockRe(name));
    if (!m) { errors.push(`${rel(handoffFile)} has no "generated:${name}" block. Add the two marker lines from assets/templates/HANDOFF.md (section ${{ screens: 3, transitions: 4, pages: 12 }[name]}), then run handoff.mjs.`); continue; }
    if (m[2] === body) continue;
    if (name === 'screens') {
      for (const row of m[2].split('\n')) {
        const r = row.match(/^\|\s*(S\d+)\s*\|\s*([^|]*?)\s*\|/);
        if (!r) continue;
        const s = bySid.get(r[1]);
        if (!s) errors.push(`${rel(handoffFile)} lists ${r[1]}, which flow.json doesn't have.`);
        else if (r[2] !== screenName(spec, s)) errors.push(`${r[1]}: HANDOFF.md names it "${r[2]}", but flow.json and flow.drawio say "${screenName(spec, s)}" (state: ${stateName(s)}${s.entry ? `; entry: ${s.entry}` : ''}). Run handoff.mjs to regenerate the inventory.`);
      }
    }
    errors.push(`${rel(handoffFile)}: the "generated:${name}" block is out of date or was edited by hand. Run handoff.mjs to regenerate it; put notes outside the markers.`);
  }
  // 3. Prose outside the blocks: "S4 · <name>" must start with S4's screen name.
  const outside = Object.keys(wanted).reduce((t, name) => t.replace(blockRe(name), (_, a, body, b) => `${a}${body.replace(/[^\n]/g, ' ')}${b}`), text);
  outside.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/\b(S\d+) · ([^|\n]+)/g)) {
      const s = bySid.get(m[1]);
      if (!s) { errors.push(`${rel(handoffFile)}:${i + 1}: ${m[1]} doesn't exist (flow.json has S1–S${frames.length}).`); continue; }
      const name = screenName(spec, s);
      if (!m[2].trim().startsWith(name)) errors.push(`${rel(handoffFile)}:${i + 1}: "${m[1]} · ${m[2].trim()}" — ${m[1]} is "${frameTitle(spec, s)}". Write "${m[1]} · ${frameTitle(spec, s)}"; an entry condition such as "${s.entry || 'First launch'}" goes after it, not in its place.`);
    }
    if (/^\|.*\|\s*Destination\s*\|/.test(line) || /^\|\s*Destination\s*\|/.test(line)) warnings.push(`${rel(handoffFile)}:${i + 1}: a "Destination" column is ambiguous (the screen's own place, or where an action leads?). Use "App screen / navigation location" for the first; transition targets are in the Transitions table.`);
  });
  return { errors, warnings };
}

// ---------- run ----------
let text = fs.existsSync(handoffFile) ? fs.readFileSync(handoffFile, 'utf8') : null;
if (!flag('check')) {
  if (text == null) {
    const template = fs.readFileSync(path.join(here, '..', 'assets', 'templates', 'HANDOFF.md'), 'utf8');
    text = fillReferences(template.replaceAll('{{APP_NAME}}', spec.app || 'App'), path.dirname(handoffFile));
    console.log(`  created ${rel(handoffFile)} from the template: fill in every section outside the generated blocks`);
  }
  const missing = Object.keys(wanted).filter((name) => !blockRe(name).test(text));
  if (missing.length) die(`${rel(handoffFile)} has no ${missing.map((n) => `"generated:${n}"`).join(', ')} block(s). Add their marker lines where assets/templates/HANDOFF.md has them (an older handoff: section 3 replaces its inventory table, section 4 gets "Transitions", section 12 the pages), then run this again. Nothing was written.`);
  for (const [name, body] of Object.entries(wanted)) text = text.replace(blockRe(name), (_, a, __, b) => `${a}${body}${b}`);
  fs.mkdirSync(path.dirname(handoffFile), { recursive: true });
  fs.writeFileSync(handoffFile, text);
  console.log(`✓ ${rel(handoffFile)}: screen inventory (${frames.length} frames of ${Object.keys(screens).length} screens), transitions and pages generated from ${rel(specFile)}`);
}
const { errors, warnings } = check(text);
for (const w of warnings) console.log(`! ${w}`);
if (errors.length) { for (const e of errors) console.error(`✗ ${e}`); process.exit(1); }
console.log(`✓ every S-number names the same screen in ${rel(specFile)}, ${rel(drawioFile)}${text == null ? '' : ` and ${rel(handoffFile)}`}`);
