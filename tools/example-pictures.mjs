#!/usr/bin/env node
// Redraw the pair-a-meter example from its flow.json and export the README's pictures of it with
// draw.io Desktop (https://www.drawio.com; on macOS: brew install --cask drawio).
//
//   node tools/example-pictures.mjs
//
// final-look.png is a screenshot of the design phase's screens, not of the diagram; it isn't
// touched here.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'docs', 'examples', 'pair-a-meter');
const sketch = path.join(root, 'skills', 'mobile-prototype', 'scripts', 'sketch.mjs');
const drawio = [process.env.DRAWIO, '/Applications/draw.io.app/Contents/MacOS/draw.io', 'drawio'].find((c) => c && (c === 'drawio' ? spawnSync('which', ['drawio']).status === 0 : fs.existsSync(c)));
if (!drawio) { console.error('✗ draw.io Desktop not found. Install it (macOS: brew install --cask drawio) or set DRAWIO to its executable.'); process.exit(1); }

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) { console.error(`✗ ${path.basename(cmd)} ${args.join(' ')}\n${r.stdout}${r.stderr}`); process.exit(1); }
};
for (const style of ['wireflow', 'click-through']) {
  run(process.execPath, [sketch, '--spec', path.join(dir, 'flow.json'), '--out', path.join(dir, `${style}.drawio`), '--style', style]);
}
// [picture, diagram, page (1-based: in click-through.drawio, page 1 is the map and page n + 1 is
// Sn), width in px (what the README was laid out for)]
const pictures = [
  ['wireflow.png', 'wireflow.drawio', 1, 2600],
  ['click-through-map.png', 'click-through.drawio', 1, 2200],
  ['click-through-screen.png', 'click-through.drawio', 4, 1100],
];
for (const [png, file, pageNo, width] of pictures) {
  run(drawio, ['--export', '--format', 'png', '--page-index', String(pageNo), '--width', String(width), '--border', '20', '--output', path.join(dir, png), path.join(dir, file)]);
  console.log(`✓ ${path.relative(root, path.join(dir, png))}`);
}
