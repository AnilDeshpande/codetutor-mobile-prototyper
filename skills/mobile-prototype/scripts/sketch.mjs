#!/usr/bin/env node
// Turn the flow spec (prototype/flow.json) into a hand-drawn-style draw.io file: one numbered
// frame per screen state (S1, S2, … in flow order) and one arrow per transition, each on its own
// route so no two lines lie on top of each other.
//
//   node sketch.mjs [--spec prototype/flow.json] [--out prototype/flow.drawio]
//                   [--style wireflow|click-through|both] [--check] [--open] [--url] [--force]
//
//   wireflow       one page per journey: every frame and arrow at a glance (default)
//   click-through  per journey a map page, plus one page per screen whose controls jump to the
//                  next screen
//   both           the wireflow pages, plus the per-screen pages
//   --check        validate the spec and the routing only; writes nothing (exit 1 on errors)
//   --open         open the result: draw.io Desktop if installed, otherwise the browser viewer
//   --url          also write <out>.url.txt, a link that opens the diagram in the browser viewer
//   --force        overwrite a diagram that was edited by hand since it was generated (a .bak
//                  copy is kept)
//
// The spec is the source of truth: change flow.json and run this again. Format and element list:
// references/sketch-spec.md.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const flag = (n) => args.includes(`--${n}`);
if (flag('help') || flag('h')) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 21).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const specFile = path.resolve(opt('spec', 'prototype/flow.json'));
const outFile = path.resolve(opt('out', path.join(path.dirname(specFile), 'flow.drawio')));
const style = opt('style', 'wireflow');
const rel = (p) => { const r = path.relative(process.cwd(), p) || '.'; return r.startsWith('..') ? p : r; };
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };
if (!['wireflow', 'click-through', 'both'].includes(style)) die(`--style takes wireflow, click-through or both (got "${style}")`);
if (!fs.existsSync(specFile)) die(`No spec at ${rel(specFile)}. Create it from assets/templates/flow.json (format: references/sketch-spec.md).`);
let spec;
try { spec = JSON.parse(fs.readFileSync(specFile, 'utf8')); } catch (e) { die(`${rel(specFile)} is not valid JSON: ${e.message}`); }

// ---------- validation ----------
const errors = [], warnings = [];
const ELEMENTS = ['bar', 'heading', 'text', 'field', 'button', 'list', 'card', 'switch', 'chips', 'image', 'banner', 'snackbar', 'dialog', 'sheet', 'loading', 'empty', 'error', 'fab', 'gap'];
const journeys = Array.isArray(spec.journeys) ? spec.journeys : [];
if (!journeys.length) errors.push('The spec has no journeys.');
const tabs = Array.isArray(spec.tabs) ? spec.tabs : [];
const seenIds = new Set(), seenStates = new Set();
let counter = 0;

/** Every control a frame offers, by key (buttons, list items, dialog actions …). */
function keysOf(screen) {
  const keys = [];
  for (const el of screen.elements || []) {
    if (el.key) keys.push(el.key);
    for (const it of el.items || []) if (it && it.key) keys.push(it.key);
    for (const a of el.actions || []) if (a && a.key) keys.push(a.key);
    if (el.action && el.action.key) keys.push(el.action.key);
  }
  return keys;
}

for (const j of journeys) {
  const where = `journey "${j.id || '?'}"`;
  if (!j.id) errors.push('A journey has no id.');
  if (!Array.isArray(j.screens) || !j.screens.length) { errors.push(`${where} has no screens.`); continue; }
  const local = new Map();
  for (const s of j.screens) {
    if (!s.id) { errors.push(`${where}: a screen has no id.`); continue; }
    if (seenIds.has(s.id)) errors.push(`Screen id "${s.id}" is used twice; ids must be unique in the file.`);
    seenIds.add(s.id);
    if (!s.screen || !s.state) errors.push(`${s.id}: give "screen" (the screen it belongs to) and "state" (e.g. content, empty, error).`);
    const ss = `${s.screen}/${s.state}`;
    if (seenStates.has(ss)) errors.push(`${s.id}: screen "${s.screen}" already has a frame for state "${s.state}".`);
    seenStates.add(ss);
    for (const el of s.elements || []) if (!ELEMENTS.includes(el.type)) errors.push(`${s.id}: unknown element type "${el.type}" (known: ${ELEMENTS.join(', ')}).`);
    s.sid = `S${++counter}`;
    local.set(s.id, s);
  }
  const cells = new Map();
  for (const s of j.screens) {
    if (s.below && !local.has(s.below)) errors.push(`${s.id}: "below" points to "${s.below}", which is not a screen of ${where}.`);
  }
  // Grid position: the main path is row 0; a branch sits one row under the screen it names.
  const main = j.screens.filter((s) => !s.below);
  const place = (s, seen = new Set()) => {
    if (s.col != null) return;
    if (!s.below || !local.has(s.below) || seen.has(s.id)) { s.col = Math.max(0, main.indexOf(s)); s.row = 0; return; }
    seen.add(s.id);
    const parent = local.get(s.below);
    place(parent, seen);
    s.col = parent.col; s.row = parent.row + 1;
    while (cells.has(`${s.col}:${s.row}`)) s.row += 1; // a second branch under the same screen goes one row further down
  };
  for (const s of j.screens) {
    place(s);
    const taken = cells.get(`${s.col}:${s.row}`);
    if (taken) errors.push(`${s.id} and ${taken} are at the same place (column ${s.col}, row ${s.row}) and would be drawn on top of each other. Remove "col"/"row" from one of them or change "below".`);
    cells.set(`${s.col}:${s.row}`, s.id);
  }
  const incoming = new Set();
  for (const f of j.flows || []) {
    const tag = `${where}: flow ${f.from || '?'} → ${f.to || '?'}`;
    if (!local.has(f.from)) { errors.push(`${tag}: "from" is not a screen of this journey.`); continue; }
    if (!local.has(f.to)) { errors.push(`${tag}: "to" is not a screen of this journey.`); continue; }
    if (f.from === f.to) { errors.push(`${tag}: a flow can't go to the same frame. Show the result as another state (a new frame).`); continue; }
    if (!f.label) warnings.push(`${tag}: no label. Say what the user does, e.g. "tap Save".`);
    if (f.key && !keysOf(local.get(f.from)).includes(f.key)) warnings.push(`${tag}: no control with key "${f.key}" on ${f.from}; the arrow starts at the frame edge.`);
    incoming.add(f.to);
  }
  for (const s of j.screens.slice(1)) if (!incoming.has(s.id)) warnings.push(`${s.id} (${s.sid}): nothing leads here. Add a flow or remove the frame.`);
}
for (const t of tabs) if (!t.screen || !t.label) errors.push('Each entry in "tabs" needs a label and a screen.');

// ---------- drawing primitives ----------
const FONT = 'fontFamily=Architects Daughter;fontSource=https%3A%2F%2Ffonts.googleapis.com%2Fcss%3Ffamily%3DArchitects%2BDaughter;';
const SK = `sketch=1;curveFitting=1;jiggle=2;hachureGap=4;${FONT}html=1;whiteSpace=wrap;`;
const BLUE = '#1e5aa8', RED = '#c0392b';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '&lt;br&gt;');
const bold = (s) => `\u0001${s}\u0002`; // markers survive esc(); turned into <b> when the page is assembled
let n = 0;
const nid = (p) => `${p}-${++n}`;
const r3 = (v) => Math.round(v * 1000) / 1000;
const vertex = (id, value, st, x, y, w, h, parent = '1', link = null) => {
  const cell = `<mxCell${link ? '' : ` id="${id}" value="${esc(value)}"`} style="${st}" vertex="1" parent="${parent}"><mxGeometry x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(w)}" height="${Math.round(h)}" as="geometry"/></mxCell>`;
  return link ? `<UserObject id="${id}" label="${esc(value)}" link="${link}">${cell}</UserObject>` : cell;
};
const edgeXml = (e) => {
  const ends = `exitX=${r3(e.exit[0])};exitY=${r3(e.exit[1])};exitDx=0;exitDy=0;entryX=${r3(e.entry[0])};entryY=${r3(e.entry[1])};entryDx=0;entryDy=0;`;
  const pts = e.points.length ? `<Array as="points">${e.points.map(([x, y]) => `<mxPoint x="${Math.round(x)}" y="${Math.round(y)}"/>`).join('')}</Array>` : '';
  return `<mxCell id="${nid('e')}" value="${esc(e.label || '')}" style="${SK}edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=block;endFill=1;strokeWidth=2;strokeColor=${BLUE};fontColor=${BLUE};fontSize=13;labelBackgroundColor=#ffffff;whiteSpace=nowrap;${ends}" edge="1" parent="1" source="${e.src}" target="${e.dst}"><mxGeometry relative="1" as="geometry">${pts}</mxGeometry></mxCell>`;
};
const page = (id, name, cells) =>
  `<diagram id="${id}" name="${esc(name)}"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>\n${cells.join('\n').replace(/\u0001/g, '&lt;b&gt;').replace(/\u0002/g, '&lt;/b&gt;')}\n</root></mxGraphModel></diagram>`;
const headerCell = (text, w) => vertex(nid('h'), text, `${SK}text;align=left;fontSize=20;fontStyle=1;strokeColor=none;fillColor=none;`, 140, 0, w, 34);
const label = (s) => `${s.sid} · ${s.title || `${s.screen} · ${s.state}`}`;

// ---------- one phone frame ----------
const FW = 230, HEAD = 32, PAD = 14, MINH = 400;
const lines = (text, w, px = 7) => String(text ?? '').split('\n').reduce((a, l) => a + Math.max(1, Math.ceil((l.length * px) / w)), 0);
const isOverlay = (s) => !!s.overlay || (s.elements || []).some((e) => e.type === 'dialog' || e.type === 'sheet');
const isTab = (s) => tabs.some((t) => t.screen === s.screen);

/** Lays out a frame's elements. Returns boxes relative to the frame, and the height they need. */
function measure(s) {
  const flow = [], bottom = []; // bottom: stacked upwards from the frame's bottom edge
  let cy = HEAD + 12;
  const box = (text, st, h, { inset = PAD, key, x, w } = {}) => {
    flow.push({ text, st, x: x ?? inset, y: cy, w: w ?? FW - inset * 2, h, key });
    cy += h + 8;
  };
  const T = 'text;strokeColor=none;fillColor=none;';
  const button = (text, variant, key) => box(text, {
    primary: `rounded=1;arcSize=40;fontSize=13;fontStyle=1;fillColor=#dbe9ff;fillStyle=solid;strokeColor=${BLUE};`,
    secondary: `rounded=1;arcSize=40;fontSize=13;fillColor=#ffffff;strokeColor=${BLUE};`,
    text: `${T}fontSize=13;fontStyle=1;fontColor=${BLUE};`,
    danger: `rounded=1;arcSize=40;fontSize=13;fontStyle=1;fillColor=#ffffff;strokeColor=${RED};fontColor=${RED};`,
  }[variant] || '', 34, { inset: 34, key });
  for (const el of s.elements || []) {
    const inner = FW - PAD * 2;
    switch (el.type) {
      case 'gap': cy += el.size ?? 20; break;
      case 'bar': box(`${el.back ? '←  ' : ''}${el.text || ''}`, `${T}align=left;fontSize=16;fontStyle=1;`, 28, { key: el.key }); break;
      case 'heading': box(el.text, `${T}align=left;fontSize=14;fontStyle=1;`, 22 * lines(el.text, inner, 8)); break;
      case 'text': box(el.text, `${T}align=${el.align || 'left'};fontSize=12;`, 8 + 17 * lines(el.text, inner)); break;
      case 'field': {
        box(`${el.label || ''}${el.value ? `:  ${el.value}` : ''}`, `rounded=0;align=left;spacingLeft=8;fontSize=12;fontColor=#555555;fillColor=#ffffff;${el.error ? `strokeColor=${RED};strokeWidth=2;` : ''}`, 32, { key: el.key });
        if (el.error || el.helper) { cy -= 6; box(el.error || el.helper, `${T}align=left;fontSize=11;fontColor=${el.error ? RED : '#777777'};`, 6 + 14 * lines(el.error || el.helper, inner, 6)); }
        break;
      }
      case 'button': button(el.text, el.variant || 'primary', el.key); break;
      case 'list':
        for (const it of el.items || []) box(`${it.text || ''}${it.detail ? `\n${it.detail}` : ''}`, 'rounded=0;align=left;spacingLeft=8;fontSize=12;fillColor=#ffffff;', it.detail ? 44 : 32, { key: it.key }), (cy -= 8);
        cy += 8; break;
      case 'card': box(el.text, 'rounded=1;align=left;verticalAlign=top;spacing=8;fontSize=12;fillColor=#ffffff;', 20 + 17 * lines(el.text, inner - 16), { key: el.key }); break;
      case 'switch': box(`${el.text || ''}   ${el.on ? '[ on ]' : '[ off ]'}`, 'rounded=0;align=left;spacingLeft=8;fontSize=12;fillColor=#ffffff;', 32, { key: el.key }); break;
      case 'chips': box((el.items || []).map((c) => (c === el.active ? `[ ${c} ]` : c)).join('   '), `${T}align=left;fontSize=12;`, 24, { key: el.key }); break;
      case 'image': box(`image: ${el.text || ''}`, 'shape=mxgraph.basic.rect;rounded=0;fontSize=11;fontColor=#777777;fillColor=#f5f5f5;dashed=1;', el.size ?? 80); break;
      case 'banner': box(el.text, 'rounded=0;align=left;spacingLeft=8;fontSize=12;fillColor=#fff8c4;', 12 + 17 * lines(el.text, inner - 8)); break;
      case 'loading': cy += 30; box(el.text || 'Loading…', `${T}fontSize=12;fontColor=#777777;`, 24); break;
      case 'empty': case 'error':
        cy += 24;
        box(`${el.type === 'error' ? '⚠  ' : ''}${el.title || ''}`, `${T}fontSize=14;fontStyle=1;${el.type === 'error' ? `fontColor=${RED};` : ''}`, 22 * lines(el.title, inner, 8));
        if (el.text) box(el.text, `${T}fontSize=12;`, 8 + 17 * lines(el.text, inner));
        if (el.action) button(el.action.text, el.type === 'error' ? 'secondary' : 'primary', el.action.key);
        break;
      case 'dialog': {
        cy = Math.max(cy, HEAD + 80);
        const body = `${bold(el.title || '')}${el.text ? `\n${el.text}` : ''}`;
        box(body, 'rounded=1;fontSize=12;fillColor=#ffffff;strokeWidth=2;spacing=8;', 26 + 17 * (lines(el.title, inner - 16, 8) + (el.text ? lines(el.text, inner - 16) : 0)));
        for (const a of el.actions || []) button(a.text, a.variant || 'secondary', a.key);
        break;
      }
      case 'sheet': {
        const items = el.items || [];
        bottom.push({ kind: 'sheet', text: bold(el.title || ''), st: 'rounded=1;arcSize=6;align=left;verticalAlign=top;spacing=8;fontSize=12;fillColor=#ffffff;strokeWidth=2;', h: 40 + items.length * 34, items });
        break;
      }
      case 'snackbar': bottom.push({ kind: 'snackbar', text: `${el.text || ''}${el.action ? `     ${el.action}` : ''}`, st: 'rounded=1;fontSize=12;fillColor=#333333;fillStyle=solid;fontColor=#ffffff;', h: 30, inset: PAD }); break;
      case 'fab': bottom.push({ kind: 'fab', text: el.text || '+', st: `rounded=1;arcSize=40;fontSize=13;fontStyle=1;fillColor=#dbe9ff;fillStyle=solid;strokeColor=${BLUE};`, h: 38, key: el.key, w: Math.max(56, 24 + String(el.text || '+').length * 8) }); break;
      default: break;
    }
  }
  // A remark for the reader (a platform difference, an open point): a yellow note on the frame.
  if (s.note) { cy += 6; box(s.note, 'shape=note;size=10;align=left;verticalAlign=top;spacing=6;fontSize=11;fillColor=#fff8c4;', 16 + 15 * lines(s.note, FW - PAD * 2 - 12, 6)); }
  if (isTab(s)) bottom.unshift({ kind: 'tabs', text: tabs.map((t) => (t.screen === s.screen ? bold(t.label) : t.label)).join('   |   '), st: 'rounded=0;fontSize=12;fillColor=#ffffff;', h: 36, inset: 0 });
  const bottomH = bottom.reduce((a, b) => a + b.h + 8, 0);
  return { flow, bottom, need: cy + bottomH + 10 };
}

/** Emits a frame at (x, y) with height H. Returns its cell id and its controls ({ key: { id, cy } }). */
function frame(s, m, x, y, H, linkFor = () => null) {
  const out = [], ctl = {};
  const f = nid('f');
  out.push(vertex(f, label(s), `${SK}swimlane;startSize=${HEAD};rounded=1;arcSize=8;container=1;collapsible=0;strokeWidth=2;align=left;spacingLeft=10;fontSize=13;fontStyle=1;fillColor=#ffffff;swimlaneFillColor=${isOverlay(s) ? '#ececec' : '#ffffff'};`, x, y, FW, H));
  const put = (b, bx, by, bw) => {
    const id = nid('c');
    out.push(vertex(id, b.text, SK + b.st, bx, by, bw, b.h, f, b.key ? linkFor(b.key) : null));
    if (b.key) ctl[b.key] = { id, cy: by + b.h / 2 };
  };
  for (const b of m.flow) put(b, b.x, b.y, b.w);
  let by = H - 8;
  for (const b of m.bottom) {
    by -= b.h;
    if (b.kind === 'fab') put(b, FW - PAD - b.w, by, b.w);
    else if (b.kind === 'sheet') {
      put({ ...b, key: null }, 6, by, FW - 12);
      b.items.forEach((it, i) => put({ text: it.text, st: 'rounded=0;align=left;spacingLeft=8;fontSize=12;fillColor=#ffffff;', h: 30, key: it.key }, PAD, by + 34 + i * 34, FW - PAD * 2));
    } else put(b, b.inset ?? PAD, by, FW - (b.inset ?? PAD) * 2);
    by -= 8;
  }
  return { xml: out, id: f, ctl };
}

// ---------- arrows that never share a line ----------
// Nodes sit on a grid. An arrow to the next column goes straight across; an arrow to the node
// directly above or below goes straight up or down; every other arrow leaves sideways, runs in a
// free lane between the rows, and enters the target from above or below. Lanes, side tracks and
// entry points are handed out one per arrow, so two arrows never overlap.
function routeEdges(nodes, flows) {
  const count = {}, used = {};
  const inc = (k) => (count[k] = (count[k] || 0) + 1) - 1;
  const FR = [0.2, 0.8, 0.5, 0.35, 0.65, 0.1, 0.9, 0.28, 0.72, 0.42, 0.58];
  const FRY = [0.5, 0.28, 0.72, 0.15, 0.85, 0.4, 0.6]; // on the left and right edges, start in the middle
  const slot = (...edges) => {
    const f = (/:[LR]$/.test(edges[0]) ? FRY : FR).find((v) => edges.every((e) => !(used[e] || (used[e] = new Set())).has(v))) ?? 0.5;
    for (const e of edges) (used[e] || (used[e] = new Set())).add(f);
    return f;
  };
  const kind = (f) => {
    const a = nodes[f.from], b = nodes[f.to];
    if (a.row === b.row && b.col === a.col + 1) return 'next';
    if (a.col === b.col && Math.abs(a.row - b.row) === 1) return 'vertical';
    return 'lane';
  };
  const edges = [], straight = []; // straight: y of each "next" arrow per column gap, for the side choice
  for (const f of flows.filter((x) => kind(x) === 'next')) {
    const a = nodes[f.from], b = nodes[f.to], c = a.ctl[f.key];
    const fy = c ? c.cy / a.h : slot(`${f.from}:R`, `${f.to}:L`);
    if (c) (used[`${f.to}:L`] || (used[`${f.to}:L`] = new Set())).add(fy);
    const y = a.y + fy * a.h;
    straight.push({ gap: a.col, y });
    edges.push({ ...f, src: c ? c.id : a.id, dst: b.id, exit: c ? [1, 0.5] : [1, fy], entry: [0, fy], points: [], path: [[a.x + a.w, y], [b.x, y]] });
  }
  for (const f of flows.filter((x) => kind(x) === 'vertical')) {
    const a = nodes[f.from], b = nodes[f.to], down = b.row > a.row;
    const fx = slot(`${f.from}:${down ? 'B' : 'T'}`, `${f.to}:${down ? 'T' : 'B'}`);
    const x = a.x + fx * a.w;
    edges.push({ ...f, src: a.id, dst: b.id, exit: [fx, down ? 1 : 0], entry: [fx, down ? 0 : 1], points: [], path: [[x, down ? a.y + a.h : a.y], [x, down ? b.y : b.y + b.h]] });
  }
  for (const f of flows.filter((x) => kind(x) === 'lane')) {
    const a = nodes[f.from], b = nodes[f.to], c = a.ctl[f.key];
    // The lane: above the target's row when the target is on the same row or lower, otherwise
    // just below the target's row.
    const above = b.row >= a.row;
    const laneY = above ? b.y - 30 - 16 * inc(`h:${b.row}:above`) : b.y + b.h + 30 + 16 * inc(`h:${b.row}:below`);
    const fx = slot(`${f.to}:${above ? 'T' : 'B'}`);
    const bx = b.x + fx * b.w;
    const fyA = c ? c.cy / a.h : null;
    // Leave on the side with fewer straight arrows to cross; if equal, the side facing the target.
    const startY = a.y + (fyA ?? 0.5) * a.h;
    const crossings = (gap) => straight.filter((s) => s.gap === gap && s.y > Math.min(startY, laneY) && s.y < Math.max(startY, laneY)).length;
    const facing = b.col < a.col ? 'L' : 'R';
    const [cl, cr] = [crossings(a.col - 1), crossings(a.col)];
    const side = cl === cr ? facing : cl < cr ? 'L' : 'R';
    const fy = fyA ?? slot(`${f.from}:${side}`);
    const y0 = a.y + fy * a.h;
    const vx = side === 'R' ? a.x + a.w + 30 + 16 * inc(`v:${a.col}:R`) : a.x - 30 - 16 * inc(`v:${a.col}:L`);
    const ex = side === 'R' ? 1 : 0;
    edges.push({
      ...f, src: c ? c.id : a.id, dst: b.id, exit: c ? [ex, 0.5] : [ex, fy], entry: [fx, above ? 0 : 1],
      points: [[vx, y0], [vx, laneY], [bx, laneY]],
      path: [[side === 'R' ? a.x + a.w : a.x, y0], [vx, y0], [vx, laneY], [bx, laneY], [bx, above ? b.y : b.y + b.h]],
    });
  }
  return edges;
}

/** Segments of two different arrows that lie on the same line and overlap, and how often arrows cross. */
function lineProblems(edges) {
  const segs = [];
  edges.forEach((e, i) => { for (let k = 0; k < e.path.length - 1; k++) { const [x1, y1] = e.path[k], [x2, y2] = e.path[k + 1]; if (x1 !== x2 || y1 !== y2) segs.push({ i, h: Math.abs(y1 - y2) < 0.5, x1: Math.min(x1, x2), x2: Math.max(x1, x2), y1: Math.min(y1, y2), y2: Math.max(y1, y2), e }); } });
  let overlaps = 0, crossings = 0;
  const pairs = [];
  for (let a = 0; a < segs.length; a++) for (let b = a + 1; b < segs.length; b++) {
    const s = segs[a], t = segs[b];
    if (s.i === t.i) continue;
    if (s.h === t.h) {
      const same = s.h ? Math.abs(s.y1 - t.y1) < 6 : Math.abs(s.x1 - t.x1) < 6;
      const lap = s.h ? Math.min(s.x2, t.x2) - Math.max(s.x1, t.x1) : Math.min(s.y2, t.y2) - Math.max(s.y1, t.y1);
      if (same && lap > 4) { overlaps++; pairs.push(`${s.e.from} → ${s.e.to}  and  ${t.e.from} → ${t.e.to}`); }
    } else {
      const [hz, vt] = s.h ? [s, t] : [t, s];
      if (vt.x1 > hz.x1 + 1 && vt.x1 < hz.x2 - 1 && hz.y1 > vt.y1 + 1 && hz.y1 < vt.y2 - 1) crossings++;
    }
  }
  return { overlaps, crossings, pairs: [...new Set(pairs)] };
}

/** Arrows that run through a frame (any frame, including their own), or above the page title. */
function frameProblems(nodes, edges) {
  const hits = [];
  for (const e of edges) for (let k = 0; k < e.path.length - 1; k++) {
    const [x1, y1] = e.path[k], [x2, y2] = e.path[k + 1];
    const [l, r, t, b] = [Math.min(x1, x2), Math.max(x1, x2), Math.min(y1, y2), Math.max(y1, y2)];
    if (t < 40) hits.push(`${e.from} → ${e.to}  runs into the page title`);
    // A segment may touch a frame's border (where it starts or ends) but not enter it.
    for (const [id, n] of Object.entries(nodes)) if (r > n.x + 2 && l < n.x + n.w - 2 && b > n.y + 2 && t < n.y + n.h - 2) hits.push(`${e.from} → ${e.to}  runs through ${id}`);
  }
  return [...new Set(hits)];
}

// ---------- pages ----------
const pages = [];
const stats = { frames: 0, arrows: 0, overlaps: 0, crossings: 0, pairs: [], hits: [] };
const pid = (id) => `page-${id}`;
const link = (id) => `data:page/id,${pid(id)}`;
const GAPX = 240, GAPY = 190, LEFT = 140;

function grid(j, w, h, gapx, gapy, top) {
  return (s) => ({ col: s.col, row: s.row, x: LEFT + s.col * (w + gapx), y: top + s.row * (h + gapy), w, h });
}
/** How many arrows run in the lanes above the first row: that much room is kept under the title. */
function lanesAbove(j) {
  const at = Object.fromEntries(j.screens.map((s) => [s.id, s]));
  return Math.max(1, (j.flows || []).filter((f) => at[f.from].row === 0 && at[f.to].row === 0 && at[f.to].col !== at[f.from].col + 1).length);
}
function addProblems(nodes, edges) {
  const p = lineProblems(edges);
  stats.overlaps += p.overlaps; stats.crossings += p.crossings; stats.pairs.push(...p.pairs); stats.arrows += edges.length;
  stats.hits.push(...frameProblems(nodes, edges));
}

function wireflowPage(j, withLinks) {
  const measured = new Map(j.screens.map((s) => [s.id, measure(s)]));
  const H = Math.max(MINH, ...[...measured.values()].map((m) => m.need));
  const top = 80 + lanesAbove(j) * 16 + 30;
  const at = grid(j, FW, H, GAPX, GAPY, top);
  const cells = [], nodes = {};
  for (const s of j.screens) {
    const g = at(s);
    const go = Object.fromEntries((j.flows || []).filter((f) => f.from === s.id && f.key).map((f) => [f.key, f.to]));
    const d = frame(s, measured.get(s.id), g.x, g.y, H, withLinks ? (key) => (go[key] ? link(go[key]) : null) : undefined);
    nodes[s.id] = { ...g, id: d.id, ctl: d.ctl };
    cells.push(...d.xml);
    stats.frames++;
  }
  const edges = routeEdges(nodes, j.flows || []);
  addProblems(nodes, edges);
  const width = LEFT + (Math.max(...j.screens.map((s) => s.col)) + 1) * (FW + GAPX);
  cells.unshift(headerCell(`${j.title || j.id} — ${j.screens[0].sid} to ${j.screens[j.screens.length - 1].sid}, in flow order.  Grey frames are overlays on the screen before them.`, Math.max(900, width)));
  cells.push(...edges.map(edgeXml));
  return page(`flow-${j.id}`, j.title || j.id, cells);
}

function mapPage(j) {
  const BW = 210, BH = 84;
  const at = grid(j, BW, BH, 130, 150, 80 + lanesAbove(j) * 16 + 30);
  const cells = [], nodes = {};
  for (const s of j.screens) {
    const g = at(s), id = nid('m');
    cells.push(vertex(id, `${bold(s.sid)}\n${s.title || `${s.screen} · ${s.state}`}`, `${SK}rounded=1;fontSize=13;fillColor=${isOverlay(s) ? '#ececec' : '#ffffff'};strokeWidth=2;`, g.x, g.y, BW, BH, '1', link(s.id)));
    nodes[s.id] = { ...g, id, ctl: {} };
  }
  const edges = routeEdges(nodes, j.flows || []);
  addProblems(nodes, edges);
  cells.unshift(headerCell(`${j.title || j.id} — map.  Click a box to open that screen; inside a screen, click the blue controls.`, 1400));
  cells.push(...edges.map(edgeXml));
  return page(`map-${j.id}`, `Map · ${j.title || j.id}`, cells);
}

function screenPages(j, home) {
  return j.screens.map((s) => {
    const m = measure(s);
    const flowsOut = (j.flows || []).filter((f) => f.from === s.id);
    const go = Object.fromEntries(flowsOut.filter((f) => f.key).map((f) => [f.key, f.to]));
    const d = frame(s, m, 60, 60, Math.max(MINH, m.need), (key) => (go[key] ? link(go[key]) : null));
    const byId = Object.fromEntries(j.screens.map((x) => [x.id, x]));
    const notes = flowsOut.map((f) => `• ${String(f.label || '').replace(/\n/g, ' ')}  →  ${label(byId[f.to])}`).join('\n') || '• nothing: this is an end of the journey';
    const cells = [...d.xml,
      vertex(nid('n'), `From ${s.sid} you can\n${notes}`, `${SK}shape=note;size=14;align=left;verticalAlign=top;spacing=10;fontSize=13;fillColor=#fff8c4;`, 340, 60, 400, 60 + 22 * Math.max(1, flowsOut.length)),
      vertex(nid('b'), '↩ Back to the overview', `${SK}rounded=1;fontSize=12;fillColor=#ffffff;`, 340, 140 + 22 * Math.max(1, flowsOut.length), 170, 32, '1', `data:page/id,${home}`)];
    if (style === 'click-through') stats.frames++;
    return page(pid(s.id), `${s.sid} ${s.title || s.screen}`, cells);
  });
}

if (!errors.length) {
  for (const j of journeys) {
    if (style === 'wireflow') pages.push(wireflowPage(j, false));
    else if (style === 'both') pages.push(wireflowPage(j, true), ...screenPages(j, `flow-${j.id}`));
    else pages.push(mapPage(j), ...screenPages(j, `map-${j.id}`));
  }
  if (stats.overlaps) errors.push(`${stats.overlaps} arrow segment(s) lie on top of each other:\n    ${stats.pairs.join('\n    ')}\n  Move one of the screens (change "below" or the order) or split the journey.`);
  if (stats.hits.length) errors.push(`${stats.hits.length} arrow(s) would be drawn over a screen:\n    ${stats.hits.join('\n    ')}\n  Too many arrows share one gap. Move a screen (change "below" or the order) or split the journey.`);
}

// ---------- report, write, open ----------
for (const w of warnings) console.log(`! ${w}`);
if (errors.length) { for (const e of errors) console.error(`✗ ${e}`); process.exit(1); }
const summary = `${journeys.length} journey(s), ${counter} screen frame(s), ${stats.arrows} arrow(s); no overlapping lines, no line over a screen, ${stats.crossings} crossing(s)`;
if (flag('check')) { console.log(`✓ ${rel(specFile)}: ${summary}`); process.exit(0); }

const xml = `<mxfile host="app.diagrams.net" agent="mobile-prototype sketch">\n${pages.join('\n')}\n</mxfile>\n`;
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const stamp = path.join(path.dirname(outFile), `.${path.basename(outFile)}.sha256`);
if (fs.existsSync(outFile)) {
  const current = fs.readFileSync(outFile, 'utf8');
  const generated = fs.existsSync(stamp) ? fs.readFileSync(stamp, 'utf8').trim() : null;
  if (generated !== sha(current)) {
    if (!flag('force')) die(`${rel(outFile)} was changed by hand since it was generated (or wasn't made by this script).\n  Carry those changes into ${rel(specFile)} first, then run again with --force. Nothing was written.`);
    fs.copyFileSync(outFile, `${outFile}.bak`);
    console.log(`  kept the hand-edited version as ${rel(`${outFile}.bak`)}`);
  }
}
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, xml);
fs.writeFileSync(stamp, `${sha(xml)}\n`);
console.log(`✓ ${rel(outFile)} (${style}): ${summary}`);

const viewerUrl = () => `https://viewer.diagrams.net/?nav=1&layers=1&highlight=0000ff#R${encodeURIComponent(zlib.deflateRawSync(Buffer.from(encodeURIComponent(xml))).toString('base64'))}`;
if (flag('url')) {
  const f = `${outFile}.url.txt`;
  fs.writeFileSync(f, `${viewerUrl()}\n`);
  console.log(`  viewer link: ${rel(f)} (the diagram travels in the link itself; nothing is uploaded)`);
}
if (flag('open')) {
  const mac = process.platform === 'darwin', win = process.platform === 'win32';
  const desktop = mac ? fs.existsSync('/Applications/draw.io.app') : spawnSync(win ? 'where' : 'which', ['drawio'], { stdio: 'ignore' }).status === 0;
  const run = (cmd, a) => spawnSync(cmd, a, { stdio: 'ignore', shell: win });
  if (desktop) { mac ? run('open', ['-a', 'draw.io', outFile]) : run('drawio', [outFile]); console.log('  opened in draw.io Desktop'); }
  else { run(mac ? 'open' : win ? 'start' : 'xdg-open', win ? ['""', viewerUrl()] : [viewerUrl()]); console.log('  opened in the browser viewer (draw.io Desktop not found)'); }
}
