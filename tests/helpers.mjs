// Shared by the tests: run a skill script in a throwaway project folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SKILL = path.join(ROOT, 'skills', 'mobile-prototype');
export const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'overview-states', 'flow.json');

/** A temporary project with a prototype workspace in docs/prototypes, holding the given spec. */
export function project(spec) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-prototype-test-'));
  const ws = path.join(dir, 'docs', 'prototypes');
  fs.mkdirSync(path.join(ws, 'notes'), { recursive: true });
  fs.writeFileSync(path.join(ws, 'notes', 'STATE.md'), '# state\n');
  if (spec) fs.writeFileSync(path.join(ws, 'flow.json'), typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2));
  return { dir, ws, file: (...p) => path.join(ws, ...p), read: (...p) => fs.readFileSync(path.join(ws, ...p), 'utf8') };
}

/** Runs scripts/<name> with args in cwd; returns { code, out } with stdout and stderr together. */
export function run(name, args = [], cwd = ROOT, script = path.join(SKILL, 'scripts', name)) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

export const fixture = () => JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
