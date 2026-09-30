#!/usr/bin/env node
// Turn the flow spec (prototype/flow.json) into a hand-drawn-style draw.io file: one numbered
// frame per screen state (S1, S2, … in flow order) and one arrow per transition. Arrows never
// lie on or cross each other or run over a screen, and labels sit clear of everything else; if
// the layout in the spec allows no such drawing, the script says what is in the way and stops.
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
  return `<mxCell id="${nid('e')}" value="${esc(e.text || '')}" style="${SK}edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=block;endFill=1;strokeWidth=2;strokeColor=${BLUE};fontColor=${BLUE};fontSize=13;labelBackgroundColor=#ffffff;whiteSpace=nowrap;${ends}" edge="1" parent="1" source="${e.src}" target="${e.dst}"><mxGeometry x="${r3(e.rel || 0)}" relative="1" as="geometry">${pts}</mxGeometry></mxCell>`;
};
const page = (id, name, cells) =>
  `<diagram id="${id}" name="${esc(name)}"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>\n${cells.join('\n').replace(/\u0001/g, '&lt;b&gt;').replace(/\u0002/g, '&lt;/b&gt;')}\n</root></mxGraphModel></diagram>`;
const headerCell = (text, w) => vertex(nid('h'), text, `${SK}text;align=left;fontSize=20;fontStyle=1;strokeColor=none;fillColor=none;`, 140, 0, w, 34);
const titleOf = (s) => s.title || `${s.screen} · ${s.state}`;
// The serial number, as a dark tag in the top-left corner of a frame or map box: easy to find
// and to refer to.
const BADGE = 46;
const badge = (s, x, y, h, parent) => vertex(nid('n'), bold(s.sid), `${SK}rounded=1;arcSize=20;fontSize=17;fillColor=#333333;fillStyle=solid;strokeColor=#333333;fontColor=#ffffff;`, x, y, BADGE, h, parent);
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
  out.push(vertex(f, titleOf(s), `${SK}swimlane;startSize=${HEAD};rounded=1;arcSize=8;container=1;collapsible=0;strokeWidth=2;align=left;spacingLeft=${BADGE + 8};fontSize=13;fontStyle=1;fillColor=#ffffff;swimlaneFillColor=${isOverlay(s) ? '#ececec' : '#ffffff'};`, x, y, FW, H));
  out.push(badge(s, 0, 0, HEAD, f));
  const put = (b, bx, by, bw) => {
    const id = nid('c');
    out.push(vertex(id, b.text, SK + b.st, bx, by, bw, b.h, f, b.key ? linkFor(b.key) : null));
    if (b.key) ctl[b.key] = { id, cy: by + b.h / 2, x0: bx, x1: bx + bw };
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

// ---------- arrows that stay out of each other's way ----------
// Nodes sit on a grid. An arrow to the next column goes straight across and an arrow to the node
// directly above or below goes straight up or down. Every other arrow is tried in each of its
// possible shapes, side tracks, lanes and end points, and keeps the one that lies on no other
// arrow, crosses none and runs over no frame. Then each label is wrapped and slid along its
// arrow until it sits clear of frames, other arrows and other labels. What can't be solved is
// reported as a problem, and the sketch is not drawn.
const OFF = 30, STEP = 16;          // first track or lane is OFF from a frame, the next ones STEP apart
const CW = 7, LH = 16;              // label text: width per character and line height at 13 px
const SLOT_X = [0.5, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6, 0.1, 0.9]; // end points along a top or bottom edge
const SLOT_Y = [0.5, 0.28, 0.72, 0.15, 0.85, 0.4, 0.6];       // end points along a left or right edge
const tracksIn = (gap) => Math.max(1, Math.floor((gap / 2 - OFF - 4) / STEP) + 1); // per side of a gap
const TITLE = 40;                   // the page title's band at the top

const segsOf = (path) => {
  const out = [];
  for (let k = 0; k < path.length - 1; k++) {
    const [x1, y1] = path[k], [x2, y2] = path[k + 1];
    if (x1 !== x2 || y1 !== y2) out.push({ k, h: Math.abs(y1 - y2) < 0.5, x1: Math.min(x1, x2), x2: Math.max(x1, x2), y1: Math.min(y1, y2), y2: Math.max(y1, y2) });
  }
  return out;
};
/** How two arrows get in each other's way: [segments on top of each other, places where they cross or touch]. */
const clash = (A, B) => {
  let over = 0, cross = 0;
  for (const s of A) for (const t of B) {
    if (s.h === t.h) {
      const same = s.h ? Math.abs(s.y1 - t.y1) < 6 : Math.abs(s.x1 - t.x1) < 6;
      const lap = s.h ? Math.min(s.x2, t.x2) - Math.max(s.x1, t.x1) : Math.min(s.y2, t.y2) - Math.max(s.y1, t.y1);
      if (same && lap > -4) over++;
    } else {
      const [hz, vt] = s.h ? [s, t] : [t, s];
      if (vt.x1 > hz.x1 - 3 && vt.x1 < hz.x2 + 3 && hz.y1 > vt.y1 - 3 && hz.y1 < vt.y2 + 3) cross++;
    }
  }
  return [over, cross];
};
const boxHits = (s, r, m) => s.x2 > r.l - m && s.x1 < r.r + m && s.y2 > r.t - m && s.y1 < r.b + m;
const wrapText = (text, max) => String(text).split('\n').map((line) => {
  const out = [''];
  for (const w of line.trim().split(/\s+/)) {
    const last = out[out.length - 1];
    if (last && last.length + 1 + w.length > max) out.push(w); else out[out.length - 1] = last ? `${last} ${w}` : w;
  }
  return out.join('\n');
}).join('\n');

function routeEdges(nodes, flows, gapx, gapy) {
  const rects = Object.entries(nodes).map(([id, n]) => ({ id, l: n.x, t: n.y, r: n.x + n.w, b: n.y + n.h }));
  const nT = tracksIn(gapx), nL = tracksIn(gapy);
  const used = {};
  const slot = (...ends) => {
    const f = (/:[LR]$/.test(ends[0]) ? SLOT_Y : [0.2, 0.8, 0.5, 0.35, 0.65]).find((v) => ends.every((e) => !(used[e] || (used[e] = new Set())).has(v))) ?? 0.5;
    for (const e of ends) (used[e] || (used[e] = new Set())).add(f);
    return f;
  };
  const kind = (f) => {
    const a = nodes[f.from], b = nodes[f.to];
    if (a.row === b.row && b.col === a.col + 1) return 'next';
    if (a.col === b.col && Math.abs(a.row - b.row) === 1) return 'vertical';
    return 'free';
  };
  /** Frames an arrow runs over (its own two only count when it goes through them), or the title. */
  const hits = (segs, f) => {
    const out = [];
    for (const s of segs) {
      if (s.y1 < TITLE) out.push('the page title');
      for (const r of rects) if (boxHits(s, r, r.id === f.from || r.id === f.to ? -2 : 8)) out.push(r.id);
    }
    return [...new Set(out)];
  };

  // Straight arrows first: they have one shape.
  const fixed = [];
  const SPREAD = { 1: [0.5], 2: [0.28, 0.72], 3: [0.2, 0.5, 0.8], 4: [0.14, 0.38, 0.62, 0.86] };
  const plain = {}; // control-less arrows to the next frame, per pair: spread evenly over the edge
  for (const f of flows.filter((x) => kind(x) === 'next' && !nodes[x.from].ctl[x.key])) (plain[f.from] || (plain[f.from] = [])).push(f);
  for (const f of flows.filter((x) => kind(x) === 'next')) {
    const a = nodes[f.from], b = nodes[f.to], c = a.ctl[f.key];
    const mine = plain[f.from] || [];
    const fy = c ? c.cy / a.h : (SPREAD[mine.length] || [])[mine.indexOf(f)] ?? slot(`${f.from}:R`, `${f.to}:L`);
    const y = a.y + fy * a.h;
    fixed.push({ ...f, src: c ? c.id : a.id, dst: b.id, exit: c ? [1, 0.5] : [1, fy], entry: [0, fy], points: [], path: [[a.x + a.w, y], [b.x, y]], lead: c ? a.w - c.x1 : 0 });
  }
  for (const f of flows.filter((x) => kind(x) === 'vertical')) {
    const a = nodes[f.from], b = nodes[f.to], down = b.row > a.row;
    const fx = slot(`${f.from}:${down ? 'B' : 'T'}`, `${f.to}:${down ? 'T' : 'B'}`);
    const x = a.x + fx * a.w;
    fixed.push({ ...f, src: a.id, dst: b.id, exit: [fx, down ? 1 : 0], entry: [fx, down ? 0 : 1], points: [], path: [[x, down ? a.y + a.h : a.y], [x, down ? b.y : b.y + b.h]], lead: 0 });
  }
  for (const e of fixed) e.segs = segsOf(e.path);

  // Every route a free arrow could take, cheapest (shortest, fewest bends) first:
  //   lane    leave sideways, up or down a track beside the source, along a lane next to the
  //           target, into its top or bottom
  //   turn    leave sideways and turn straight into the target's top or bottom
  //   over    leave through the top or bottom (only without a control), along a lane next to the
  //           source, into the target's top or bottom
  //   step    leave sideways, up or down one track, into the target's side
  //   around  leave sideways, a track beside the source, any lane, a track beside the target, into
  //           its side: the long way round, for when everything shorter is in the way
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const anyNode = Object.values(nodes)[0];
  const rowTop = (r) => anyNode.y + (r - anyNode.row) * (anyNode.h + gapy);
  const rows = Math.max(...Object.values(nodes).map((n) => n.row)) + 1;
  const laneYs = []; // every lane on the page
  for (let g = 0; g <= rows; g++) for (const ln of range(Math.min(3, nL))) {
    if (g < rows) laneYs.push([rowTop(g) - OFF - STEP * ln, ln]);
    if (g > 0) laneYs.push([rowTop(g - 1) + anyNode.h + OFF + STEP * ln, ln]);
  }
  const cache = new Map();
  const options = (f) => {
    if (cache.has(f)) return cache.get(f);
    const a = nodes[f.from], b = nodes[f.to];
    const list = [];
    // An arrow starts at the control that triggers it. Only when no clean route exists from
    // there may it start at the frame's edge instead (far more expensive, so it is a last resort).
    for (const [c, fee] of a.ctl[f.key] ? [[a.ctl[f.key], 0], [null, 5000]] : [[null, 0]]) {
    const add = (exit, entry, path, lead, extra) => {
      const segs = segsOf(path);
      for (let k = 1; k < segs.length; k++) if (segs[k].h === segs[k - 1].h) return; // it would double back
      const length = segs.reduce((n, g) => n + (g.x2 - g.x1) + (g.y2 - g.y1), 0);
      list.push({ src: c ? c.id : a.id, dst: b.id, exit, entry, points: path.slice(1, -1), path, lead, segs, bad: hits(segs, f).length, cost0: segs.length * 40 + length * 0.05 + extra + fee });
    };
    const sides = c ? [null] : range(5);              // where a control-less arrow leaves a side
    for (const sa of sides) {
      const fy = c ? c.cy / a.h : SLOT_Y[sa], y0 = a.y + fy * a.h, ex = c ? 0.5 : fy;
      // An arrow from a control leaves on the side where the control reaches the frame's edge, so
      // it doesn't run across the screen's own content.
      const near = (right) => (c ? (right ? a.w - c.x1 : c.x0) : 0);
      for (const right of [true, false].filter((r) => near(r) <= 60 || near(!r) > 60)) {
        const x0 = right ? a.x + a.w : a.x, lead = near(right), e0 = [right ? 1 : 0, ex];
        for (const tr of range(nT)) {
          const vx = right ? x0 + OFF + STEP * tr : x0 - OFF - STEP * tr;
          for (const sb of range(SLOT_X.length)) for (const top of [true, false]) for (const ln of range(nL)) {   // lane
            const bx = b.x + SLOT_X[sb] * b.w, ly = top ? b.y - OFF - STEP * ln : b.y + b.h + OFF + STEP * ln;
            add(e0, [SLOT_X[sb], top ? 0 : 1], [[x0, y0], [vx, y0], [vx, ly], [bx, ly], [bx, top ? b.y : b.y + b.h]], lead, (tr + ln) * 6 + ((sa || 0) + sb) * 2);
          }
          for (const sb of range(3)) for (const tRight of [true, false]) {
            const ty = b.y + SLOT_Y[sb] * b.h, tx = tRight ? b.x + b.w : b.x, e1 = [tRight ? 1 : 0, SLOT_Y[sb]];
            if (tRight ? vx > tx + 12 && vx < tx + gapx - 12 : vx < tx - 12 && vx > tx - gapx + 12) {                 // step
              if (Math.abs(ty - y0) > 12) add(e0, e1, [[x0, y0], [vx, y0], [vx, ty], [tx, ty]], lead, tr * 6 + ((sa || 0) + sb) * 2);
            }
            if (tr < 3 && (sa || 0) < 3) for (const t2 of range(Math.min(3, nT))) for (const [ly, ln] of laneYs) {    // around
              const vx2 = tRight ? tx + OFF + STEP * t2 : tx - OFF - STEP * t2;
              if (Math.abs(vx - vx2) < 12 || Math.abs(ly - y0) < 12 || Math.abs(ly - ty) < 12) continue;
              add(e0, e1, [[x0, y0], [vx, y0], [vx, ly], [vx2, ly], [vx2, ty], [tx, ty]], lead, (tr + t2 + ln) * 6 + ((sa || 0) + sb) * 2);
            }
          }
        }
        for (const sb of range(SLOT_X.length)) {                                                               // turn
          const bx = b.x + SLOT_X[sb] * b.w;
          if ((y0 > b.y - 12 && y0 < b.y + b.h + 12) || (right ? bx < x0 + 12 : bx > x0 - 12)) continue;
          const top = y0 < b.y;
          add(e0, [SLOT_X[sb], top ? 0 : 1], [[x0, y0], [bx, y0], [bx, top ? b.y : b.y + b.h]], lead, ((sa || 0) + sb) * 2);
        }
      }
    }
    if (!c) for (const up of [true, false]) for (const sa of range(SLOT_X.length)) for (const sb of range(SLOT_X.length)) for (const ln of range(nL)) {   // over
      const ax = a.x + SLOT_X[sa] * a.w, bx = b.x + SLOT_X[sb] * b.w, ly = up ? a.y - OFF - STEP * ln : a.y + a.h + OFF + STEP * ln;
      if ((ly > b.y - 12 && ly < b.y + b.h + 12) || Math.abs(ax - bx) < 12) continue;
      const top = ly < b.y;
      add([SLOT_X[sa], up ? 0 : 1], [SLOT_X[sb], top ? 0 : 1], [[ax, up ? a.y : a.y + a.h], [ax, ly], [bx, ly], [bx, top ? b.y : b.y + b.h]], 0, ln * 6 + (sa + sb) * 2);
    }
    }
    const clean = list.filter((o) => !o.bad);
    const out = (clean.length ? clean : list.map((o) => ({ ...o, cost0: o.cost0 + o.bad * 1e8 }))).sort((x, y) => x.cost0 - y.cost0);
    cache.set(f, out);
    return out;
  };
  /** The best route for one arrow, given the arrows already drawn. */
  const pick = (f, others) => {
    let best = null;
    for (const o of options(f)) {
      if (o.banned) continue;
      if (best && o.cost0 >= best.cost) break;
      let cost = o.cost0;
      for (const e of others) {
        const [over, cross] = clash(o.segs, e.segs);
        cost += over * 1e7 + cross * 1e5;
        if (best && cost >= best.cost) break;
      }
      if (!best || cost < best.cost) best = { ...f, ...o, cost, option: o, flow: f };
    }
    return best;
  };
  const priceOf = (e, others) => others.reduce((n, o) => { const [over, cross] = clash(e.segs, o.segs); return n + over * 1e7 + cross * 1e5; }, e.cost0);

  /** Problems left in a finished set of arrows. */
  const judge = (edges) => {
    const out = [];
    const name = (e) => `${e.from} → ${e.to}`;
    for (const e of edges) if (e.bad) for (const h of hits(e.segs, e)) out.push(`${name(e)}  runs over ${h}`);
    for (let i = 0; i < edges.length; i++) for (let k = i + 1; k < edges.length; k++) {
      const [over, cross] = clash(edges[i].segs, edges[k].segs);
      if (over) out.push(`${name(edges[i])}  and  ${name(edges[k])}  lie on top of each other`);
      if (cross) out.push(`${name(edges[i])}  and  ${name(edges[k])}  cross`);
    }
    return out;
  };

  /** Wraps each label and finds a place on its arrow that is clear of frames, arrows and labels. */
  const label = (edges) => {
    const placed = [], fails = [];
    const order = range(edges.length).sort((i, k) => edges[i].segs.length - edges[k].segs.length);
    for (const i of order) {
      const e = edges[i];
      e.text = ''; e.rel = 0;
      if (!e.label) continue;
      const total = e.lead + e.segs.reduce((n, s) => n + (s.x2 - s.x1) + (s.y2 - s.y1), 0);
      const texts = [...new Set([Infinity, 22, 16, 12, 9].map((m) => wrapText(e.label, m)))];
      const spot = () => {
        for (const text of texts) {
          const rows = text.split('\n');
          const w = Math.max(...rows.map((r) => r.length)) * CW + 10, h = rows.length * LH + 6;
          let before = e.lead;
          const hosts = e.path.slice(0, -1).map((p, k) => {
            const q = e.path[k + 1], len = Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]);
            const host = { k, p, q, len, before };
            before += len;
            return host;
          }).sort((s, t) => t.len - s.len);
          for (const s of hosts) {
            const need = s.p[1] === s.q[1] ? w : h;
            const lo = 8 + need / 2, hi = s.len - (s.k === e.path.length - 2 ? 18 : 8) - need / 2; // leave the arrowhead visible
            if (hi < lo) continue;
            for (const t of [0.5, 0.3, 0.7, 0.15, 0.85, 0, 1]) {
              const d = lo + (hi - lo) * t;
              const cx = s.p[0] + Math.sign(s.q[0] - s.p[0]) * d, cy = s.p[1] + Math.sign(s.q[1] - s.p[1]) * d;
              const box = { l: cx - w / 2, r: cx + w / 2, t: cy - h / 2, b: cy + h / 2 };
              const asSeg = { x1: box.l, x2: box.r, y1: box.t, y2: box.b };
              if (box.t < TITLE || rects.some((r) => boxHits(asSeg, r, 4)) || placed.some((r) => boxHits(asSeg, r, 4))) continue;
              if (edges.some((o, n) => o.segs.some((g) => (n !== i || g.k !== s.k) && boxHits(g, box, n === i ? 1 : 4)))) continue;
              return { text, box, rel: ((s.before + d) / total) * 2 - 1 };
            }
          }
        }
        return null;
      };
      const found = spot();
      if (found) { e.text = found.text; e.rel = found.rel; placed.push(found.box); } else fails.push({ edge: e, text: `no clear place for the label "${String(e.label).replace(/\n/g, ' ')}" on ${e.from} → ${e.to}` });
    }
    return fails;
  };

  // Place the free arrows one by one, then let each move again while that helps. If something is
  // still in the way, start over in another order; if a label found no room on its arrow, rule
  // that route out and try again.
  const free = flows.filter((x) => kind(x) === 'free');
  let seed = 20240607;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let result = null;
  const started = Date.now();
  for (let attempt = 0; attempt < 40; attempt++) {
    const order = attempt === 0 ? free : attempt === 1 ? [...free].reverse() : free.map((f) => [rnd(), f]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const at = new Map();
    const others = (f) => [...fixed, ...[...at].filter(([k]) => k !== f).map(([, v]) => v)];
    const put = (f) => { const e = pick(f, others(f)); at.set(f, e); return e; };
    for (const f of order) put(f);
    for (let round = 0; round < 8; round++) {
      let moved = false;
      for (const f of order) {
        const was = priceOf(at.get(f), others(f));
        const old = at.get(f);
        if (put(f).cost < was - 1e-6) moved = true; else at.set(f, old);
      }
      if (!moved) break;
    }
    const edges = [...fixed.map((e) => ({ ...e, bad: 0 })), ...free.map((f) => at.get(f))];
    const problems = judge(edges);
    const fails = problems.length ? [] : label(edges);
    const total = problems.length * 1000 + fails.length;
    if (!result || total < result.total) result = { total, edges: edges.map((e) => ({ ...e })), problems: [...problems, ...fails.map((x) => x.text)] };
    if (!total || !free.length || Date.now() - started > 8000) break;
    for (const x of fails) if (x.edge.option && options(x.edge.flow).filter((o) => !o.banned).length > 1) x.edge.option.banned = true;
  }
  return result;
}

// ---------- pages ----------
const pages = [];
const stats = { frames: 0, arrows: 0, problems: [] };
const pid = (id) => `page-${id}`;
const link = (id) => `data:page/id,${pid(id)}`;
const LEFT = 140;
const grid = (w, h, gapx, gapy) => (s) => ({ col: s.col, row: s.row, x: LEFT + s.col * (w + gapx), y: TITLE + 10 + OFF + STEP * (tracksIn(gapy) - 1) + s.row * (h + gapy), w, h });
function arrows(j, nodes, gapx, gapy, what) {
  const r = routeEdges(nodes, j.flows || [], gapx, gapy);
  stats.arrows += r.edges.length;
  stats.problems.push(...r.problems.map((p) => `${what} of "${j.id}": ${p}`));
  return r.edges;
}

function wireflowPage(j, withLinks) {
  const measured = new Map(j.screens.map((s) => [s.id, measure(s)]));
  const H = Math.max(MINH, ...[...measured.values()].map((m) => m.need));
  const GAPX = 240, GAPY = 190;
  const at = grid(FW, H, GAPX, GAPY);
  const cells = [], nodes = {};
  for (const s of j.screens) {
    const g = at(s);
    const go = Object.fromEntries((j.flows || []).filter((f) => f.from === s.id && f.key).map((f) => [f.key, f.to]));
    const d = frame(s, measured.get(s.id), g.x, g.y, H, withLinks ? (key) => (go[key] ? link(go[key]) : null) : undefined);
    nodes[s.id] = { ...g, id: d.id, ctl: d.ctl };
    cells.push(...d.xml);
    stats.frames++;
  }
  const edges = arrows(j, nodes, GAPX, GAPY, 'wireflow');
  const width = LEFT + (Math.max(...j.screens.map((s) => s.col)) + 1) * (FW + GAPX);
  cells.unshift(headerCell(`${j.title || j.id} — ${j.screens[0].sid} to ${j.screens[j.screens.length - 1].sid}, in flow order.  Grey frames are overlays on the screen before them.`, Math.max(900, width)));
  cells.push(...edges.map(edgeXml));
  return page(`flow-${j.id}`, j.title || j.id, cells);
}

function mapPage(j) {
  const BW = 210, BH = 96;
  const GAPX = 200, GAPY = 170;
  const at = grid(BW, BH, GAPX, GAPY);
  const cells = [], nodes = {};
  for (const s of j.screens) {
    const g = at(s), id = nid('m');
    cells.push(vertex(id, titleOf(s), `${SK}rounded=1;fontSize=13;spacingTop=18;fillColor=${isOverlay(s) ? '#ececec' : '#ffffff'};strokeWidth=2;`, g.x, g.y, BW, BH, '1', link(s.id)));
    cells.push(badge(s, g.x, g.y, 28, '1'));
    nodes[s.id] = { ...g, id, ctl: {} };
  }
  const edges = arrows(j, nodes, GAPX, GAPY, 'map');
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
  if (stats.problems.length) errors.push(`The arrows and labels can't be drawn cleanly (${stats.problems.length} problem(s)):\n    ${stats.problems.slice(0, 10).join('\n    ')}${stats.problems.length > 10 ? `\n    … and ${stats.problems.length - 10} more` : ''}\n  Change the layout in the spec: move a screen (its place in the list, or "below"), shorten a label, or split the journey in two. See references/sketch-spec.md, "When the check fails".`);
}

// ---------- report, write, open ----------
for (const w of warnings) console.log(`! ${w}`);
if (errors.length) { for (const e of errors) console.error(`✗ ${e}`); process.exit(1); }
const summary = `${journeys.length} journey(s), ${counter} screen frame(s), ${stats.arrows} arrow(s); no arrow overlaps or crosses another or runs over a screen; every label is in the clear`;
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
