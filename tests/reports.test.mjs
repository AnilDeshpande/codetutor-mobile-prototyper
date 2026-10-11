// Generated reports explain their IDs (issue #6), link the skill references that define them
// (issue #7) and say how to open the sketch (issue #8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, SKILL, project, run } from './helpers.mjs';

const read = (...p) => fs.readFileSync(path.join(SKILL, ...p), 'utf8');
const templates = ['CLARIFICATIONS.md', 'DECISIONS.md', 'HANDOFF.md', 'README.md'];

test('the question-ID legend lists exactly the question bank groups, in order', () => {
  const bank = [...read('references', 'question-bank.md').matchAll(/^## ([A-Z]) — (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
  const legend = read('assets', 'templates', 'CLARIFICATIONS.md').split('## How to read the IDs')[1].split('\n## ')[0];
  const rows = [...legend.matchAll(/^\| ([A-Z]) \| (.+) \|$/gm)].map((m) => `${m[1]} ${m[2]}`);
  assert.ok(bank.length >= 9);
  assert.deepEqual(rows, bank);
});

test('the legend explains numbers, grouped IDs, ranges, origin, and what the IDs are not', () => {
  const legend = read('assets', 'templates', 'CLARIFICATIONS.md').split('## How to read the IDs')[1].split('\n## ')[0];
  assert.match(legend, /not a priority/);
  assert.match(legend, /`P1\/P2` is questions P1 and P2/);
  assert.match(legend, /`J1–J3` is J1,\s+J2 and J3/);
  assert.match(legend, /the skill's question bank, the same in\s+every project/);
  assert.match(legend, /frame numbers S1, S2, …/);
  assert.match(legend, /class A is "documented",\s+not the Access group/);
});

test('every template reference points at a file in the skill, and at the same path in the repository', () => {
  const source = JSON.parse(read('assets', 'skill.json'));
  assert.equal(path.resolve(ROOT, source.skillPath), SKILL, 'skill.json skillPath is where the skill lives in this repository');
  assert.match(source.repository, /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/);
  const refs = templates.flatMap((t) => [...read('assets', 'templates', t).matchAll(/\{\{REF:([^|}]+)/g)].map((m) => m[1]));
  assert.ok(refs.includes('references/question-bank.md'));
  for (const ref of refs) assert.ok(fs.existsSync(path.join(ROOT, source.skillPath, ref)), ref);
});

test('a scaffolded CLARIFICATIONS.md links the installed question bank by its real path, plus the online copy', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-prototype-test-'));
  assert.equal(run('scaffold.mjs', ['--out', 'docs/prototypes', '--name', 'Demo'], dir).code, 0);
  const notes = path.join(dir, 'docs', 'prototypes', 'notes');
  const md = fs.readFileSync(path.join(notes, 'CLARIFICATIONS.md'), 'utf8');
  assert.doesNotMatch(md, /\{\{/);
  const link = md.match(/\[Question bank\]\(([^)]+)\) \(`references\/question-bank\.md`, installed skill, on this computer\) · \[online copy\]\(([^)]+)\)/);
  assert.ok(link, 'question bank link with its role and both locations');
  assert.equal(decodeURIComponent(link[1]), path.join(SKILL, 'references', 'question-bank.md'));
  assert.equal(link[2], 'https://github.com/AnilDeshpande/codetutor-mobile-prototyper/blob/main/skills/mobile-prototype/references/question-bank.md');
  assert.match(md, /\[`notes\/INPUTS\.md`\]\(INPUTS\.md\), this project's fact register/);
  assert.match(fs.readFileSync(path.join(notes, 'DECISIONS.md'), 'utf8'), /\[Clarification protocol\]\(/);
});

test('a skill installed inside the project gets relative links that resolve, so they travel with the repository', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-prototype-test-'));
  const installed = path.join(dir, '.claude', 'skills', 'mobile-prototype');
  fs.cpSync(SKILL, installed, { recursive: true });
  assert.equal(run('scaffold.mjs', ['--out', 'docs/prototypes'], dir, path.join(installed, 'scripts', 'scaffold.mjs')).code, 0);
  const notes = path.join(dir, 'docs', 'prototypes', 'notes');
  const target = fs.readFileSync(path.join(notes, 'CLARIFICATIONS.md'), 'utf8').match(/\[Question bank\]\(([^)]+)\) \(`references\/question-bank\.md`, installed skill, in this project\)/);
  assert.ok(target);
  assert.equal(target[1], '../../../.claude/skills/mobile-prototype/references/question-bank.md');
  assert.ok(fs.existsSync(path.resolve(notes, target[1])));
});

test('the README and the handoff link flow.drawio and say how to open it outside Android Studio', () => {
  for (const t of ['README.md', 'HANDOFF.md']) {
    const md = read('assets', 'templates', t);
    assert.match(md, /\[`flow\.drawio`\]\(flow\.drawio\)/, t);
    assert.match(md, /hediet\.vscode-drawio/, t);
    assert.match(md, /app\.diagrams\.net/, t);
    assert.match(md, /draw\.io Desktop/, t);
    assert.match(md, /Android\s+Studio/, t);
  }
  const readme = read('assets', 'templates', 'README.md');
  assert.match(readme, /\*\*Wireflow\*\*: one page per journey/);
  assert.match(readme, /\*\*Screen pages\*\*/);
  assert.match(readme, /Back to the overview/);
});

test('scaffold --upgrade adds the new sections to an older workspace once, and changes nothing else', () => {
  const p = project();
  const old = '# Clarifications\n\n## Approval record\n\nok\n\n## Question-bank summary\n\n| ID | Topic |\n|---|---|\n| P1/P2 | User |\n';
  fs.writeFileSync(p.file('notes', 'CLARIFICATIONS.md'), old);
  fs.writeFileSync(p.file('README.md'), '# App\n\n## Where we are\n\nGate C\n\n## All files\n\n| a |\n');
  let r = run('scaffold.mjs', ['--upgrade'], p.dir);
  assert.equal(r.code, 0, r.out);
  const md = p.read('notes', 'CLARIFICATIONS.md');
  assert.ok(md.indexOf('## How to read the IDs') < md.indexOf('## Question-bank summary'), 'legend before the summary');
  assert.ok(md.indexOf('## Sources') > md.indexOf('| P1/P2 | User |'), 'sources at the end');
  assert.equal(md.replace(/## How to read the IDs[\s\S]*?(?=## Question-bank summary)/, '').replace(/\n\n## Sources[\s\S]*$/, '\n'), old);
  const readme = p.read('README.md');
  assert.ok(readme.indexOf('## Opening the sketch') < readme.indexOf('## All files'));
  assert.ok(!fs.existsSync(p.file('notes', 'DECISIONS.md')), 'no file is created');
  r = run('scaffold.mjs', ['--upgrade'], p.dir);
  assert.match(r.out, /nothing to add/);
  assert.equal(p.read('notes', 'CLARIFICATIONS.md'), md);
});
