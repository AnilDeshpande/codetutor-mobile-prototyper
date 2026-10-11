#!/usr/bin/env node
// Install the mobile-prototype skill into one or more coding agents and configure the official
// draw.io MCP server (@drawio/mcp) for them. Zero dependencies; Node 18+.
//
//   node install.mjs                               install for every agent found (user scope)
//   node install.mjs --agent claude,codex          specific agents: claude, codex, cursor, gemini, agents
//   node install.mjs --scope project               into the current project instead of your home folder
//   node install.mjs --dir ~/.my-agent/skills      any other agent that reads SKILL.md folders
//   node install.mjs --link                        symlink instead of copy (for developing the skill)
//   node install.mjs --skip-mcp                    don't touch MCP configuration
//   node install.mjs --with-design                 also install the optional design skill ui-ux-pro-max (needs Python 3)
//   node install.mjs --dry-run                     show what would happen
//   node install.mjs --update                      replace every installed copy with this version
//   node install.mjs --version                     print this version
//
// Also works as: npx github:<owner>/codetutor-mobile-prototyper -- --agent codex
// To update to a release: npx -y github:<owner>/codetutor-mobile-prototyper#v<version> -- --update

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = 'mobile-prototype';
const SOURCE = path.join(HERE, 'skills', SKILL);
const HOME = os.homedir();
const CWD = process.cwd();

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name) => { const i = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`)); if (i < 0) return undefined; return args[i].includes('=') ? args[i].split('=')[1] : args[i + 1]; };
const flag = (name) => args.includes(`--${name}`);
if (flag('help') || flag('h')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 18).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}

const scope = opt('scope') || 'user';
const dryRun = flag('dry-run');
const link = flag('link');

// Where each agent reads skills from. "agents" is the cross-agent location used by the open
// Agent Skills tooling; many agents (and `npx skills`) read it.
const TARGETS = {
  claude: { user: path.join(HOME, '.claude', 'skills'), project: path.join(CWD, '.claude', 'skills'), mcpHost: 'claude', present: () => has('claude') || exists(HOME, '.claude') },
  codex: { user: path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'skills'), project: path.join(CWD, '.agents', 'skills'), mcpHost: 'codex', present: () => has('codex') || exists(HOME, '.codex') },
  cursor: { user: path.join(HOME, '.cursor', 'skills'), project: path.join(CWD, '.cursor', 'skills'), mcpHost: 'cursor', present: () => exists(HOME, '.cursor') },
  gemini: { user: path.join(HOME, '.gemini', 'skills'), project: path.join(CWD, '.gemini', 'skills'), mcpHost: 'gemini', present: () => has('gemini') || exists(HOME, '.gemini') },
  agents: { user: path.join(HOME, '.agents', 'skills'), project: path.join(CWD, '.agents', 'skills'), mcpHost: null, present: () => false },
};

const versionOf = (dir) => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'assets', 'skill.json'), 'utf8')).version; } catch { return null; } };
const VERSION = versionOf(SOURCE);
if (flag('version')) { console.log(VERSION); process.exit(0); }

function has(cmd) { return spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd]).status === 0; }
function exists(...p) { return fs.existsSync(path.join(...p)); }
function tilde(p) { return p.startsWith(HOME) ? `~${p.slice(HOME.length)}` : p; }

if (Number(process.versions.node.split('.')[0]) < 18) { console.error('Node 18 or newer is required.'); process.exit(1); }
if (!['user', 'project'].includes(scope)) { console.error('--scope must be user or project'); process.exit(1); }

const customDir = opt('dir');

// --update: every copy already installed, in either scope, is replaced by this version. A copy
// installed with --link points at a clone and is left alone; plugin installs update through
// their marketplace. MCP configuration isn't touched.
if (flag('update')) {
  // One folder can be reached two ways (the home folder as the current project, /var vs
  // /private/var): compare real paths of the parent, so a linked copy still reads as a link.
  const seen = new Set();
  const found = [
    ...Object.values(TARGETS).flatMap((t) => [t.user, t.project]),
    ...(customDir ? [path.resolve(customDir.replace(/^~/, HOME))] : []),
  ].map((d) => path.join(d, SKILL)).filter((d) => {
    try { fs.lstatSync(d); } catch { return false; }
    const key = path.join(fs.realpathSync(path.dirname(d)), SKILL);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`Updating ${SKILL} to ${VERSION}${dryRun ? ' — dry run' : ''}`);
  if (!found.length) console.log('  No installed copy found in the usual places. Run without --update to install, or pass --dir <skills folder>.');
  for (const dest of found) {
    if (fs.lstatSync(dest).isSymbolicLink()) { console.log(`  = ${tilde(dest)}: linked to ${tilde(fs.realpathSync(dest))}; update that clone with git pull`); continue; }
    const was = versionOf(dest);
    if (was === VERSION && !flag('force')) { console.log(`  = ${tilde(dest)}: already ${VERSION}`); continue; }
    console.log(`  ↑ ${tilde(dest)}: ${was || 'a version before 0.5.0'} → ${VERSION}`);
    if (dryRun) continue;
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(SOURCE, dest, { recursive: true });
  }
  console.log('Plugin installs update through their marketplace: claude plugin marketplace update codetutor && claude plugin update mobile-prototyper@codetutor, or codex plugin marketplace upgrade codetutor && codex plugin add mobile-prototyper@codetutor.');
  if (found.length && !dryRun) console.log('Start a new agent session to load the new version.');
  process.exit(0);
}
let agents;
if (customDir) agents = [];
else if (opt('agent')) agents = opt('agent').split(',').map((s) => s.trim());
else agents = Object.keys(TARGETS).filter((k) => TARGETS[k].present());
const unknown = agents.filter((a) => !TARGETS[a]);
if (unknown.length) { console.error(`Unknown agent(s): ${unknown.join(', ')}. Use ${Object.keys(TARGETS).join(', ')} or --dir.`); process.exit(1); }
if (!agents.length && !customDir) { agents = ['agents']; console.log('No known agent found; installing to the shared ~/.agents/skills location.'); }

const destinations = [...new Set([
  ...agents.map((a) => path.join(TARGETS[a][scope], SKILL)),
  ...(customDir ? [path.join(path.resolve(customDir.replace(/^~/, HOME)), SKILL)] : []),
])];

console.log(`Installing ${SKILL} ${VERSION} (${link ? 'symlink' : 'copy'}, ${scope} scope)${dryRun ? ' — dry run' : ''}`);
for (const dest of destinations) {
  const note = fs.existsSync(dest) ? ' (replacing existing)' : '';
  console.log(`  → ${tilde(dest)}${note}`);
  if (dryRun) continue;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.rmSync(dest, { recursive: true, force: true });
  if (link) fs.symlinkSync(SOURCE, dest, 'dir');
  else fs.cpSync(SOURCE, dest, { recursive: true });
}

// Optional design provider. Otherwise the skill installs it the first time the user chooses the
// design phase; without it (or without Python 3) the design phase uses its built-in provider.
if (flag('with-design')) {
  console.log('\nOptional design skill (--with-design)');
  // Run the installed copy, so the "remove it" hint it prints points at a path that stays.
  const provider = path.join(dryRun ? SOURCE : destinations[0], 'scripts', 'design-provider.mjs');
  const where = customDir ? ['--dir', customDir] : ['--host', agents[0], '--scope', scope];
  spawnSync(process.execPath, [provider, '--install', ...where, ...(dryRun ? ['--dry-run'] : [])], { stdio: 'inherit' });
}

if (flag('skip-mcp')) {
  console.log('\nSkipped the draw.io MCP server (--skip-mcp). The skill still writes and opens the sketch without it.');
  process.exit(0);
}

const mcpHosts = [...new Set(agents.map((a) => TARGETS[a].mcpHost).filter(Boolean))];
if (!mcpHosts.length) {
  console.log('\nTo open sketches in the draw.io editor from your agent, add the draw.io MCP server to it (optional):');
  console.log(JSON.stringify({ mcpServers: { drawio: { command: 'npx', args: ['-y', '@drawio/mcp'] } } }, null, 2));
  process.exit(0);
}

console.log(`\ndraw.io MCP server for: ${mcpHosts.join(', ')}`);
const checker = path.join(SOURCE, 'scripts', 'check-drawio-mcp.mjs');
const checkArgs = [checker, '--host', mcpHosts.join(','), '--scope', scope, ...(scope === 'user' ? ['--global-only'] : []), ...(dryRun ? [] : ['--configure'])];
const r = spawnSync(process.execPath, checkArgs, { stdio: 'inherit' });
if (!dryRun) console.log(`\nDone. Restart your agent, then ask it to "sketch the <feature> flow from <your docs>".`);
process.exit(r.status ?? 0);
