#!/usr/bin/env node
// Check whether the official draw.io MCP server (@drawio/mcp) is configured for the coding agents
// on this machine, and optionally configure it. It also reports whether draw.io Desktop is
// installed. Never prints env values, headers or other secrets from config files.
//
//   node check-drawio-mcp.mjs                         report for every agent found
//   node check-drawio-mcp.mjs --host claude,codex     report for specific agents
//   node check-drawio-mcp.mjs --configure --host codex [--scope user|project]
//   node check-drawio-mcp.mjs --smoke                 also start the server once and list its tools
//   node check-drawio-mcp.mjs --json                  machine-readable output
//   node check-drawio-mcp.mjs --global-only           ignore project-level config (for user-wide installs)
//
// The skill works without the server (sketch.mjs writes and opens the .drawio file itself); the
// server adds tools that open a diagram in the draw.io editor.
// Exit code: 0 when every requested agent has the server, 2 when some don't, 1 on usage errors.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_NAME = 'drawio';
const PACKAGE = '@drawio/mcp';
const ALL_HOSTS = ['claude', 'codex', 'cursor', 'gemini'];
const HOME = os.homedir();
const CWD = process.cwd();

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 15).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}

const serverArgs = ['-y', PACKAGE];
const serverEntry = { command: 'npx', args: serverArgs };

const report = { node: checkNode(), desktop: checkDesktop(), hosts: [], smoke: null };
const hosts = resolveHosts(opts.host);

for (const host of hosts) {
  let status = detect(host);
  if (opts.configure && !status.configured) {
    status.configureResult = configure(host, opts.scope);
    status = { ...detect(host), configureResult: status.configureResult };
  }
  report.hosts.push(status);
}

if (opts.smoke) report.smoke = await smokeTest();

if (opts.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report, opts);
}

const missing = report.hosts.filter((h) => h.present && !h.configured);
process.exit(missing.length || (report.smoke && !report.smoke.ok) ? 2 : 0);

// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const o = { host: 'auto', scope: 'user', configure: false, smoke: false, json: false, globalOnly: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--host') o.host = argv[++i];
    else if (a.startsWith('--host=')) o.host = a.slice(7);
    else if (a === '--scope') o.scope = argv[++i];
    else if (a.startsWith('--scope=')) o.scope = a.slice(8);
    else if (a === '--configure') o.configure = true;
    else if (a === '--smoke') o.smoke = true;
    else if (a === '--json') o.json = true;
    else if (a === '--global-only') o.globalOnly = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else { console.error(`Unknown option: ${a}`); process.exit(1); }
  }
  if (!['user', 'project'].includes(o.scope)) { console.error('--scope must be user or project'); process.exit(1); }
  return o;
}

function resolveHosts(spec) {
  if (spec === 'all') return ALL_HOSTS;
  if (spec === 'auto') {
    const found = ALL_HOSTS.filter(hostPresent);
    return found.length ? found : ['claude'];
  }
  const list = spec.split(',').map((s) => s.trim()).filter(Boolean);
  const bad = list.filter((h) => !ALL_HOSTS.includes(h));
  if (bad.length) { console.error(`Unknown host(s): ${bad.join(', ')}. Use ${ALL_HOSTS.join(', ')}, all or auto.`); process.exit(1); }
  return list;
}

function which(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
}

function hostPresent(host) {
  switch (host) {
    case 'claude': return !!which('claude') || fs.existsSync(path.join(HOME, '.claude'));
    case 'codex': return !!which('codex') || fs.existsSync(codexHome());
    case 'cursor': return fs.existsSync(path.join(HOME, '.cursor'));
    case 'gemini': return !!which('gemini') || fs.existsSync(path.join(HOME, '.gemini'));
    default: return false;
  }
}

function codexHome() { return process.env.CODEX_HOME || path.join(HOME, '.codex'); }

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function isDrawio(name, entry = {}) {
  if (/draw\.?io|diagrams\.net/i.test(name)) return true;
  const shape = JSON.stringify({ c: entry.command, a: entry.args, u: entry.url });
  return shape.includes('@drawio/mcp') || shape.includes('drawio-mcp') || shape.includes('mcp.draw.io');
}

function describeEntry(entry = {}) {
  if (entry.url) return entry.url;
  return [entry.command, ...(entry.args || [])].filter(Boolean).join(' ');
}

function fromMcpServers(obj, where) {
  const servers = obj && typeof obj === 'object' ? obj : {};
  return Object.entries(servers)
    .filter(([name, entry]) => isDrawio(name, entry))
    .map(([name, entry]) => ({ name, where, command: describeEntry(entry) }));
}

// --- detection -------------------------------------------------------------

function detect(host) {
  const present = hostPresent(host);
  const cli = { claude: 'claude', codex: 'codex', cursor: null, gemini: 'gemini' }[host];
  const base = { host, present, cli: cli ? !!which(cli) : false, configured: false, found: [] };
  if (!present) return base;
  const found = { claude: detectClaude, codex: detectCodex, cursor: detectCursor, gemini: detectGemini }[host]()
    .filter((f) => !opts.globalOnly || !f.project);
  return { ...base, configured: found.length > 0, found };
}

function detectClaude() {
  const found = [];
  const cfg = readJson(path.join(HOME, '.claude.json'));
  if (cfg) {
    found.push(...fromMcpServers(cfg.mcpServers, '~/.claude.json (user scope)'));
    found.push(...project(fromMcpServers(cfg.projects?.[CWD]?.mcpServers, '~/.claude.json (local scope, this project)')));
  }
  found.push(...project(fromMcpServers(readJson(path.join(CWD, '.mcp.json'))?.mcpServers, './.mcp.json (project scope)')));

  const plugins = readJson(path.join(HOME, '.claude', 'plugins', 'installed_plugins.json'))?.plugins || {};
  for (const [key, installs] of Object.entries(plugins)) {
    for (const inst of [].concat(installs)) {
      if (inst.scope !== 'user' && inst.projectPath && path.resolve(inst.projectPath) !== CWD) continue;
      const mcp = readJson(path.join(inst.installPath || '', '.mcp.json'));
      const hits = fromMcpServers(mcp?.mcpServers, `plugin ${key} (${inst.scope})`);
      found.push(...(inst.scope === 'user' ? hits : project(hits)));
    }
  }

  if (!found.length && which('claude')) {
    // Fall back to the CLI, which also knows about managed and enterprise configuration.
    const r = spawnSync('claude', ['mcp', 'list'], { encoding: 'utf8', timeout: 60_000 });
    for (const line of (r.stdout || '').split(/\r?\n/)) {
      const m = line.match(/^(\S+):\s+(.*?)(?:\s+-\s+[✔✗!].*)?$/);
      if (m && isDrawio(m[1], { command: m[2] })) found.push({ name: m[1], where: 'claude mcp list', command: m[2] });
    }
  }
  return dedupe(found);
}

function tomlServers(file, where) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return []; }
  const found = [];
  const re = /^\[mcp_servers\.("?)([^\]"]+)\1\]\s*$/gm;
  let m;
  const heads = [];
  while ((m = re.exec(text))) heads.push({ name: m[2], start: m.index + m[0].length });
  heads.forEach((h, i) => {
    if (h.name.includes('.')) return; // sub-tables such as [mcp_servers.x.env]
    const end = text.slice(h.start).search(/^\[/m);
    const body = end === -1 ? text.slice(h.start) : text.slice(h.start, h.start + end);
    const command = body.match(/^\s*command\s*=\s*"([^"]*)"/m)?.[1];
    const args = body.match(/^\s*args\s*=\s*\[([^\]]*)\]/m)?.[1];
    const url = body.match(/^\s*url\s*=\s*"([^"]*)"/m)?.[1];
    const entry = { command, url, args: args ? [...args.matchAll(/"([^"]*)"/g)].map((x) => x[1]) : [] };
    if (isDrawio(h.name, entry)) found.push({ name: h.name, where, command: describeEntry(entry) });
  });
  return found;
}

function detectCodex() {
  return dedupe([
    ...tomlServers(path.join(codexHome(), 'config.toml'), `${tilde(codexHome())}/config.toml`),
    ...project(tomlServers(path.join(CWD, '.codex', 'config.toml'), './.codex/config.toml')),
  ]);
}

function detectCursor() {
  return dedupe([
    ...fromMcpServers(readJson(path.join(HOME, '.cursor', 'mcp.json'))?.mcpServers, '~/.cursor/mcp.json'),
    ...project(fromMcpServers(readJson(path.join(CWD, '.cursor', 'mcp.json'))?.mcpServers, './.cursor/mcp.json')),
  ]);
}

function detectGemini() {
  return dedupe([
    ...fromMcpServers(readJson(path.join(HOME, '.gemini', 'settings.json'))?.mcpServers, '~/.gemini/settings.json'),
    ...project(fromMcpServers(readJson(path.join(CWD, '.gemini', 'settings.json'))?.mcpServers, './.gemini/settings.json')),
  ]);
}

function project(list) { return list.map((f) => ({ ...f, project: true })); }

function dedupe(list) {
  const seen = new Set();
  return list.filter((f) => { const k = `${f.name}|${f.where}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

function shortPath(p) { const r = path.relative(CWD, p); return r.startsWith('..') ? tilde(p) : r; }

function tilde(p) { return p.startsWith(HOME) ? `~${p.slice(HOME.length)}` : p; }

// --- configuration ---------------------------------------------------------

function configure(host, scope) {
  try {
    switch (host) {
      case 'claude': return configureClaude(scope);
      case 'codex': return configureCodex(scope);
      case 'cursor': return mergeJsonConfig(scope === 'project' ? path.join(CWD, '.cursor', 'mcp.json') : path.join(HOME, '.cursor', 'mcp.json'));
      case 'gemini': return mergeJsonConfig(scope === 'project' ? path.join(CWD, '.gemini', 'settings.json') : path.join(HOME, '.gemini', 'settings.json'));
    }
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

function configureClaude(scope) {
  if (which('claude')) {
    const args = ['mcp', 'add', '-s', scope, SERVER_NAME, '--', serverEntry.command, ...serverEntry.args];
    const r = spawnSync('claude', args, { encoding: 'utf8', timeout: 60_000 });
    return { ok: r.status === 0, message: `claude ${args.join(' ')}`, output: (r.stdout + r.stderr).trim() };
  }
  if (scope === 'project') return mergeJsonConfig(path.join(CWD, '.mcp.json'));
  return { ok: false, message: 'The claude CLI is not on PATH. Install the mobile-prototyper plugin (it bundles the draw.io MCP server), or re-run with --scope project to write ./.mcp.json.' };
}

function configureCodex(scope) {
  if (scope === 'user' && which('codex')) {
    const args = ['mcp', 'add', SERVER_NAME, '--', serverEntry.command, ...serverEntry.args];
    const r = spawnSync('codex', args, { encoding: 'utf8', timeout: 60_000 });
    if (r.status === 0) return { ok: true, message: `codex ${args.join(' ')}`, output: (r.stdout + r.stderr).trim() };
  }
  const file = scope === 'project' ? path.join(CWD, '.codex', 'config.toml') : path.join(codexHome(), 'config.toml');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  backup(file);
  const block = `\n[mcp_servers.${SERVER_NAME}]\ncommand = "${serverEntry.command}"\nargs = [${serverEntry.args.map((a) => `"${a}"`).join(', ')}]\n`;
  fs.appendFileSync(file, block);
  return { ok: true, message: `appended [mcp_servers.${SERVER_NAME}] to ${tilde(file)}` };
}

function mergeJsonConfig(file) {
  const current = fs.existsSync(file) ? readJson(file) : {};
  if (current === null) return { ok: false, message: `${tilde(file)} is not valid JSON; not touching it. Add the snippet by hand.` };
  backup(file);
  current.mcpServers = { ...(current.mcpServers || {}), [SERVER_NAME]: serverEntry };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
  return { ok: true, message: `added mcpServers.${SERVER_NAME} to ${tilde(file)}` };
}

function backup(file) {
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`);
}

// --- environment and smoke test --------------------------------------------

function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  return { version: process.versions.node, ok: major >= 18, npx: !!which('npx') };
}

/** draw.io Desktop opens .drawio files offline and exports PNG/SVG/PDF; optional. */
function checkDesktop() {
  const mac = process.platform === 'darwin' && fs.existsSync('/Applications/draw.io.app');
  return { installed: mac || !!which('drawio') || !!which('draw.io') };
}

function smokeTest() {
  return new Promise((resolve) => {
    const child = spawn('npx', serverArgs, { stdio: ['pipe', 'pipe', 'pipe'], shell: process.platform === 'win32' });
    let out = '';
    let err = '';
    const done = (result) => { clearTimeout(timer); child.kill(); resolve(result); };
    const timer = setTimeout(() => done({ ok: false, message: 'Timed out after 180 s waiting for the server.', hint: hintFor(err) }), 180_000);
    child.stdout.on('data', (d) => {
      out += d;
      for (const line of out.split('\n')) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === 2) {
            const tools = (msg.result?.tools || []).map((t) => t.name);
            const need = ['open_drawio_xml'];
            const lacking = need.filter((n) => !tools.includes(n));
            done({ ok: lacking.length === 0, tools: tools.length, lacking });
          }
        } catch { /* partial line */ }
      }
    });
    child.stderr.on('data', (d) => { err += d; });
    child.on('exit', (code) => done({ ok: false, message: `Server exited with code ${code}.`, hint: hintFor(err), stderr: err.split('\n').slice(-5).join('\n') }));
    const send = (m) => child.stdin.write(JSON.stringify(m) + '\n');
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'mobile-prototype-check', version: '1' } } });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  });
}

function hintFor(stderr) {
  const m = stderr.match(/ENOTEMPTY[^\n]*?(\S*_npx[\\/][0-9a-f]+)/);
  if (m) return `A half-finished npx download is in the way. Delete ${m[1]} and try again.`;
  if (/ETIMEDOUT|ENOTFOUND|ECONNRESET|proxy/i.test(stderr)) return 'npm could not reach the registry. Check the network or npm proxy settings.';
  return undefined;
}

// --- output ----------------------------------------------------------------

function printReport(r, o) {
  const tick = (b) => (b ? '✔' : '✗');
  console.log(`Node ${r.node.version} ${tick(r.node.ok)}${r.node.ok ? '' : ' (needs Node 18+)'}   npx ${tick(r.node.npx)}`);
  console.log(`draw.io Desktop ${r.desktop.installed ? '✔' : '–  not installed (optional: diagrams open in the browser viewer instead; https://www.drawio.com)'}`);
  console.log('');
  console.log('draw.io MCP server by agent');
  for (const h of r.hosts) {
    if (!h.present) { console.log(`  ${h.host.padEnd(7)} –  not installed on this machine`); continue; }
    if (h.configured) {
      console.log(`  ${h.host.padEnd(7)} ✔  ${h.found.map((f) => `${f.name} (${f.where})`).join('; ')}`);
    } else {
      console.log(`  ${h.host.padEnd(7)} ✗  not configured`);
    }
    if (h.configureResult) console.log(`           ${h.configureResult.ok ? 'configured:' : 'could not configure:'} ${h.configureResult.message}`);
  }
  if (r.smoke) {
    console.log('');
    console.log(r.smoke.ok
      ? `Smoke test ✔  server started and listed ${r.smoke.tools} tools`
      : `Smoke test ✗  ${r.smoke.message || `missing tools: ${r.smoke.lacking.join(', ')}`}${r.smoke.hint ? `\n             ${r.smoke.hint}` : ''}`);
  }
  const missing = r.hosts.filter((h) => h.present && !h.configured);
  console.log('');
  if (missing.length && !o.configure) {
    console.log(`To configure: node ${shortPath(fileURLToPath(import.meta.url))} --configure --host ${missing.map((h) => h.host).join(',')}`);
    console.log('Or add this to any agent that reads JSON MCP config:');
    console.log(JSON.stringify({ mcpServers: { [SERVER_NAME]: serverEntry } }, null, 2));
  }
  if (r.hosts.some((h) => h.configureResult?.ok)) {
    console.log('Restart the agent session so it loads the new MCP server. The sketch works meanwhile.');
  }
}
