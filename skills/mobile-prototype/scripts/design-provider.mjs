#!/usr/bin/env node
// The optional design provider for the design phase: find, install, run or remove the ui-ux-pro-max skill
// (MIT, © Next Level Builder). The prototype workflow never needs it; without it (or without
// Python 3) the design phase uses the built-in baseline provider.
//
//   node design-provider.mjs --check [--json]                  is it installed and usable?
//   node design-provider.mjs --install --host claude [--json]  install the pinned release (hosts: claude, codex, cursor, gemini, agents)
//          [--scope project] [--dir <skills folder>]           (only that one skill + its licence; needs Python 3)
//   node design-provider.mjs --run -- "<query>" [search.py options]   run its search with the right Python and path
//   node design-provider.mjs --remove --host claude            remove a copy this script installed
//
// Exit codes: 0 usable / done, 2 not installed or not usable (use the baseline provider), 1 error.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { download, untar } from './lib/fetch-archive.mjs';

const PIN = {
  name: 'ui-ux-pro-max',
  version: 'v2.15.0',
  commit: 'a38d04c3d5c298c851dbe5e6ee1965ee3de42cb5',
  repo: 'github.com/nextlevelbuilder/ui-ux-pro-max-skill',
  url: 'https://codeload.github.com/nextlevelbuilder/ui-ux-pro-max-skill/tar.gz/a38d04c3d5c298c851dbe5e6ee1965ee3de42cb5',
  integrity: 'sha512-BzLNFEWh39UaAv50jzAIWka9KTByMC3YFwmBQFWvhbvGQCDdc9y43K6Vq1+lAuXo8/u74xb8wrkYE+FINaubFQ==',
  license: 'MIT, © 2024 Next Level Builder',
  skillPath: '.claude/skills/ui-ux-pro-max/',
};
const MARKER = '.mobile-prototype-install.json';

const argv = process.argv.slice(2);
const dd = argv.indexOf('--');
const args = dd >= 0 ? argv.slice(0, dd) : argv;
const passThrough = dd >= 0 ? argv.slice(dd + 1) : [];
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const flag = (n) => args.includes(`--${n}`);
const asJson = flag('json');
const HOME = os.homedir();
const tilde = (p) => (p.startsWith(HOME) ? `~${p.slice(HOME.length)}` : p);

if (flag('help') || flag('h') || !['check', 'install', 'run', 'remove'].some(flag)) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 13).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(flag('help') || flag('h') ? 0 : 1);
}

// ---------- where skills live ----------
const codexHome = process.env.CODEX_HOME || path.join(HOME, '.codex');
const HOSTS = {
  claude: { user: path.join(HOME, '.claude', 'skills'), project: path.join(process.cwd(), '.claude', 'skills') },
  codex: { user: path.join(codexHome, 'skills'), project: path.join(process.cwd(), '.agents', 'skills') },
  cursor: { user: path.join(HOME, '.cursor', 'skills'), project: path.join(process.cwd(), '.cursor', 'skills') },
  gemini: { user: path.join(HOME, '.gemini', 'skills'), project: path.join(process.cwd(), '.gemini', 'skills') },
  agents: { user: path.join(HOME, '.agents', 'skills'), project: path.join(process.cwd(), '.agents', 'skills') },
};

function candidates() {
  const list = [];
  if (process.env.UI_UX_PRO_MAX_DIR) list.push(path.resolve(process.env.UI_UX_PRO_MAX_DIR));
  for (const h of Object.values(HOSTS)) list.push(path.join(h.project, PIN.name), path.join(h.user, PIN.name));
  // Claude Code plugin installs keep the whole upstream repository in the plugin cache.
  const cache = path.join(HOME, '.claude', 'plugins', 'cache');
  (function walk(dir, depth) {
    if (depth > 5) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (!e.isDirectory() || e.name === 'node_modules') continue;
      const p = path.join(dir, e.name);
      if (e.name === PIN.name && fs.existsSync(path.join(p, 'scripts', 'search.py'))) list.push(p);
      else walk(p, depth + 1);
    }
  })(cache, 0);
  return [...new Set(list)];
}

function describe(dir) {
  if (!fs.existsSync(path.join(dir, 'scripts', 'search.py')) || !fs.existsSync(path.join(dir, 'SKILL.md'))) return null;
  let marker = null;
  try { marker = JSON.parse(fs.readFileSync(path.join(dir, MARKER), 'utf8')); } catch { /* installed some other way */ }
  return { path: dir, version: marker?.version || 'unknown (installed separately)', installedBy: marker ? 'mobile-prototype' : 'separately', marker };
}

function findPython() {
  const tries = process.platform === 'win32' ? [['py', ['-3']], ['python', []], ['python3', []]] : [['python3', []], ['python', []]];
  for (const [cmd, pre] of tries) {
    const r = spawnSync(cmd, [...pre, '-c', 'import sys; print("%d.%d.%d" % sys.version_info[:3]); sys.exit(0 if sys.version_info >= (3, 8) else 3)'], { encoding: 'utf8' });
    if (r.status === 0) return { cmd, pre, version: r.stdout.trim() };
  }
  return null;
}

function smoke(dir, py) {
  const r = spawnSync(py.cmd, [...py.pre, path.join(dir, 'scripts', 'search.py'), 'healthcare mobile app', '--domain', 'product', '--json', '-n', '1'], { encoding: 'utf8', timeout: 30_000 });
  return r.status === 0 && r.stdout.trim().startsWith('{') ? null : (r.stderr || r.stdout || `exit ${r.status}`).trim().split('\n').slice(-1)[0];
}

function check() {
  const installs = candidates().map(describe).filter(Boolean);
  const python = findPython();
  const chosen = installs[0] || null;
  let usable = !!(chosen && python), reason = null;
  if (!chosen) reason = 'not installed';
  else if (!python) reason = 'Python 3.8+ not found';
  else { const err = smoke(chosen.path, python); if (err) { usable = false; reason = `its search script failed: ${err}`; } }
  return { provider: PIN.name, usable, reason, install: chosen, others: installs.slice(1).map((i) => i.path), python, pinned: `${PIN.version} (${PIN.commit.slice(0, 7)})` };
}

const out = (obj, text) => { if (asJson) console.log(JSON.stringify(obj, null, 2)); else console.log(text); };

// ---------- --check ----------
if (flag('check')) {
  const c = check();
  const lines = [
    c.usable ? `✔ ${PIN.name} is available: ${tilde(c.install.path)} (${c.install.version}, installed ${c.install.installedBy})` : `✗ ${PIN.name} is not usable: ${c.reason}`,
    `  Python: ${c.python ? `${c.python.cmd} ${c.python.version}` : 'not found (Python 3.8 or newer is needed; the baseline provider works without it)'}`,
    ...(c.install ? [] : [`  Install it with: node ${tilde(fileURLToPath(import.meta.url))} --install --host <claude|codex|…>`]),
  ];
  out(c, lines.join('\n'));
  process.exit(c.usable ? 0 : 2);
}

// ---------- --run ----------
if (flag('run')) {
  const c = check();
  if (!c.usable) { console.error(`${PIN.name} is not usable (${c.reason}); use the baseline provider.`); process.exit(2); }
  const r = spawnSync(c.python.cmd, [...c.python.pre, path.join(c.install.path, 'scripts', 'search.py'), ...passThrough], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

// ---------- destination for --install / --remove ----------
const host = opt('host');
const scope = opt('scope') || 'user';
let dest;
if (opt('dir')) dest = path.join(path.resolve(opt('dir').replace(/^~/, HOME)), PIN.name);
else if (HOSTS[host] && HOSTS[host][scope]) dest = path.join(HOSTS[host][scope], PIN.name);
else {
  console.error(`--host must be one of ${Object.keys(HOSTS).join(', ')} (or pass --dir <skills folder>); --scope user|project.`);
  process.exit(1);
}

// ---------- --remove ----------
if (flag('remove')) {
  const d = describe(dest);
  if (!d) { out({ removed: false, reason: 'not installed there' }, `Nothing to remove at ${tilde(dest)}.`); process.exit(0); }
  if (d.installedBy !== 'mobile-prototype' && !flag('force')) {
    out({ removed: false, reason: 'installed separately' }, `${tilde(dest)} wasn't installed by mobile-prototype; leaving it. (--force removes it anyway.)`);
    process.exit(1);
  }
  fs.rmSync(dest, { recursive: true, force: true });
  out({ removed: true, path: dest }, `Removed ${PIN.name} from ${tilde(dest)}.`);
  process.exit(0);
}

// ---------- --install ----------
const existing = check();
if (existing.install && !flag('force')) {
  out({ installed: false, alreadyInstalled: true, ...existing },
    `${PIN.name} is already installed at ${tilde(existing.install.path)} (${existing.install.version}); not installing another copy.${existing.usable ? '' : `\nIt isn't usable yet: ${existing.reason}.`}`);
  process.exit(existing.usable ? 0 : 2);
}
const python = existing.python;
if (!python) {
  const how = process.platform === 'darwin' ? 'Install Python 3 from python.org or with Homebrew (brew install python).'
    : process.platform === 'win32' ? 'Install Python 3 from python.org or the Microsoft Store.' : 'Install Python 3 with your package manager (for example apt install python3).';
  out({ installed: false, reason: 'python-missing', fallback: 'baseline' },
    `${PIN.name} needs Python 3.8 or newer, which wasn't found, so it was not installed.\n${how} Until then the design phase uses the built-in baseline provider.`);
  process.exit(2);
}

const notice = [
  `Installing the design skill ${PIN.name} ${PIN.version} (${PIN.license})`,
  `  From: ${PIN.repo}, release ${PIN.version} (commit ${PIN.commit.slice(0, 7)}), integrity-checked`,
  `  Into: ${tilde(dest)} — only this skill and its licence; the other skills in that repository are not installed`,
  `  Needs Python 3: found ${python.version} (${python.cmd})`,
  `  It is a normal skill: your agent can also use it outside the prototype workflow.`,
  `  Remove it any time: node ${tilde(fileURLToPath(import.meta.url))} --remove ${opt('dir') ? `--dir ${opt('dir')}` : `--host ${host}${scope === 'project' ? ' --scope project' : ''}`} (or delete that folder)`,
];
if (!asJson) console.log(notice.join('\n'));
if (flag('dry-run')) process.exit(0);

const tmp = `${dest}.tmp-${process.pid}`;
try {
  const buf = await download(PIN.url, PIN.integrity, { timeoutMs: 120_000 });
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const files = untar(buf, tmp, (name) => {
    const rel = name.split('/').slice(1).join('/');
    if (rel === 'LICENSE') return 'LICENSE';
    if (!rel.startsWith(PIN.skillPath)) return null;
    const inner = rel.slice(PIN.skillPath.length);
    return inner && !inner.startsWith('scripts/tests/') ? inner : null;
  });
  if (!files.includes('SKILL.md') || !files.includes('scripts/search.py')) throw new Error('the release does not contain the expected skill files');
  fs.writeFileSync(path.join(tmp, MARKER), JSON.stringify({ name: PIN.name, version: PIN.version, commit: PIN.commit, source: `https://${PIN.repo}`, license: PIN.license, installedAt: new Date().toISOString(), installedBy: 'mobile-prototype design-provider.mjs' }, null, 2) + '\n');
  const err = smoke(tmp, python);
  if (err) throw new Error(`its search script failed after install: ${err}`);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(tmp, dest);
  out({ installed: true, path: dest, version: PIN.version, commit: PIN.commit, files: files.length, python, notice }, `✔ Installed ${files.length} files. The design phase will use ${PIN.name}.`);
  process.exit(0);
} catch (e) {
  fs.rmSync(tmp, { recursive: true, force: true });
  out({ installed: false, reason: e.message, fallback: 'baseline', notice }, `✗ ${PIN.name} was not installed: ${e.message}\n  Nothing was changed. The design phase uses the built-in baseline provider.`);
  process.exit(2);
}
