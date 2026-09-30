#!/usr/bin/env node
// Turn a design direction (the ```theme block in DESIGN.md) into platform tokens for the final-look
// screens (docs/prototypes/look/, made by screens.mjs), check every text/background pair for contrast,
// and stop without writing anything if one fails.
//
//   node theme.mjs --design docs/prototypes/notes/DESIGN.md [--out <folder>]      apply to the screens
//   node theme.mjs --design <file> --option b                                 preview only: look/design/b/, for the style tile
//   node theme.mjs --brand "#0B6E4F" [--font Inter]                           just the documented brand (V1), defaults for the rest
//   node theme.mjs --design <file> --export design-system/<app>               also write material-theme.json + ios-theme.json
//   node theme.mjs --remove                                                   back to the platform baseline
//   options: --platform android,ios (default: the platforms look/index.html links)  --offline  --no-fonts  --json
//
// Android: the full Material 3 colour scheme from the brand colour, with Google's Material Color
// Utilities (Apache-2.0, downloaded once to a cache on first use). Offline, a CIELAB approximation
// with the same tones is used and flagged. iOS: the brand colour becomes the tint; system
// backgrounds and labels stay. Writes look/tokens/<platform>.theme.css (linked after tokens/<platform>.css),
// notes/THEME-REPORT.md and look/style-tile.html. Exit code 1 when a pair fails or the input is invalid.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as C from './lib/color.mjs';
import { workspace } from './lib/workspace.mjs';
import { cacheDir, download, untar } from './lib/fetch-archive.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(HERE, '..', 'assets', 'design-kit');
const MCU = {
  version: '0.3.0',
  url: 'https://registry.npmjs.org/@material/material-color-utilities/-/material-color-utilities-0.3.0.tgz',
  integrity: 'sha512-ztmtTd6xwnuh2/xu+Vb01btgV8SQWYCaK56CkRK8gEkWe5TuDyBcYJ0wgkMRn+2VcE9KUmhvkz+N9GHrqw/C0g==',
};

// ---------- arguments ----------
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const flag = (n) => args.includes(`--${n}`);
if (flag('help') || flag('h')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 17).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const out = workspace(opt('out'));
const asJson = flag('json');
const option = opt('option');
const warnings = [];
const fail = (msg) => { if (asJson) console.log(JSON.stringify({ ok: false, error: msg }, null, 2)); else console.error(`✗ ${msg}`); process.exit(1); };
if (option && !/^[\w-]+$/.test(option)) fail('--option takes a short name: letters, digits, - and _');

const kit = path.join(out, 'look'); // the final-look screens live here; notes stay in <out>/notes
const indexFile = path.join(kit, 'index.html');
const indexHtml = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : '';
const linked = [...new Set([...indexHtml.matchAll(/href="tokens\/([\w-]+)\.css" data-platform/g)].map((m) => m[1]))];
const platforms = opt('platform') ? opt('platform').replace('both', 'android,ios').split(',').map((s) => s.trim()) : linked;
if (!platforms.length) fail(`No platforms: ${path.relative(process.cwd(), indexFile)} links none. Run screens.mjs first, or pass --platform.`);
for (const p of platforms) if (!['android', 'ios'].includes(p)) fail(`Unknown platform "${p}" (android, ios)`);

const rel = (p) => path.relative(process.cwd(), p) || '.';
const themeLink = (p) => `<link rel="stylesheet" href="tokens/${p}.theme.css" data-platform="${p}" data-theme-link>`;

if (flag('remove')) {
  const removed = [];
  for (const p of platforms) {
    const f = path.join(kit, 'tokens', `${p}.theme.css`);
    if (fs.existsSync(f)) { fs.rmSync(f); removed.push(rel(f)); }
  }
  for (const f of [indexFile, path.join(kit, 'style-tile.html')]) {
    if (fs.existsSync(f)) fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/\n?[ \t]*<link [^>]*data-theme-link>/g, ''));
  }
  console.log(removed.length ? `Removed ${removed.join(', ')} and their links; the screens use the platform baseline again.` : 'No theme files to remove.');
  process.exit(0);
}

// ---------- the design direction ----------
const ENUMS = {
  expressiveness: ['restrained', 'balanced', 'bold'],
  density: ['spacious', 'balanced', 'dense'],
  motion: ['minimal', 'standard'],
  shape: ['square', 'rounded', 'soft'],
  contrast: ['standard', 'high'],
  'android.scheme': ['auto', 'tonal-spot', 'neutral', 'vibrant', 'expressive', 'fidelity', 'content'],
};
const DEFAULTS = {
  brand: null, accent: 'auto', expressiveness: 'balanced', density: 'balanced', motion: 'standard', shape: 'rounded', contrast: 'standard',
  'font.display': 'platform', 'font.text': 'platform', 'android.scheme': 'auto', 'android.success': '#2e7d32', 'ios.tint': 'auto',
};

let designFile = opt('design');
let design;
if (opt('brand')) design = { ...DEFAULTS, brand: opt('brand'), ...(opt('font') ? { 'font.display': opt('font'), 'font.text': opt('font') } : {}) };
else {
  designFile ||= path.join(out, 'notes', 'DESIGN.md');
  if (!fs.existsSync(designFile)) fail(`${rel(path.resolve(designFile))} not found. Pass --design <DESIGN.md> or --brand <#hex>.`);
  design = parseDesign(fs.readFileSync(designFile, 'utf8'));
}
validate(design);
// Text contrast target: WCAG AA (4.5:1) by default, AAA (7:1) with "contrast: high".
const TEXT = design.contrast === 'high' ? 7 : 4.5;

function parseDesign(text) {
  const block = text.match(/```theme\s*\n([\s\S]*?)```/);
  if (!block) fail(`${rel(designFile)} has no \`\`\`theme block (see assets/templates/DESIGN.md).`);
  const d = { ...DEFAULTS };
  for (const raw of block[1].split('\n')) {
    const line = raw.replace(/\s+#\s.*$/, '').trim();       // "# comment" after whitespace; "#hex" values stay
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([\w.-]+)\s*:\s*(.*)$/);
    if (!m) fail(`Can't read this line of the theme block: "${raw.trim()}"`);
    if (!(m[1] in DEFAULTS)) fail(`Unknown theme key "${m[1]}". Known keys: ${Object.keys(DEFAULTS).join(', ')}`);
    d[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return d;
}

function validate(d) {
  if (!d.brand || !C.isHex(d.brand)) fail(`brand must be a #rrggbb colour (got "${d.brand ?? ''}")`);
  for (const [k, vals] of Object.entries(ENUMS)) if (!vals.includes(d[k])) fail(`${k} must be one of ${vals.join(' | ')} (got "${d[k]}")`);
  if (d.accent !== 'auto' && !C.isHex(d.accent)) fail(`accent must be auto or #rrggbb (got "${d.accent}")`);
  if (!C.isHex(d['android.success'])) fail(`android.success must be #rrggbb (got "${d['android.success']}")`);
  const tint = d['ios.tint'];
  if (!['auto', 'adjust'].includes(tint) && !tint.split('/').every((x) => C.isHex(x.trim()))) fail(`ios.tint must be auto, adjust, #rrggbb or #light/#dark (got "${tint}")`);
  for (const k of ['font.display', 'font.text']) if (!/^[\w .'-]+$/.test(d[k])) fail(`${k} must be "platform" or a font family name`);
  d.brand = d.brand.toLowerCase();
}

// ---------- Android: Material 3 colour scheme ----------
const MD_ROLES = ['primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'secondary', 'onSecondary', 'secondaryContainer',
  'onSecondaryContainer', 'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer', 'error', 'onError', 'errorContainer',
  'onErrorContainer', 'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant', 'surfaceContainerLowest', 'surfaceContainerLow',
  'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'outline', 'outlineVariant', 'inverseSurface',
  'inverseOnSurface', 'inversePrimary'];
// Tones of the 2021 Material 3 spec (contrast level 0), used by the offline approximation. They match
// what Material Color Utilities 0.3.0 produces: [palette, light tone, dark tone].
const TONES = {
  primary: ['P', 40, 80], onPrimary: ['P', 100, 20], primaryContainer: ['P', 90, 30], onPrimaryContainer: ['P', 30, 90],
  secondary: ['S', 40, 80], onSecondary: ['S', 100, 20], secondaryContainer: ['S', 90, 30], onSecondaryContainer: ['S', 30, 90],
  tertiary: ['T', 40, 80], onTertiary: ['T', 100, 20], tertiaryContainer: ['T', 90, 30], onTertiaryContainer: ['T', 30, 90],
  error: ['E', 40, 80], onError: ['E', 100, 20], errorContainer: ['E', 90, 30], onErrorContainer: ['E', 30, 90],
  surface: ['N', 98, 6], onSurface: ['N', 10, 90], surfaceVariant: ['NV', 90, 30], onSurfaceVariant: ['NV', 30, 80],
  surfaceContainerLowest: ['N', 100, 4], surfaceContainerLow: ['N', 96, 10], surfaceContainer: ['N', 94, 12],
  surfaceContainerHigh: ['N', 92, 17], surfaceContainerHighest: ['N', 90, 22], outline: ['NV', 50, 60], outlineVariant: ['NV', 80, 30],
  inverseSurface: ['N', 20, 90], inverseOnSurface: ['N', 95, 20], inversePrimary: ['P', 80, 40],
};
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const variantOf = (d) => (d['android.scheme'] === 'auto' ? { restrained: 'neutral', balanced: 'tonal-spot', bold: 'vibrant' }[d.expressiveness] : d['android.scheme']);

async function loadMcu() {
  if (flag('offline') || process.env.MOBILE_PROTOTYPE_OFFLINE) return null;
  const dir = path.join(cacheDir(), `material-color-utilities@${MCU.version}`);
  const entry = path.join(dir, 'index.js');
  try {
    if (!fs.existsSync(entry)) {
      const buf = await download(MCU.url, MCU.integrity, { timeoutMs: 30_000 });
      fs.mkdirSync(dir, { recursive: true });
      untar(buf, dir, (name) => (name.startsWith('package/') ? name.slice(8) : null));
      if (!asJson) console.error(`Downloaded Material Color Utilities ${MCU.version} (Apache-2.0) to ${dir}`);
    }
    return await import(pathToFileURL(entry).href);
  } catch (e) {
    warnings.push(`Material Color Utilities unavailable (${e.message.split('\n')[0]}); used the offline approximation. Run again online before the handoff.`);
    return null;
  }
}

function androidScheme(d, mcu) {
  const variant = variantOf(d);
  const successSeed = d['android.success'];
  if (mcu) {
    const Cls = { 'tonal-spot': mcu.SchemeTonalSpot, neutral: mcu.SchemeNeutral, vibrant: mcu.SchemeVibrant, expressive: mcu.SchemeExpressive, fidelity: mcu.SchemeFidelity, content: mcu.SchemeContent }[variant];
    const src = mcu.Hct.fromInt(mcu.argbFromHex(d.brand));
    const success = mcu.TonalPalette.fromInt(mcu.Blend.harmonize(mcu.argbFromHex(successSeed), mcu.argbFromHex(d.brand)));
    const scheme = (isDark) => {
      const level = d.contrast === 'high' ? 1 : 0;
      let s = new Cls(src, isDark, level);
      if (d.accent !== 'auto') {
        s = new mcu.DynamicScheme({ sourceColorArgb: s.sourceColorArgb, variant: s.variant, contrastLevel: level, isDark,
          primaryPalette: s.primaryPalette, secondaryPalette: s.secondaryPalette, tertiaryPalette: mcu.TonalPalette.fromInt(mcu.argbFromHex(d.accent)),
          neutralPalette: s.neutralPalette, neutralVariantPalette: s.neutralVariantPalette });
      }
      const roles = Object.fromEntries(MD_ROLES.map((k) => [k, mcu.hexFromArgb(mcu.MaterialDynamicColors[k].getArgb(s))]));
      roles.success = mcu.hexFromArgb(success.tone(isDark ? 80 : 40));
      if (C.contrast(roles.success, roles.surface) < TEXT) {
        for (let t = isDark ? 80 : 40; t >= 0 && t <= 100; t += isDark ? 2 : -2) {
          const c = mcu.hexFromArgb(success.tone(t));
          if (C.contrast(c, roles.surface) >= TEXT + 0.05) { roles.success = c; break; }
        }
      }
      return roles;
    };
    return { engine: `Material Color Utilities ${MCU.version}`, variant, light: scheme(false), dark: scheme(true) };
  }
  // Offline approximation: CIELAB palettes with Material's tones and roughly its chroma per variant.
  if (d.contrast === 'high') fail('contrast: high needs Material Color Utilities, which could not be loaded. Connect to the internet, or use contrast: standard for now.');
  const src = C.toLch(C.parse(d.brand));
  const h = src.h, c = src.c;
  const rot = (x) => (h + x + 360) % 360;
  const spec = {
    'tonal-spot': { P: [h, 36], S: [h, 16], T: [rot(60), 24], N: [h, 6], NV: [h, 8] },
    neutral: { P: [h, 12], S: [h, 8], T: [rot(60), 16], N: [h, 2], NV: [h, 2] },
    vibrant: { P: [h, 200], S: [rot(15), 24], T: [rot(60), 32], N: [h, 10], NV: [h, 12] },
    expressive: { P: [rot(240), 40], S: [rot(15), 24], T: [rot(120), 32], N: [rot(15), 8], NV: [rot(15), 12] },
    fidelity: { P: [h, c], S: [h, Math.max(c - 32, c / 2)], T: [rot(180), c], N: [h, c / 8], NV: [h, c / 8 + 4] },
    content: { P: [h, c], S: [h, Math.max(c - 32, c / 2)], T: [rot(60), c], N: [h, c / 8], NV: [h, c / 8 + 4] },
  }[variant];
  // Material's chroma values are HCT chroma; CIELAB chroma of the same colour is lower, more so
  // for greyish colours. This fit keeps neutrals near-grey and accents saturated.
  const labChroma = (hc) => (hc >= 200 ? 200 : hc * Math.min(0.9, 0.4 + 0.012 * hc));
  const fromSource = new Set(['fidelity', 'content']);
  const err = C.toLch(C.parse('#ba1a1a'));
  const pal = Object.fromEntries(Object.entries(spec).map(([k, [hh, cc]]) => [k, C.palette(hh, fromSource.has(variant) ? cc : labChroma(cc))]));
  pal.E = C.palette(err.h, err.c);
  if (d.accent !== 'auto') { const a = C.toLch(C.parse(d.accent)); pal.T = C.palette(a.h, a.c); }
  const succ = C.toLch(C.parse(successSeed));
  const successPal = C.palette(succ.h, Math.min(succ.c, 48));
  const scheme = (dark) => {
    const roles = Object.fromEntries(MD_ROLES.map((k) => { const [p, lt, dt] = TONES[k]; return [k, pal[p].tone(dark ? dt : lt)]; }));
    if (['fidelity', 'content'].includes(variant) && !dark) {
      roles.primaryContainer = d.brand;          // these variants keep the brand colour itself as the container
      const t = C.toneOf(d.brand);
      roles.onPrimaryContainer = pal.P.tone(t > 60 ? 10 : 100);
    }
    roles.success = successPal.tone(dark ? 80 : 40);
    return roles;
  };
  warnings.push('Android colours are an approximation (CIELAB tones, not HCT). Hues may differ slightly from Material Theme Builder; contrast is the same.');
  return { engine: 'offline approximation (CIELAB)', variant, light: scheme(false), dark: scheme(true) };
}

// ---------- iOS: tint and tinted fills ----------
function iosTheme(d, base) {
  const [lightGiven, darkGiven] = C.isHex(d['ios.tint'].split('/')[0]?.trim()) ? d['ios.tint'].split('/').map((x) => x.trim().toLowerCase()) : [];
  // The backgrounds tinted text sits on: the grouped background, cells, and bordered buttons (a
  // translucent fill over a cell). The tint has to reach 4.5:1 on the hardest of them.
  const surfaces = (theme) => {
    const get = resolver(theme === 'light' ? base.light : { ...base.light, ...base.dark });
    const cell = C.parse(get('ios-grouped-bg-secondary'));
    const page = C.parse(get('ios-grouped-bg'));
    return [page, cell, C.over(C.parse(get('ios-fill-tertiary')), cell), C.over(C.parse(get('ios-fill-tertiary')), page)].map(C.hex);
  };
  // Darkening a tint is limited by the darkest light background; lifting it by the lightest dark one.
  const byLum = (list, pick) => list.reduce((a, b) => (pick(C.luminance(C.parse(b)), C.luminance(C.parse(a))) ? b : a));
  const minContrast = (c, list) => Math.min(...list.map((b) => C.contrast(c, b)));
  const lightBgs = surfaces('light'), darkBgs = surfaces('dark');
  const worstLight = byLum(lightBgs, (x, y) => x < y), worstDark = byLum(darkBgs, (x, y) => x > y);
  let tint = lightGiven || d.brand;
  const notes = [];
  if (minContrast(tint, lightBgs) < TEXT) {
    const suggestion = C.nearestPassing(tint, worstLight, TEXT + 0.1, 'darker');
    if (d['ios.tint'] === 'adjust') { notes.push(`iOS light tint darkened from ${tint} to ${suggestion} to reach ${TEXT}:1 (ios.tint: adjust).`); tint = suggestion; }
    else {
      return { error: `Brand ${tint} as the iOS tint has ${minContrast(tint, lightBgs).toFixed(2)}:1 on light backgrounds (needs ${TEXT}:1 for tinted text and buttons). `
        + `Nearest passing colour with the same hue: ${suggestion}. Set "ios.tint: ${suggestion}" (keeps the brand for fills and illustrations) or "ios.tint: adjust" in DESIGN.md.` };
    }
  }
  let tintDark = darkGiven;
  if (!tintDark) {
    tintDark = minContrast(d.brand, darkBgs) >= TEXT ? d.brand : C.nearestPassing(d.brand, worstDark, TEXT + 0.1, 'lighter');
    if (tintDark !== d.brand) notes.push(`iOS dark tint ${tintDark}: the brand colour lifted to reach ${TEXT}:1 on dark backgrounds, as iOS system colours do.`);
  }
  const L = C.toLch(C.parse(tint)), D = C.toLch(C.parse(tintDark));
  const fillTone = { restrained: [96, 14], balanced: [92, 20], bold: [86, 26] }[d.expressiveness];
  const fillChroma = { restrained: 12, balanced: 20, bold: 32 }[d.expressiveness];
  const onColor = (bg, darkText) => (C.contrast('#ffffff', bg) >= TEXT ? '#ffffff' : darkText);
  const theme = {
    notes,
    light: {
      'ios-tint': tint,
      'ios-on-tint': onColor(tint, C.hex(C.fromTone(10, L.h, Math.min(L.c, 40)))),
      'ios-tint-fill': C.hex(C.fromTone(fillTone[0], L.h, Math.min(L.c, fillChroma))),
      'ios-on-tint-fill': C.hex(C.fromTone(25, L.h, Math.min(L.c, 48))),
      'ios-toast-action': C.hex(C.fromTone(82, L.h, Math.min(L.c, 40))),
      'ios-wallpaper': `linear-gradient(160deg, ${C.hex(C.fromTone(78, L.h, Math.min(L.c, 30)))}, ${C.hex(C.fromTone(45, L.h, Math.min(L.c, 30)))} 60%, ${C.hex(C.fromTone(25, (L.h + 40) % 360, 24))})`,
    },
    dark: {
      'ios-tint': tintDark,
      'ios-on-tint': C.contrast('#000000', tintDark) >= TEXT ? C.hex(C.fromTone(10, D.h, Math.min(D.c, 40))) : '#ffffff',
      'ios-tint-fill': C.hex(C.fromTone(fillTone[1], D.h, Math.min(D.c, fillChroma))),
      'ios-on-tint-fill': C.hex(C.fromTone(88, D.h, Math.min(D.c, 30))),
      'ios-toast-action': C.hex(C.fromTone(84, D.h, Math.min(D.c, 40))),
      'ios-wallpaper': `linear-gradient(160deg, ${C.hex(C.fromTone(32, D.h, Math.min(D.c, 24)))}, ${C.hex(C.fromTone(18, D.h, 16))} 60%, ${C.hex(C.fromTone(7, (D.h + 40) % 360, 12))})`,
    },
  };
  if (d.contrast === 'high') {
    // AAA: the app's own text colours go beyond Apple's defaults (as with Increase Contrast).
    for (const [theme_, bgs, dir] of [['light', lightBgs, 'darker'], ['dark', darkBgs, 'lighter']]) {
      const get = resolver(theme_ === 'light' ? base.light : { ...base.light, ...base.dark });
      const worst = byLum(bgs, dir === 'darker' ? (x, y) => x < y : (x, y) => x > y);
      const t = theme[theme_];
      for (const name of ['ios-red', 'ios-green']) {
        const c = C.hex(C.over(C.parse(get(name)), C.parse(worst)));
        if (minContrast(c, bgs) < TEXT) t[name] = C.nearestPassing(c, worst, TEXT + 0.1, dir);
      }
      t['ios-on-red'] = C.contrast('#ffffff', t['ios-red'] || get('ios-red')) >= TEXT ? '#ffffff' : '#000000';
      const sec = C.parse(get('ios-label-secondary'));
      for (let a = sec.a; a <= 1.001; a += 0.02) {
        if (bgs.every((b) => C.contrast({ ...sec, a }, C.parse(b)) >= TEXT + 0.05)) { t['ios-label-secondary'] = `rgb(${sec.r} ${sec.g} ${sec.b} / ${Math.min(1, a).toFixed(2)})`; break; }
      }
      const barBg = C.over(C.parse(get('ios-bar-bg')), C.parse(get('ios-grouped-bg')));
      if (C.contrast(get('ios-tab-inactive'), barBg) < TEXT) t['ios-tab-inactive'] = C.nearestPassing(get('ios-tab-inactive'), barBg, TEXT + 0.1, dir);
      const toastBg = C.over(C.parse(get('ios-toast-bg')), C.parse(get('ios-grouped-bg')));
      if (C.contrast(t['ios-toast-action'], toastBg) < TEXT) t['ios-toast-action'] = C.nearestPassing(t['ios-toast-action'], toastBg, TEXT + 0.1, 'lighter');
    }
    notes.push(`contrast: high — iOS secondary label, red, green, inactive tab labels and the toast action were strengthened to reach ${TEXT}:1.`);
  }
  return theme;
}

// ---------- type, shape, spacing, motion (both platforms) ----------
const SPACING = {
  spacious: [4, 8, 16, 20, 32, 40, 56],
  balanced: null,
  dense: [4, 6, 8, 12, 16, 24, 40],
};
const SHAPES = {
  android: { square: { xs: 2, sm: 4, md: 4, lg: 8, xl: 12, button: 8 }, rounded: null, soft: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32, button: 'var(--shape-full)' } },
  ios: { square: { xs: 4, sm: 6, md: 8, lg: 10, xl: 14, button: 10 }, rounded: null, soft: { xs: 8, sm: 10, md: 16, lg: 22, xl: 28, button: 'var(--shape-full)' } },
};
const DISPLAY_TOKENS = {
  android: /^--(display-|headline-|title-large)/,
  ios: /^--(ios-large-title|ios-title\d|text-headline|text-title)$/,
};

function layoutVars(d, platform, base) {
  const v = {};
  const sp = SPACING[d.density];
  if (sp) sp.forEach((px, i) => { v[`space-${i + 1}`] = `${px}px`; });
  const sh = SHAPES[platform][d.shape];
  if (sh) for (const [k, val] of Object.entries(sh)) v[`shape-${k}`] = typeof val === 'number' ? `${val}px` : val;
  if (d.motion === 'minimal') { v['motion-short'] = '100ms'; v['motion-medium'] = '150ms'; }
  const fam = (f) => `"${f.replace(/"/g, '')}"`;
  if (d['font.text'] !== 'platform') v.font = `${fam(d['font.text'])}, ${base.light.font}`;
  if (d['font.display'] !== 'platform') {
    v['font-display'] = `${fam(d['font.display'])}, var(--font)`;
    for (const [name, value] of Object.entries(base.light)) {
      if (DISPLAY_TOKENS[platform].test(`--${name}`) && value.includes('var(--font)')) v[name] = value.replaceAll('var(--font)', 'var(--font-display)');
    }
  }
  return v;
}

// ---------- reading the template's token files ----------
function parseTokens(css) {
  const decls = (body) => Object.fromEntries([...body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const light = noComments.match(/(?:^|\n):root\s*\{([\s\S]*?)\n\}/);
  const dark = noComments.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
  return { light: decls(light?.[1] || ''), dark: decls(dark?.[1] || '') };
}
function resolver(map) {
  const get = (name, depth = 0) => {
    const v = map[name];
    if (v == null || depth > 20) return undefined;
    return v.replace(/var\(--([\w-]+)(?:\s*,\s*([^)]*))?\)/g, (_, n, fb) => get(n, depth + 1) ?? fb ?? '');
  };
  return get;
}

// ---------- contrast pairs (text ≥ 4.5, UI components ≥ 3) ----------
const PAIRS = {
  android: [
    ['md-on-primary', 'md-primary', 4.5, 'filled button text'],
    ['md-on-primary-container', 'md-primary-container', 4.5, 'primary container text'],
    ['md-on-secondary-container', 'md-secondary-container', 4.5, 'tonal button, selected navigation item'],
    ['md-on-tertiary-container', 'md-tertiary-container', 4.5, 'tertiary container text'],
    ['md-on-surface', 'md-surface', 4.5, 'body text'],
    ['md-on-surface-variant', 'md-surface', 4.5, 'supporting text'],
    ['md-on-surface-variant', 'md-surface-container-highest', 4.5, 'supporting text on filled cards and fields'],
    ['md-primary', 'md-surface', 4.5, 'text buttons, links, list headers'],
    ['md-primary', 'md-surface-container-low', 4.5, 'text buttons on cards'],
    ['md-error', 'md-surface', 4.5, 'error text'],
    ['md-on-error', 'md-error', 4.5, 'destructive button text'],
    ['md-on-error-container', 'md-error-container', 4.5, 'error banner text'],
    ['md-success', 'md-surface', 4.5, 'success text'],
    ['md-inverse-on-surface', 'md-inverse-surface', 4.5, 'snackbar text'],
    ['md-inverse-primary', 'md-inverse-surface', 4.5, 'snackbar action'],
    ['md-outline', 'md-surface', 3, 'field and button outlines (UI component)'],
  ],
  ios: [
    ['ios-label', 'ios-grouped-bg', 4.5, 'body text'],
    ['ios-label-secondary', 'ios-grouped-bg-secondary', 4.5, 'secondary text in cells'],
    ['ios-label-secondary', 'ios-grouped-bg', 4.5, 'section headers and footers'],
    ['ios-tint', 'ios-grouped-bg', 4.5, 'tinted text and bar buttons'],
    ['ios-tint', 'ios-grouped-bg-secondary', 4.5, 'tinted text in cells'],
    ['ios-on-tint', 'ios-tint', 4.5, 'prominent button text'],
    ['ios-on-tint-fill', 'ios-tint-fill', 4.5, 'tinted button text, info banner'],
    ['ios-tint', ['ios-fill-tertiary', 'ios-grouped-bg-secondary'], 4.5, 'bordered button text in cells'],
    ['ios-tint', ['ios-fill-tertiary', 'ios-grouped-bg'], 4.5, 'bordered button text on the background'],
    ['ios-tab-inactive', ['ios-bar-bg', 'ios-grouped-bg'], 4.5, 'inactive tab labels'],
    ['ios-red', 'ios-grouped-bg-secondary', 4.5, 'destructive text'],
    ['ios-on-red', 'ios-red', 4.5, 'destructive button text'],
    ['ios-green', 'ios-grouped-bg-secondary', 4.5, 'success text'],
    ['ios-toast-action', ['ios-toast-bg', 'ios-grouped-bg'], 4.5, 'toast action'],
  ],
};

function checkPairs(platform, effective) {
  const rows = [];
  for (const theme of ['light', 'dark']) {
    const get = resolver(effective[theme]);
    for (const [fgVar, bgSpec, min, use] of PAIRS[platform]) {
      const layers = (Array.isArray(bgSpec) ? bgSpec : [bgSpec]).map((n) => C.parse(get(n)));
      const fg = C.parse(get(fgVar));
      if (!fg || layers.some((l) => !l)) { rows.push({ platform, theme, pair: `${fgVar} on ${[bgSpec].flat().join(' over ')}`, use, ratio: null, min: min === 4.5 ? TEXT : min, pass: false }); continue; }
      const bg = layers.reduceRight((under, top) => (under ? C.over(top, under) : { ...top, a: 1 }), null);
      const need = min === 4.5 ? TEXT : min;
      const ratio = C.contrast(fg, bg);
      rows.push({ platform, theme, pair: `${fgVar} on ${[bgSpec].flat().join(' over ')}`, use, fg: C.hex(fg.a < 1 ? C.over(fg, bg) : fg), bg: C.hex(bg), ratio: Math.round(ratio * 100) / 100, min: need, pass: ratio >= need });
    }
  }
  return rows;
}

// ---------- fonts (optional download from Google Fonts, OFL/Apache) ----------
async function fetchFonts(families, fontDir) {
  const faces = [];
  if (flag('no-fonts') || flag('offline') || process.env.MOBILE_PROTOTYPE_OFFLINE) {
    if (families.length) warnings.push(`Fonts not downloaded (${families.join(', ')}): the screens show them only where they are installed.`);
    return faces;
  }
  for (const family of families) {
    const name = encodeURIComponent(family).replace(/%20/g, '+');
    try {
      // Ask for the weights the tokens use; families that lack some of them get what they have.
      let css = null, status = 0;
      for (const weights of [':wght@400;500;600;700', ':wght@400;700', '']) {
        const res = await fetch(`https://fonts.googleapis.com/css2?family=${name}${weights}&display=swap`, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' }, signal: AbortSignal.timeout(20_000) });
        status = res.status;
        if (res.ok) { css = await res.text(); break; }
      }
      if (!css) throw new Error(status === 400 ? 'not on Google Fonts' : `HTTP ${status}`);
      const blocks = [...css.matchAll(/\/\*\s*latin\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
      const seen = new Map();
      for (const b of blocks) {
        const src = b.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
        const weight = b.match(/font-weight:\s*(\d+)/)?.[1];
        if (!src || !weight) continue;
        if (!seen.has(src)) {
          const file = `${family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${seen.size}.woff2`;
          const r = await fetch(src, { signal: AbortSignal.timeout(20_000) });
          fs.mkdirSync(fontDir, { recursive: true });
          fs.writeFileSync(path.join(fontDir, file), Buffer.from(await r.arrayBuffer()));
          seen.set(src, file);
        }
        faces.push({ family, weight, file: seen.get(src), unicodeRange: b.match(/unicode-range:\s*([^;]+);/)?.[1] });
      }
      if (!faces.some((f) => f.family === family)) throw new Error('no latin files');
    } catch (e) {
      warnings.push(`Font "${family}" not downloaded (${e.message}); the platform font is shown instead.`);
    }
  }
  return faces;
}

// ---------- CSS output ----------
function cssFile(platform, vars, faces, fontUrlBase, header) {
  const lines = (o, ind) => Object.entries(o).map(([k, v]) => `${ind}--${k}: ${v};`).join('\n');
  const fontFaces = faces.map((f) => `@font-face { font-family: "${f.family}"; font-style: normal; font-weight: ${f.weight}; font-display: swap; src: url("${fontUrlBase}${f.file}") format("woff2");${f.unicodeRange ? ` unicode-range: ${f.unicodeRange};` : ''} }`).join('\n');
  return `/* ${header.join('\n   ')} */
${fontFaces ? `\n${fontFaces}\n` : ''}
:root {
${lines(vars.light, '  ')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${lines(vars.dark, '    ')}
  }
}

:root[data-theme="dark"] {
${lines(vars.dark, '  ')}
}
`;
}

// ---------- main ----------
const mcu = platforms.includes('android') ? await loadMcu() : null;
const report = [];
const perPlatform = {};
const notes = [];
const errors = [];

for (const platform of platforms) {
  const baseFile = fs.existsSync(path.join(kit, 'tokens', `${platform}.css`)) ? path.join(kit, 'tokens', `${platform}.css`) : path.join(TEMPLATE, 'tokens', `${platform}.css`);
  const base = parseTokens(fs.readFileSync(baseFile, 'utf8'));
  const vars = { light: {}, dark: {} };
  let info = {};
  if (platform === 'android') {
    const s = androidScheme(design, mcu);
    for (const k of [...MD_ROLES, 'success']) { vars.light[`md-${kebab(k)}`] = s.light[k]; vars.dark[`md-${kebab(k)}`] = s.dark[k]; }
    info = { engine: s.engine, variant: s.variant, scheme: { light: s.light, dark: s.dark } };
  } else {
    const t = iosTheme(design, base);
    if (t.error) { errors.push(t.error); continue; }
    Object.assign(vars.light, t.light); Object.assign(vars.dark, t.dark);
    notes.push(...t.notes);
    info = { tint: { light: t.light['ios-tint'], dark: t.dark['ios-tint'] }, colors: { light: t.light, dark: t.dark } };
  }
  Object.assign(vars.light, layoutVars(design, platform, base));
  const effective = { light: { ...base.light, ...vars.light }, dark: { ...base.light, ...base.dark, ...vars.light, ...vars.dark } };
  report.push(...checkPairs(platform, effective));
  perPlatform[platform] = { vars, info };
}

const failures = report.filter((r) => !r.pass);
const source = opt('brand') ? `--brand ${design.brand}` : rel(path.resolve(designFile));
const reportMd = [
  `# Theme report`,
  '',
  `Source: ${source} · Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · Platforms: ${platforms.join(', ')}`,
  perPlatform.android ? `Android: ${perPlatform.android.info.engine}, scheme ${perPlatform.android.info.variant}` : null,
  perPlatform.ios ? `iOS: tint ${perPlatform.ios.info.tint.light} (light) / ${perPlatform.ios.info.tint.dark} (dark); system backgrounds and labels` : null,
  '',
  `Contrast target: ${design.contrast === 'high' ? 'WCAG AAA — 7:1 for text' : 'WCAG AA — 4.5:1 for text'}, 3:1 for UI components`,
  '',
  `Direction: brand ${design.brand}${design.accent !== 'auto' ? `, accent ${design.accent}` : ''} · expressiveness ${design.expressiveness} · density ${design.density} · motion ${design.motion} · shape ${design.shape} · fonts ${design['font.display']} / ${design['font.text']}`,
  '',
  ...(errors.length ? ['## Errors', '', ...errors.map((e) => `- ${e}`), ''] : []),
  ...(notes.length || warnings.length ? ['## Notes', '', ...[...notes, ...warnings].map((n) => `- ${n}`), ''] : []),
  `## Contrast (${report.length - failures.length}/${report.length} pass)`,
  '',
  '| Platform | Theme | Text / UI | On | Ratio | Needs | Used for |',
  '|---|---|---|---|---|---|---|',
  ...report.map((r) => `| ${r.platform} | ${r.theme} | ${r.fg ?? '?'} \`${r.pair.split(' on ')[0]}\` | ${r.bg ?? '?'} \`${r.pair.split(' on ')[1]}\` | ${r.ratio ?? 'unreadable'}${r.pass ? '' : ' ✗'} | ${r.min} | ${r.use} |`),
  '',
].filter((l) => l !== null).join('\n');

const destDir = option ? path.join(kit, 'design', option) : path.join(kit, 'tokens');
const reportFile = option ? path.join(kit, 'design', option, 'THEME-REPORT.md') : path.join(out, 'notes', 'THEME-REPORT.md');
fs.mkdirSync(path.dirname(reportFile), { recursive: true });
fs.writeFileSync(reportFile, reportMd);

if (errors.length || failures.length) {
  if (asJson) console.log(JSON.stringify({ ok: false, errors, failures, report: rel(reportFile) }, null, 2));
  else {
    console.error(`✗ Theme not written: ${errors.length ? errors.join(' ') : ''}${failures.length ? `${failures.length} contrast pair(s) fail:` : ''}`);
    for (const r of failures) console.error(`   ${r.platform} ${r.theme}: ${r.pair} = ${r.ratio}:1 (needs ${r.min}) — ${r.use}`);
    console.error(`  Details: ${rel(reportFile)}. Change DESIGN.md and run again; nothing else was changed.`);
  }
  process.exit(1);
}

// Fonts, then the CSS files.
const families = [...new Set([design['font.display'], design['font.text']].filter((f) => f !== 'platform'))];
const fontDir = path.join(kit, 'fonts');
const faces = families.length ? await fetchFonts(families, fontDir) : [];
const written = [];
for (const [platform, { vars, info }] of Object.entries(perPlatform)) {
  const file = path.join(destDir, `${platform}.theme.css`);
  const header = [
    `${platform} theme generated by scripts/theme.mjs from ${source}${option ? ` (option "${option}")` : ''}.`,
    `Do not edit: change the design direction and run theme.mjs again. Overrides tokens/${platform}.css.`,
    platform === 'android' ? `Colours: ${info.engine}, ${info.variant} scheme from ${design.brand}.` : `Tint ${info.tint.light} / ${info.tint.dark}; system colours unchanged.`,
  ];
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(file, cssFile(platform, vars, faces, path.relative(destDir, fontDir).split(path.sep).join('/') + '/', header));
  written.push(rel(file));
}

// Link the applied theme from index.html (not for preview options).
if (!option && indexHtml) {
  let html = indexHtml;
  for (const p of Object.keys(perPlatform)) {
    if (html.includes(`tokens/${p}.theme.css`)) continue;
    html = html.replace(new RegExp(`([ \\t]*)(<link rel="stylesheet" href="tokens/${p}\\.css" data-platform="${p}">)`), (m, ind, tag) => `${ind}${tag}\n${ind}${themeLink(p)}`);
  }
  if (html !== indexHtml) { fs.writeFileSync(indexFile, html); written.push(`${rel(indexFile)} (linked)`); }
}

// The style tile: the prototype's own shell, showing the palette, type and components.
if (indexHtml) {
  const current = fs.readFileSync(indexFile, 'utf8');
  const tile = current
    .replace(/<title>([^<]*?)(?: — (?:prototype|screens))?<\/title>/, '<title>$1 — style tile</title>')
    .replace(/(\s*)<script src="core\.js"><\/script>/, `$1<script>
    // ?option=<name> previews design/<name>/<platform>.theme.css instead of the applied theme.
    // Only the active platform's preview is added: a script-inserted stylesheet can't be
    // disabled reliably before it has loaded.
    (function () {
      var q = new URLSearchParams(location.search), o = q.get('option');
      if (!o) return;
      document.querySelectorAll('link[data-theme-link]').forEach(function (l) { l.remove(); });
      var tokens = [].slice.call(document.querySelectorAll('link[href^="tokens/"][data-platform]'));
      var active = tokens.filter(function (l) { return l.dataset.platform === q.get('platform'); })[0] || tokens[0];
      if (!active) return;
      var n = document.createElement('link');
      n.rel = 'stylesheet'; n.dataset.platform = active.dataset.platform;
      n.href = 'design/' + encodeURIComponent(o) + '/' + active.dataset.platform + '.theme.css';
      active.after(n);
    })();
  </script>$1<script src="core.js"></script>`)
    .replace(/\s*<script src="flow-data\.js"><\/script>/, '')
    .replace(/<script src="flow-screens\.js"><\/script>/, '<script src="style-tile.js"></script>');
  fs.writeFileSync(path.join(kit, 'style-tile.html'), tile);
  fs.copyFileSync(path.join(HERE, '..', 'assets', 'style-tile', 'style-tile.js'), path.join(kit, 'style-tile.js'));
}

// Design-system level: data exports for the native team (no code).
const exportDir = opt('export');
if (exportDir) {
  const dir = path.resolve(exportDir);
  fs.mkdirSync(dir, { recursive: true });
  if (perPlatform.android) {
    const s = perPlatform.android.info.scheme;
    const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'success'));
    fs.writeFileSync(path.join(dir, 'material-theme.json'), JSON.stringify({
      description: `Material 3 colour scheme generated by mobile-prototype theme.mjs (${perPlatform.android.info.engine}), ${perPlatform.android.info.variant} variant`,
      seed: design.brand, coreColors: { primary: design.brand, ...(design.accent !== 'auto' ? { tertiary: design.accent } : {}) },
      extendedColors: [{ name: 'success', color: design['android.success'], harmonized: true, light: s.light.success, dark: s.dark.success }],
      schemes: { light: strip(s.light), dark: strip(s.dark) },
      typography: { display: design['font.display'], text: design['font.text'] }, shape: design.shape, density: design.density, motion: design.motion,
    }, null, 2) + '\n');
    written.push(rel(path.join(dir, 'material-theme.json')));
  }
  if (perPlatform.ios) {
    const cfg = perPlatform.ios.info.colors;
    const pick = (o) => ({ accent: o['ios-tint'], onAccent: o['ios-on-tint'], accentFill: o['ios-tint-fill'], onAccentFill: o['ios-on-tint-fill'] });
    fs.writeFileSync(path.join(dir, 'ios-theme.json'), JSON.stringify({
      description: 'iOS theme generated by mobile-prototype theme.mjs: AccentColor (light/dark) and tinted fills; all other colours are system semantic colours',
      accentColor: { light: cfg.light['ios-tint'], dark: cfg.dark['ios-tint'] },
      customColors: { light: pick(cfg.light), dark: pick(cfg.dark) },
      typography: { display: design['font.display'] === 'platform' ? 'system (SF Pro)' : design['font.display'], text: design['font.text'] === 'platform' ? 'system (SF Pro)' : design['font.text'], dynamicType: true },
      shape: design.shape, density: design.density, motion: design.motion,
    }, null, 2) + '\n');
    written.push(rel(path.join(dir, 'ios-theme.json')));
  }
  fs.copyFileSync(reportFile, path.join(dir, 'THEME-REPORT.md'));
  written.push(rel(path.join(dir, 'THEME-REPORT.md')));
}

if (asJson) {
  console.log(JSON.stringify({ ok: true, platforms: Object.keys(perPlatform), option: option || null, written, report: rel(reportFile), contrast: `${report.length}/${report.length} pass`, warnings: [...notes, ...warnings], android: perPlatform.android?.info.engine }, null, 2));
} else {
  console.log(`✔ Theme ${option ? `option "${option}"` : 'applied'} for ${Object.keys(perPlatform).join(', ')} — contrast ${report.length}/${report.length} pairs pass (light and dark)`);
  if (perPlatform.android) console.log(`  Android: ${perPlatform.android.info.engine}, ${perPlatform.android.info.variant} scheme from ${design.brand}`);
  if (perPlatform.ios) console.log(`  iOS: tint ${perPlatform.ios.info.tint.light} / ${perPlatform.ios.info.tint.dark}`);
  for (const n of [...notes, ...warnings]) console.log(`  ! ${n}`);
  console.log(`  wrote: ${written.join(', ')}`);
  console.log(`  report: ${rel(reportFile)}`);
  console.log(`  style tile: ${rel(path.join(kit, 'style-tile.html'))}${option ? `?option=${option}` : ''} (add &platform=<p>&theme=dark)`);
}
