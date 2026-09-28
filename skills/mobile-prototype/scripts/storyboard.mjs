#!/usr/bin/env node
// Build prototype/storyboard.html: every captured screen × state, grouped by platform, window and theme.
// Screenshots are expected at screenshots/<platform>/<window>/<theme>/<scenario>--<screen>--<state>.png
// (the naming used in references/verification-with-playwright-mcp.md); the older
// screenshots/<window>/<theme>/… layout (no platform folder) is read as Android.
//
//   node storyboard.mjs [--dir prototype]

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const i = args.indexOf('--dir');
const dir = path.resolve(i >= 0 ? args[i + 1] : 'prototype');
const shots = path.join(dir, 'screenshots');

const items = [];
(function walk(d) {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!(d === shots && e.name === 'design')) walk(p); }   // design/ holds style-tile captures
    else if (/\.(png|jpe?g|webp)$/i.test(e.name)) {
      const relPath = path.relative(dir, p).split(path.sep).join('/');
      const parts = path.relative(shots, p).split(path.sep).slice(0, -1);
      const [platform, window = 'other', theme = 'light'] = parts.length >= 3 ? parts
        : parts.length === 2 ? ['android', ...parts] : ['other', 'other', 'light'];
      const [scenario = '', screen = '', state = ''] = path.basename(e.name, path.extname(e.name)).split('--');
      items.push({ src: relPath, platform, window, theme, scenario, screen: screen || scenario, state: state || '' });
    }
  }
})(shots);

if (!items.length) {
  console.error(`No screenshots under ${path.relative(process.cwd(), shots)}. Capture them with Playwright MCP first.`);
  process.exit(1);
}

const order = { compact: 0, medium: 1, expanded: 2, iphone: 0, 'iphone-se': 1, ipad: 2 };
items.sort((a, b) => a.platform.localeCompare(b.platform) || (order[a.window] ?? 9) - (order[b.window] ?? 9) || a.theme.localeCompare(b.theme)
  || a.screen.localeCompare(b.screen) || a.state.localeCompare(b.state) || a.scenario.localeCompare(b.scenario));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uniq = (k) => [...new Set(items.map((x) => x[k]))];
const select = (k, label) => `<label>${label} <select data-filter="${k}"><option value="">All</option>${uniq(k).map((v) => `<option>${esc(v)}</option>`).join('')}</select></label>`;

const groups = new Map();
for (const it of items) {
  const key = `${it.platform} · ${it.window} · ${it.theme}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(it);
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prototype storyboard</title>
<style>
  :root { color-scheme: light dark; --bg: #f7f7f8; --fg: #1b1b1f; --muted: #5f5f66; --card: #fff; --line: #e2e2e6; }
  @media (prefers-color-scheme: dark) { :root { --bg: #131316; --fg: #e5e5ea; --muted: #a0a0a8; --card: #1d1d21; --line: #2e2e33; } }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.45 system-ui, sans-serif; background: var(--bg); color: var(--fg); }
  header { position: sticky; top: 0; z-index: 1; background: var(--bg); border-bottom: 1px solid var(--line); padding: 12px 16px; display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center; }
  h1 { font-size: 16px; margin: 0 12px 0 0; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 24px 16px 8px; }
  select { font: inherit; padding: 4px 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; padding: 0 16px 16px; }
  .grid.wide { grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); }
  figure { margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  figure img { display: block; width: 100%; height: auto; cursor: zoom-in; }
  figcaption { padding: 8px 10px; font-size: 12px; color: var(--muted); }
  figcaption b { color: var(--fg); font-weight: 600; }
  dialog { max-width: 95vw; max-height: 95vh; padding: 0; border: 0; background: transparent; }
  dialog img { max-width: 95vw; max-height: 95vh; display: block; }
  dialog::backdrop { background: rgb(0 0 0 / .7); }
</style>
</head>
<body>
<header>
  <h1>Storyboard <small style="font-weight:400;color:var(--muted)">${items.length} captures · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</small></h1>
  ${uniq('platform').length > 1 ? select('platform', 'Platform') : ''} ${select('window', 'Window')} ${select('theme', 'Theme')} ${select('screen', 'Screen')} ${select('scenario', 'Scenario')}
</header>
${[...groups].map(([key, list]) => `<section data-group="${esc(key)}">
<h2>${esc(key)}</h2>
<div class="grid${/expanded|medium|ipad/.test(key) ? ' wide' : ''}">
${list.map((it) => `<figure data-platform="${esc(it.platform)}" data-window="${esc(it.window)}" data-theme="${esc(it.theme)}" data-screen="${esc(it.screen)}" data-scenario="${esc(it.scenario)}">
  <img src="${esc(it.src)}" alt="${esc(`${it.screen} – ${it.state}`)}" loading="lazy">
  <figcaption><b>${esc(it.screen)}</b> · ${esc(it.state || '—')}<br>${esc(it.scenario)}</figcaption>
</figure>`).join('\n')}
</div>
</section>`).join('\n')}
<dialog id="zoom"><img alt=""></dialog>
<script>
  const filters = {};
  document.querySelectorAll('[data-filter]').forEach((s) => s.addEventListener('change', () => {
    filters[s.dataset.filter] = s.value;
    document.querySelectorAll('figure').forEach((f) => {
      f.hidden = Object.entries(filters).some(([k, v]) => v && f.dataset[k] !== v);
    });
    document.querySelectorAll('section').forEach((sec) => { sec.hidden = !sec.querySelector('figure:not([hidden])'); });
  }));
  const zoom = document.getElementById('zoom');
  document.addEventListener('click', (e) => {
    if (e.target.matches('figure img')) { zoom.querySelector('img').src = e.target.src; zoom.showModal(); }
    else if (e.target.closest('#zoom')) zoom.close();
  });
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(dir, 'storyboard.html'), html);
console.log(`Wrote ${path.relative(process.cwd(), path.join(dir, 'storyboard.html'))} (${items.length} captures, ${groups.size} groups)`);
