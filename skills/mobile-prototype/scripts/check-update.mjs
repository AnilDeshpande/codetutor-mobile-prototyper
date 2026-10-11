#!/usr/bin/env node
// Is a newer release of this skill out? Compares the installed version (assets/skill.json) with
// the latest GitHub release of the skill's repository and, if newer, says how to update this
// installation: the plugin commands for a Claude Code or Codex plugin, git for a clone, otherwise
// the installer's --update. It never updates anything itself and never fails the caller: offline,
// rate-limited or no release yet, it says so and exits 0.
//
//   node check-update.mjs [--force]
//
//   --force   ask GitHub now; otherwise the answer is reused for a day
//
// MOBILE_PROTOTYPE_NO_UPDATE_CHECK=1 turns the check off. The answer is cached in
// $XDG_CACHE_HOME/mobile-prototype (default ~/.cache/mobile-prototype).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flag = (n) => process.argv.includes(`--${n}`);
const say = (s) => console.log(s);

let skill;
try { skill = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'assets', 'skill.json'), 'utf8')); } catch {
  say('! This copy of the skill has no assets/skill.json, so its version is unknown. Reinstall it to get updates.');
  process.exit(0);
}
const here = skill.version;
if (process.env.MOBILE_PROTOTYPE_NO_UPDATE_CHECK === '1') { say(`mobile-prototype ${here} (update check turned off)`); process.exit(0); }

/** -1, 0 or 1; "1.2.3" style, anything after "-" (a pre-release) sorts before the release. */
export function compare(a, b) {
  const parse = (v) => { const [core, pre] = String(v).replace(/^v/, '').split('-'); return [...core.split('.').map((x) => Number(x) || 0), pre ? 0 : 1]; };
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 4; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0) ? -1 : 1;
  return 0;
}

const cacheDir = process.env.MOBILE_PROTOTYPE_CACHE || path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'mobile-prototype');
const cacheFile = path.join(cacheDir, 'latest-release.json');
const DAY = 24 * 60 * 60 * 1000;

async function latest() {
  if (!flag('force')) {
    try {
      const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (c.repository === skill.repository && Date.now() - c.checked < DAY) return c;
    } catch { /* no cache yet */ }
  }
  let release;
  if (process.env.MOBILE_PROTOTYPE_RELEASE_JSON) { // tests: a file standing in for GitHub's answer
    release = JSON.parse(fs.readFileSync(process.env.MOBILE_PROTOTYPE_RELEASE_JSON, 'utf8'));
  } else {
    const repo = new URL(skill.repository).pathname.replace(/^\/|\.git$/g, '');
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': `mobile-prototype/${here}` },
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 404) release = { none: true };
    else if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    else release = await res.json();
  }
  const out = { repository: skill.repository, checked: Date.now(), none: !!release.none, version: release.tag_name ? release.tag_name.replace(/^v/, '') : null, url: release.html_url || null };
  try { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(out)); } catch { /* a read-only home is fine */ }
  return out;
}

/** How this installation is updated, judged by where it lives. */
function howToUpdate(version) {
  const where = fs.realpathSync(SKILL_DIR).split(path.sep).join('/');
  if (where.includes('/.claude/plugins/')) {
    return [`claude plugin marketplace update ${skill.marketplace}`, `claude plugin update ${skill.plugin}@${skill.marketplace}`, 'then restart Claude Code'];
  }
  if (where.includes('/.codex/plugins/')) {
    return [`codex plugin marketplace upgrade ${skill.marketplace}`, `codex plugin add ${skill.plugin}@${skill.marketplace}`, 'then restart Codex'];
  }
  const repoRoot = path.resolve(fs.realpathSync(SKILL_DIR), ...skill.skillPath.split('/').map(() => '..'));
  if (fs.existsSync(path.join(repoRoot, '.git'))) {
    return [`cd ${repoRoot}`, 'git pull', `(or git checkout v${version} for exactly this release); a copy installed with --link follows the clone`];
  }
  const repo = new URL(skill.repository).pathname.replace(/^\/|\.git$/g, '');
  return [`npx -y github:${repo}#v${version} -- --update`, 'it replaces every copy of the skill it finds (Claude Code, Codex, Cursor, Gemini CLI, ~/.agents); then start a new agent session'];
}

try {
  const r = await latest();
  if (r.none || !r.version) say(`mobile-prototype ${here}: no release has been published yet, so there is nothing to compare with.`);
  else if (compare(here, r.version) < 0) {
    const [first, ...rest] = howToUpdate(r.version);
    say(`! mobile-prototype ${r.version} is available; this is ${here}.${r.url ? ` What's new: ${r.url}` : ''}`);
    say(`  To update: ${first}`);
    for (const line of rest) say(`             ${line}`);
  } else if (compare(here, r.version) > 0) say(`✓ mobile-prototype ${here} is newer than the latest release (${r.version}).`);
  else say(`✓ mobile-prototype ${here} is the latest release.`);
} catch (e) {
  say(`mobile-prototype ${here}: couldn't check for a newer release (${e.name === 'TimeoutError' ? 'no answer from GitHub' : e.message}). Carrying on.`);
}
