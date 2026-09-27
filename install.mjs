#!/usr/bin/env node
// Install the mobile-prototype skill into one or more coding agents and make sure the Playwright MCP
// server (a hard dependency) is configured for them. Zero dependencies; Node 18+.
//
//   node install.mjs                               install for every agent found (user scope)
//   node install.mjs --agent claude,codex          specific agents: claude, codex, cursor, gemini, agents
//   node install.mjs --scope project               into the current project instead of your home folder
//   node install.mjs --dir ~/.my-agent/skills      any other agent that reads SKILL.md folders
//   node install.mjs --link                        symlink instead of copy (for developing the skill)
//   node install.mjs --skip-mcp                    don't touch MCP configuration
//   node install.mjs --dry-run                     show what would happen
//
// Also works as: npx github:<owner>/codetutor-mobile-prototyper -- --agent codex

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
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 14).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
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

function has(cmd) { return spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd]).status === 0; }
function exists(...p) { return fs.existsSync(path.join(...p)); }
function tilde(p) { return p.startsWith(HOME) ? `~${p.slice(HOME.length)}` : p; }

if (Number(process.versions.node.split('.')[0]) < 18) { console.error('Node 18 or newer is required.'); process.exit(1); }
if (!['user', 'project'].includes(scope)) { console.error('--scope must be user or project'); process.exit(1); }

const customDir = opt('dir');
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

console.log(`Installing ${SKILL} (${link ? 'symlink' : 'copy'}, ${scope} scope)${dryRun ? ' — dry run' : ''}`);
for (const dest of destinations) {
  const note = fs.existsSync(dest) ? ' (replacing existing)' : '';
  console.log(`  → ${tilde(dest)}${note}`);
  if (dryRun) continue;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.rmSync(dest, { recursive: true, force: true });
  if (link) fs.symlinkSync(SOURCE, dest, 'dir');
  else fs.cpSync(SOURCE, dest, { recursive: true });
}

if (flag('skip-mcp')) {
  console.log('\nSkipped Playwright MCP configuration (--skip-mcp). The skill needs it for verification.');
  process.exit(0);
}

const mcpHosts = [...new Set(agents.map((a) => TARGETS[a].mcpHost).filter(Boolean))];
if (!mcpHosts.length) {
  console.log('\nConfigure the Playwright MCP server in your agent (it is required for verification):');
  console.log(JSON.stringify({ mcpServers: { playwright: { command: 'npx', args: ['-y', '@playwright/mcp@latest', '--isolated'] } } }, null, 2));
  process.exit(0);
}

console.log(`\nPlaywright MCP (required dependency) for: ${mcpHosts.join(', ')}`);
const checker = path.join(SOURCE, 'scripts', 'check-playwright-mcp.mjs');
const checkArgs = [checker, '--host', mcpHosts.join(','), '--scope', scope, ...(scope === 'user' ? ['--global-only'] : []), ...(dryRun ? [] : ['--configure'])];
const r = spawnSync(process.execPath, checkArgs, { stdio: 'inherit' });
if (!dryRun) console.log(`\nDone. Restart your agent, then ask it to "prototype <feature> from <your docs>".`);
process.exit(r.status ?? 0);
