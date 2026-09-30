#!/usr/bin/env node
// Find the documents a mobile prototype can be built from: spec, architecture, design, API and other,
// and the signals for which platform(s) the app targets (build files and what the documents say).
// Classification and the platform suggestion are first guesses; the user confirms them.
//
//   node discover-inputs.mjs [--root .] [--depth 5] [--json] [extra/path.md other/dir ...]
//
// Explicit paths (files or folders) are always included, even if they would otherwise be skipped.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
let root = process.cwd();
let maxDepth = 5;
let asJson = false;
const explicit = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') root = path.resolve(args[++i]);
  else if (args[i] === '--depth') maxDepth = Number(args[++i]);
  else if (args[i] === '--json') asJson = true;
  else if (args[i] === '--help' || args[i] === '-h') { console.log('node discover-inputs.mjs [--root .] [--depth 5] [--json] [paths...]'); process.exit(0); }
  else explicit.push(path.resolve(args[i]));
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.hg', '.svn', 'build', 'dist', 'out', 'target', '.gradle', '.idea', '.vscode',
  '.next', '.nuxt', 'coverage', 'vendor', 'Pods', '.venv', 'venv', '__pycache__', 'prototype', 'prototypes', 'graphify-out', '.claude', '.codex', '.agents', '.cursor', 'res', 'mipmap', 'drawable', 'fonts', 'icons']);
const TEXT_EXT = new Set(['.md', '.mdx', '.markdown', '.txt', '.rst', '.adoc']);
const DOC_EXT = new Set(['.pdf', '.docx', '.doc', '.pptx', '.odt', '.rtf']);
const API_EXT = new Set(['.yaml', '.yml', '.json', '.graphql', '.gql', '.proto']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const SKIP_FILES = /^(readme|license|licence|changelog|contributing|code_of_conduct|security|package(-lock)?|tsconfig|yarn\.lock|pnpm-lock)(\.|$)/i;

const RULES = [
  { cat: 'spec', re: /\b(prd|spec(ification)?s?|requirements?|user[-_ ]?stor(y|ies)|feature[-_ ]?brief|brd|acceptance|product[-_ ]?brief|epic|use[-_ ]?cases?)\b/i },
  { cat: 'architecture', re: /\b(architecture|arch|adr[-_ ]?\d*|adrs?|system[-_ ]?design|tech(nical)?[-_ ]?design|hld|lld|sequence|data[-_ ]?flow|infra(structure)?|sdd|rfc)\b/i },
  { cat: 'design', re: /\b(ux|ui|design|wireframes?|mock[-_ ]?ups?|flows?|user[-_ ]?flows?|style[-_ ]?guide|brand(ing)?|design[-_ ]?system|screens?|figma|journey[-_ ]?maps?|personas?)\b/i },
  { cat: 'api', re: /\b(openapi|swagger|api|contracts?|graphql|schema|endpoints?|proto)\b/i },
];

// Platform signals: project files, and mentions in the documents.
const BUILD_MARKERS = [
  { re: /^AndroidManifest\.xml$/, platform: 'android' },
  { re: /^(build|settings)\.gradle(\.kts)?$/, platform: 'android', check: (t) => /com\.android\.|android\s*\{/.test(t), cross: (t) => /kotlin\(["']multiplatform["']\)|org\.jetbrains\.kotlin\.multiplatform|compose\.multiplatform/.test(t) },
  { re: /\.(xcodeproj|xcworkspace)$/, platform: 'ios', dir: true },
  { re: /^(Package\.swift|Podfile|Info\.plist)$/, platform: 'ios' },
  { re: /^pubspec\.yaml$/, platform: 'both', label: 'Flutter' },
  { re: /^package\.json$/, platform: 'both', label: 'React Native', check: (t) => /"react-native"\s*:/.test(t) },
];
const MENTIONS = {
  android: /\b(android|jetpack compose|material ?3|play store|google play|gradle)\b/gi,
  ios: /\b(ios|ipados|swiftui|uikit|iphone|ipad|app store|xcode|testflight)\b/gi,
  swift: /\bSwift\b/g,                       // case-sensitive: "a swift reply" isn't a platform
  both: /\b(kotlin multiplatform|compose multiplatform|kmp|flutter|react native|cross[- ]platform)\b/gi,
};
const signals = [];

const files = [];
walk(root, 0);
for (const p of explicit) {
  if (!fs.existsSync(p)) { files.push({ path: p, missing: true }); continue; }
  if (fs.statSync(p).isDirectory()) walk(p, 0, true); else add(p, true);
}

const seen = new Set();
const results = [];
for (const f of files) {
  if (seen.has(f.path)) continue;
  seen.add(f.path);
  results.push(f.missing ? { path: rel(f.path), category: 'missing', reason: 'path does not exist' } : classify(f));
}
const relevant = results.filter((r) => r.category !== 'skip');
const figma = relevant.flatMap((r) => r.figmaLinks || []);

const byCat = { spec: [], architecture: [], design: [], api: [], other: [], missing: [] };
for (const r of relevant) byCat[r.category].push(r);

const found = new Set(signals.map((x) => x.platform));
const suggestion = found.has('both') || (found.has('android') && found.has('ios')) ? 'both' : found.has('android') ? 'android' : found.has('ios') ? 'ios' : null;
const platforms = { suggestion, signals };

if (asJson) {
  console.log(JSON.stringify({ root, categories: byCat, figmaLinks: [...new Set(figma)], platforms }, null, 2));
} else {
  const label = { spec: 'Spec', architecture: 'Architecture', design: 'Design', api: 'API', other: 'Other' };
  console.log(`Inputs found under ${root}\n`);
  for (const cat of ['spec', 'architecture', 'design', 'api', 'other']) {
    const list = byCat[cat];
    const onlyImages = list.length && list.every((r) => r.kind === 'image');
    const mark = !list.length ? '✗' : onlyImages ? '~' : '✔';
    console.log(`  ${mark} ${label[cat].padEnd(13)}${list.length ? '' : 'none found'}`);
    for (const r of list) console.log(`      ${r.path}  (${r.kind}${r.words ? `, ${r.words.toLocaleString()} words` : ''}${r.title ? ` — "${r.title}"` : ''})`);
  }
  if (byCat.missing.length) console.log(`\n  Not found: ${byCat.missing.map((r) => r.path).join(', ')}`);
  if (figma.length) console.log(`\n  Figma links mentioned: ${[...new Set(figma)].join(', ')}`);
  console.log('\n  Platform signals');
  if (!signals.length) console.log('      none found: ask the user (question P5)');
  for (const x of signals) console.log(`      ${x.platform.padEnd(8)} ${x.source}  (${x.evidence})`);
  console.log(`      Suggested: ${suggestion || 'unknown'}`);
  console.log('\n✔ found   ~ images only   ✗ none. This is a guess from names, headings and build files: confirm it with the user.');
}

// ---------------------------------------------------------------------------

function walk(dir, depth, force = false) {
  if (depth > maxDepth) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.') && !force) continue;
    const p = path.join(dir, e.name);
    const marker = BUILD_MARKERS.find((m) => m.re.test(e.name) && !!m.dir === e.isDirectory());
    if (marker) buildSignal(marker, p);
    if (e.isDirectory()) { if ((!SKIP_DIRS.has(e.name) || force) && !marker) walk(p, depth + 1, force); }
    else if (e.isFile()) add(p, force);
  }
}

function buildSignal(marker, p) {
  let text = '';
  if (marker.check || marker.cross) { try { text = fs.readFileSync(p, 'utf8').slice(0, 100_000); } catch { return; } }
  if (marker.cross?.(text)) { signals.push({ platform: 'both', source: rel(p), evidence: 'Kotlin Multiplatform build' }); return; }
  if (marker.check && !marker.check(text)) return;
  signals.push({ platform: marker.platform, source: rel(p), evidence: marker.label ? `${marker.label} project` : 'build file' });
}

function mentionSignals(relPath, text) {
  const byPlatform = {};
  for (const [key, re] of Object.entries(MENTIONS)) {
    const platform = key === 'swift' ? 'ios' : key;
    (byPlatform[platform] ||= []).push(...[...text.matchAll(re)].map((m) => m[0]));
  }
  for (const [platform, hits] of Object.entries(byPlatform)) {
    if (!hits.length) continue;
    const top = [...new Set(hits.map((h) => h.toLowerCase()))].slice(0, 3).map((h) => hits.find((x) => x.toLowerCase() === h));
    signals.push({ platform, source: relPath, evidence: `mentions ${top.map((h) => `“${h}”`).join(', ')}${hits.length > 3 ? ` (${hits.length}×)` : ''}` });
  }
}

function add(p, force) {
  const ext = path.extname(p).toLowerCase();
  if (!(TEXT_EXT.has(ext) || DOC_EXT.has(ext) || API_EXT.has(ext) || IMAGE_EXT.has(ext))) return;
  if (!force && SKIP_FILES.test(path.basename(p))) return;
  files.push({ path: p, ext, force });
}

function classify({ path: p, ext, force }) {
  const relPath = rel(p);
  const nameAndDirs = relPath.replace(/[\\/]/g, ' ').replace(/\.[^.]+$/, '');
  const kind = TEXT_EXT.has(ext) ? 'text' : DOC_EXT.has(ext) ? 'document' : API_EXT.has(ext) ? 'data' : 'image';
  const out = { path: relPath, kind, bytes: fs.statSync(p).size };

  let head = '';
  if (kind === 'text' || kind === 'data') {
    try { head = fs.readFileSync(p, 'utf8').slice(0, 200_000); } catch { head = ''; }
  }

  if (kind === 'data') {
    // Only API descriptions count; ordinary JSON/YAML config is skipped.
    if (/^\s*["']?(openapi|swagger)["']?\s*[:=]/m.test(head) || ['.graphql', '.gql', '.proto'].includes(ext) || /\bapi\b/i.test(nameAndDirs)) {
      return { ...out, category: 'api', title: head.match(/^\s*title:\s*(.+)$/m)?.[1]?.trim() };
    }
    return { ...out, category: force ? 'other' : 'skip' };
  }

  if (kind === 'text') {
    out.words = (head.match(/\S+/g) || []).length;
    out.title = head.match(/^#\s+(.+)$/m)?.[1]?.trim();
    out.figmaLinks = [...head.matchAll(/https?:\/\/(?:www\.)?figma\.com\/[^\s)>\]"']+/g)].map((m) => m[0]);
  }

  const headings = kind === 'text' ? (head.match(/^#{1,3}\s+.+$/gm) || []).slice(0, 12).join(' ') : '';
  const score = { spec: 0, architecture: 0, design: 0, api: 0 };
  for (const { cat, re } of RULES) {
    if (re.test(nameAndDirs)) score[cat] += 3;
    if (headings && re.test(headings)) score[cat] += 1;
    if (out.title && re.test(out.title)) score[cat] += 2;
  }
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  if (best[1] > 0) {
    if (kind === 'text' && best[0] !== 'api') mentionSignals(relPath, head);
    return { ...out, category: best[0] };
  }
  // Images count only where their name or folder says design (or the user passed them explicitly).
  if (kind === 'image') return { ...out, category: force ? 'design' : 'skip' };
  if (kind === 'text' && out.words < 80 && !force) return { ...out, category: 'skip' };
  return { ...out, category: 'other' };
}

function rel(p) { return path.relative(process.cwd(), p) || '.'; }
