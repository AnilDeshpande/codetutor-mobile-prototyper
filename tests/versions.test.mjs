// The skill's version, the update check and the installer's --update.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, SKILL, run } from './helpers.mjs';

const VERSION = JSON.parse(fs.readFileSync(path.join(SKILL, 'assets', 'skill.json'), 'utf8')).version;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-prototype-test-'));

test('every file that carries the version agrees, and CHANGELOG.md has notes for it', () => {
  for (const f of ['package.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', '.codex-plugin/plugin.json']) {
    const found = [...fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/"version":\s*"([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(found, [VERSION], f);
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'), new RegExp(`^## ${VERSION.replace(/\./g, '\\.')}\\n\\n- `, 'm'));
  assert.equal(spawnSync(process.execPath, ['install.mjs', '--version'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim(), VERSION);
});

/** Runs check-update.mjs from a copy of the skill at <home>/<where>, with GitHub's answer faked. */
function checkUpdate({ where, release, env = {}, args = ['--force'] }) {
  const home = tmp();
  let script = path.join(SKILL, 'scripts', 'check-update.mjs');
  if (where) {
    const dir = path.join(home, where);
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    fs.cpSync(SKILL, dir, { recursive: true });
    script = path.join(dir, 'scripts', 'check-update.mjs');
  }
  const answer = path.join(home, 'release.json');
  if (release) fs.writeFileSync(answer, JSON.stringify(release));
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: { ...process.env, MOBILE_PROTOTYPE_CACHE: path.join(home, 'cache'), MOBILE_PROTOTYPE_RELEASE_JSON: answer, ...env } });
  return { code: r.status, out: `${r.stdout}${r.stderr}`, home, answer, script };
}
const newer = { tag_name: 'v9.0.0', html_url: 'https://github.com/AnilDeshpande/codetutor-mobile-prototyper/releases/tag/v9.0.0' };

test('a newer release says how to update a copied folder: the installer pinned to that release', () => {
  const r = checkUpdate({ where: '.cursor/skills/mobile-prototype', release: newer });
  assert.equal(r.code, 0);
  assert.match(r.out, new RegExp(`! mobile-prototype 9\\.0\\.0 is available; this is ${VERSION.replace(/\./g, '\\.')}\\. What's new: https://github\\.com/.+/v9\\.0\\.0`));
  assert.match(r.out, /To update: npx -y github:AnilDeshpande\/codetutor-mobile-prototyper#v9\.0\.0 -- --update/);
});

test('plugin installs get their plugin commands, a clone gets git', () => {
  assert.match(checkUpdate({ where: '.claude/plugins/cache/codetutor/mobile-prototyper/0.5.0/skills/mobile-prototype', release: newer }).out,
    /To update: claude plugin marketplace update codetutor\n\s+claude plugin update mobile-prototyper@codetutor/);
  assert.match(checkUpdate({ where: '.codex/plugins/cache/codetutor/mobile-prototyper/skills/mobile-prototype', release: newer }).out,
    /To update: codex plugin marketplace upgrade codetutor\n\s+codex plugin add mobile-prototyper@codetutor/);
  assert.match(checkUpdate({ release: newer }).out, /To update: cd .*\n\s+git pull/);
});

test('up to date, ahead, no release, offline and turned off all say so and exit 0', () => {
  let r = checkUpdate({ release: { tag_name: `v${VERSION}` } });
  assert.match(r.out, /is the latest release/);
  r = checkUpdate({ release: { tag_name: 'v0.1.0' } });
  assert.match(r.out, /is newer than the latest release \(0\.1\.0\)/);
  r = checkUpdate({ release: { none: true } });
  assert.match(r.out, /no release has been published yet/);
  r = checkUpdate({}); // the stand-in answer is missing, like a failed request
  assert.equal(r.code, 0);
  assert.match(r.out, /couldn't check for a newer release .*Carrying on/);
  r = checkUpdate({ release: newer, env: { MOBILE_PROTOTYPE_NO_UPDATE_CHECK: '1' } });
  assert.match(r.out, /update check turned off/);
  assert.doesNotMatch(r.out, /available/);
});

test('the answer is reused for a day unless --force', () => {
  const r = checkUpdate({ release: { tag_name: `v${VERSION}` } });
  fs.writeFileSync(r.answer, JSON.stringify(newer));
  const env = { ...process.env, MOBILE_PROTOTYPE_CACHE: path.join(r.home, 'cache'), MOBILE_PROTOTYPE_RELEASE_JSON: r.answer };
  assert.match(spawnSync(process.execPath, [r.script], { encoding: 'utf8', env }).stdout, /is the latest release/);
  assert.match(spawnSync(process.execPath, [r.script, '--force'], { encoding: 'utf8', env }).stdout, /9\.0\.0 is available/);
});

test('install.mjs --update replaces older copies, leaves linked ones and current ones alone', () => {
  const home = tmp();
  const env = { ...process.env, HOME: home };
  const installer = (...a) => spawnSync(process.execPath, [path.join(ROOT, 'install.mjs'), ...a], { cwd: home, encoding: 'utf8', env });
  assert.equal(installer('--agent', 'claude,codex', '--skip-mcp').status, 0);
  const claude = path.join(home, '.claude', 'skills', 'mobile-prototype');
  const codex = path.join(home, '.codex', 'skills', 'mobile-prototype');
  const cursor = path.join(home, '.cursor', 'skills', 'mobile-prototype');
  const skillJson = path.join(claude, 'assets', 'skill.json');
  fs.writeFileSync(skillJson, fs.readFileSync(skillJson, 'utf8').replace(`"version": "${VERSION}"`, '"version": "0.4.9"'));
  fs.rmSync(path.join(codex, 'assets', 'skill.json'));
  fs.writeFileSync(path.join(codex, 'stale.txt'), 'from an old version');
  fs.mkdirSync(path.dirname(cursor), { recursive: true });
  fs.symlinkSync(SKILL, cursor, 'dir');

  let r = installer('--update', '--dry-run');
  assert.match(r.stdout, /↑ ~\/\.claude\/skills\/mobile-prototype: 0\.4\.9 →/);
  assert.match(fs.readFileSync(skillJson, 'utf8'), /0\.4\.9/, 'a dry run changes nothing');

  r = installer('--update');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`↑ ~/\\.claude/skills/mobile-prototype: 0\\.4\\.9 → ${VERSION.replace(/\./g, '\\.')}`));
  assert.match(r.stdout, /↑ ~\/\.codex\/skills\/mobile-prototype: a version before 0\.5\.0 →/);
  assert.equal(r.stdout.match(/\.claude\/skills\/mobile-prototype/g).length, 1, 'the home folder is also the current folder here: one copy, listed once');
  assert.match(r.stdout, /= ~\/\.cursor\/skills\/mobile-prototype: linked to .*; update that clone with git pull/);
  assert.equal(JSON.parse(fs.readFileSync(skillJson, 'utf8')).version, VERSION);
  assert.ok(!fs.existsSync(path.join(codex, 'stale.txt')), 'the old copy is replaced, not merged');
  assert.ok(fs.lstatSync(cursor).isSymbolicLink());
  assert.match(installer('--update').stdout, new RegExp(`= ~/\\.claude/skills/mobile-prototype: already ${VERSION.replace(/\./g, '\\.')}`));
});

test('a new prototype records the skill version that started it', () => {
  const dir = tmp();
  assert.equal(run('scaffold.mjs', ['--out', 'docs/prototypes'], dir).code, 0);
  assert.match(fs.readFileSync(path.join(dir, 'docs', 'prototypes', 'notes', 'STATE.md'), 'utf8'), new RegExp(`\\| Skill version \\| ${VERSION.replace(/\./g, '\\.')} `));
});
