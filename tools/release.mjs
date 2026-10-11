#!/usr/bin/env node
// Cut a release of the skill. A release is a git tag v<version> with a GitHub Release; that is
// what an installed skill's scripts/check-update.mjs compares itself with.
//
//   node tools/release.mjs <version>    set the version everywhere and open its CHANGELOG section
//   node tools/release.mjs --check      versions agree, CHANGELOG has the version, tests pass
//   node tools/release.mjs --publish    after the release PR is merged, on an up-to-date main:
//                                       --check, then tag v<version>, push the tag and create
//                                       the GitHub Release with the CHANGELOG section as notes
//
// The version lives in five files, which must agree: package.json, the two plugin manifests, the
// Claude Code marketplace entry and the skill's own assets/skill.json.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const VERSION_FILES = ['package.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', '.codex-plugin/plugin.json', 'skills/mobile-prototype/assets/skill.json'];
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const die = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const sh = (cmd, args, quiet) => {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit' });
  if (r.status !== 0) die(`${cmd} ${args.join(' ')} failed${quiet ? `:\n${r.stdout}${r.stderr}` : ''}`);
  return (r.stdout || '').trim();
};
const versions = () => Object.fromEntries(VERSION_FILES.map((f) => [f, [...read(f).matchAll(/"version":\s*"([^"]+)"/g)].map((m) => m[1])]));
/** The CHANGELOG section for a version, without its heading. */
export const notesFor = (text, v) => { const m = text.match(new RegExp(`^## ${v.replace(/\./g, '\\.')}\\b.*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm')); return m ? m[1].trim() : null; };

function check() {
  const all = versions();
  const found = [...new Set(Object.values(all).flat())];
  if (found.length !== 1 || Object.values(all).some((v) => !v.length)) die(`The version files disagree:\n${Object.entries(all).map(([f, v]) => `    ${f}: ${v.join(', ') || 'none'}`).join('\n')}\n  Run: node tools/release.mjs <version>`);
  const v = found[0];
  if (!notesFor(read('CHANGELOG.md'), v)) die(`CHANGELOG.md has no "## ${v}" section with notes.`);
  sh('npm', ['test', '--silent'], true);
  console.log(`✓ ${v}: version files agree, CHANGELOG has notes, tests pass`);
  return v;
}

const arg = process.argv[2];
if (!arg || arg === '--help') { console.log(read('tools/release.mjs').split('\n').slice(1, 13).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(0); }
if (arg === '--check') check();
else if (arg === '--publish') {
  const v = check();
  if (sh('git', ['rev-parse', '--abbrev-ref', 'HEAD'], true) !== 'main') die('Publish from main, after the release PR is merged.');
  if (sh('git', ['status', '--porcelain'], true)) die('The working tree has changes.');
  sh('git', ['fetch', '--quiet', '--tags', 'origin'], true);
  if (sh('git', ['rev-parse', 'HEAD'], true) !== sh('git', ['rev-parse', 'origin/main'], true)) die('main is not the same as origin/main: pull or push first.');
  if (sh('git', ['tag', '--list', `v${v}`], true)) die(`Tag v${v} already exists: set a new version first.`);
  const notes = notesFor(read('CHANGELOG.md'), v);
  sh('git', ['tag', '-a', `v${v}`, '-m', `mobile-prototype ${v}`]);
  sh('git', ['push', 'origin', `v${v}`]);
  sh('gh', ['release', 'create', `v${v}`, '--title', `mobile-prototype ${v}`, '--notes', notes, '--verify-tag']);
  console.log(`✓ Released v${v}. Installed copies see it through scripts/check-update.mjs within a day.`);
} else if (/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(arg)) {
  for (const f of VERSION_FILES) fs.writeFileSync(path.join(root, f), read(f).replace(/("version":\s*")[^"]+(")/g, `$1${arg}$2`));
  const log = read('CHANGELOG.md');
  if (!new RegExp(`^## ${arg.replace(/\./g, '\\.')}\\b`, 'm').test(log)) {
    fs.writeFileSync(path.join(root, 'CHANGELOG.md'), log.replace(/^## /m, `## ${arg}\n\n- \n\n## `));
  }
  console.log(`✓ Version set to ${arg} in ${VERSION_FILES.join(', ')}.\n  Write its notes in CHANGELOG.md, merge the PR, then on main: node tools/release.mjs --publish`);
} else die(`Unknown argument "${arg}". See: node tools/release.mjs --help`);
