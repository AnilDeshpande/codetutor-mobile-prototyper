// Screen identity, state and entry condition (issue #9): one canonical name per screen in the
// spec, the diagram and the handoff, and a clear error when they drift apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, project, run, fixture } from './helpers.mjs';

const frameData = (xml) => [...xml.matchAll(/<UserObject\b[^>]*\bsid="(S\d+)"[^>]*\bscreenName="([^"]*)"[^>]*\bstate="([^"]*)"/g)].map((m) => ({ sid: m[1], name: m[2], state: m[3] }));

test('the fixture passes the check, with Overview in empty, populated and saved states', () => {
  const p = project(fixture());
  const r = run('sketch.mjs', ['--check'], p.dir);
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /^!/m, 'no warnings');
  const overview = fixture().journeys[0].screens.filter((s) => s.screen === 'overview').map((s) => s.state);
  assert.deepEqual(overview, ['empty', 'populated', 'saved']);
});

test('an entry condition used as a frame title is caught, with what to do about it', () => {
  const spec = fixture();
  spec.journeys[0].screens[0].title = 'First launch';
  const p = project(spec);
  const r = run('sketch.mjs', ['--check'], p.dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /S1 \(frame "overview-empty"\): "title" "First launch" conflicts with the screen's canonical name "Overview"/);
  assert.match(r.out, /move it to "entry"/);
});

test('a frame whose screen is missing from appScreens, and two screens with one name, are errors', () => {
  const spec = fixture();
  spec.journeys[0].screens[4].screen = 'overview-saved';
  spec.appScreens['record-progress'].name = 'Create habit';
  const r = run('sketch.mjs', ['--check'], project(spec).dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /S5 \(frame "overview-saved"\): screen "overview-saved" is not in "appScreens"/);
  assert.match(r.out, /appScreens\."create-habit" and appScreens\."record-progress" are both named "Create habit"/);
});

test('a screen named like a state of another screen gets a warning', () => {
  const spec = fixture();
  spec.appScreens['overview-saved'] = { name: 'Overview saved' };
  spec.journeys[0].screens[4].screen = 'overview-saved';
  const r = run('sketch.mjs', ['--check'], project(spec).dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /appScreens\."overview-saved" \("Overview saved"\) looks like a state of appScreens\."overview"/);
});

test('the diagram names every frame by its screen, then its state and entry condition', () => {
  const p = project(fixture());
  const r = run('sketch.mjs', ['--style', 'both'], p.dir);
  assert.equal(r.code, 0, r.out);
  const xml = p.read('flow.drawio');
  assert.deepEqual(frameData(xml).filter((d) => d.name === 'Overview').map((d) => `${d.sid} ${d.state}`).sort(),
    ['S1 empty', 'S1 empty', 'S3 populated', 'S3 populated', 'S5 saved', 'S5 saved']); // wireflow page + screen page
  assert.match(xml, /label="&lt;b&gt;Overview&lt;\/b&gt;&lt;br&gt;&lt;span style=&quot;font-size:11px&quot;&gt;Empty&lt;br&gt;Entry: First launch&lt;\/span&gt;"/);
  assert.match(xml, /name="S1 Overview — Empty"/);
  assert.match(xml, /name="S6 Create habit — Discard changes\?"/);
  assert.match(r.out, /To view it: open .*flow\.drawio in VS Code/);
  assert.match(r.out, /Don't rely on a draw\.io plugin in Android Studio/);
});

test('the handoff inventory matches the diagram, uses "App screen / navigation location" and lists targets separately', () => {
  const p = project(fixture());
  assert.equal(run('sketch.mjs', ['--style', 'both'], p.dir).code, 0);
  const r = run('handoff.mjs', [], p.dir);
  assert.equal(r.code, 0, r.out);
  const md = p.read('HANDOFF.md');
  assert.match(md, /\| Screen \| Screen id \| Purpose \| App screen \/ navigation location \| Frames \(S-number state\) \|/);
  assert.match(md, /\| Overview \| `overview` \| .* \| Overview \(start destination\) \| S1 Empty · S3 Populated · S5 Saved \|/);
  assert.match(md, /\| S1 \| Overview \| Empty \| First launch \| S6 \(Discard\) \|/);
  assert.match(md, /\| Create habit \| `create-habit` \| .* \| Overview → Create habit \|/);
  assert.match(md, /\| First use \| S2 · Create habit — Filled \| Save habit \| S3 · Overview — Populated \|/);
  assert.doesNotMatch(md, /\|\s*Destination\s*\|/);
  assert.equal(run('handoff.mjs', ['--check'], p.dir).code, 0);
});

test('handoff --check names the S-number when the diagram, the inventory or the prose drifts', () => {
  const p = project(fixture());
  run('sketch.mjs', ['--style', 'both'], p.dir);
  run('handoff.mjs', [], p.dir);
  const drawio = p.read('flow.drawio'), md = p.read('HANDOFF.md');

  fs.writeFileSync(p.file('flow.drawio'), drawio.replace('sid="S1" screen="overview" screenName="Overview"', 'sid="S1" screen="overview" screenName="First launch"'));
  let r = run('handoff.mjs', ['--check'], p.dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /S1: flow\.drawio names it "First launch" \(screen "overview"\), but flow\.json says "Overview"/);
  fs.writeFileSync(p.file('flow.drawio'), drawio);

  fs.writeFileSync(p.file('HANDOFF.md'), md.replace('| S1 | Overview | Empty |', '| S1 | First launch | Empty |'));
  r = run('handoff.mjs', ['--check'], p.dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /S1: HANDOFF\.md names it "First launch", but flow\.json and flow\.drawio say "Overview"/);

  fs.writeFileSync(p.file('HANDOFF.md'), md.replace('## 1. Summary\n', '## 1. Summary\nThe journey starts at S1 · First launch.\n'));
  r = run('handoff.mjs', ['--check'], p.dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /HANDOFF\.md:\d+: "S1 · First launch\." — S1 is "Overview — Empty"/);
  fs.writeFileSync(p.file('HANDOFF.md'), md);

  const renamed = fixture();
  renamed.appScreens.overview.name = 'Today';
  fs.writeFileSync(p.file('flow.json'), JSON.stringify(renamed));
  r = run('handoff.mjs', ['--check'], p.dir);
  assert.equal(r.code, 1, 'a diagram drawn before the rename is stale');
  assert.match(r.out, /S1: flow\.drawio names it "Overview" .* but flow\.json says "Today"/);
});

// The pair-a-meter example as it was before appScreens (0.4.0), with the diagrams 0.4.0 drew.
const LEGACY = path.join(ROOT, 'tests', 'fixtures', 'legacy-pair-a-meter');

test('older specs (no appScreens) still draw exactly as before, with a migration hint', () => {
  const dir = LEGACY;
  for (const style of ['wireflow', 'click-through']) {
    const p = project();
    const out = p.file(`${style}.drawio`);
    const r = run('sketch.mjs', ['--spec', path.join(dir, 'flow.json'), '--out', out, '--style', style], p.dir);
    assert.equal(r.code, 0, r.out);
    assert.equal(fs.readFileSync(out, 'utf8'), fs.readFileSync(path.join(dir, `${style}.drawio`), 'utf8'), `${style} output unchanged`);
    assert.match(r.out, /no "appScreens".*migrate-flow\.mjs/);
    assert.match(r.out, /screen "pairing" appears under 9 names/);
  }
  const p = project(fs.readFileSync(path.join(dir, 'flow.json'), 'utf8'));
  const r = run('handoff.mjs', [], p.dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /has no "appScreens".*\n.*migrate-flow\.mjs/);
});

test('migrate-flow gives an older spec one name per screen and keeps the old titles as states', () => {
  const p = project(fs.readFileSync(path.join(LEGACY, 'flow.json'), 'utf8'));
  const r = run('migrate-flow.mjs', [], p.dir);
  assert.equal(r.code, 0, r.out);
  assert.ok(fs.existsSync(p.file('flow.json.bak')));
  const spec = JSON.parse(p.read('flow.json'));
  assert.deepEqual(Object.keys(spec).slice(0, 3), ['app', 'platforms', 'appScreens']);
  assert.deepEqual(spec.appScreens, { devices: { name: 'Devices' }, pairing: { name: 'Pairing' }, readings: { name: 'Readings' } });
  const frames = spec.journeys.flatMap((j) => j.screens);
  assert.ok(frames.every((s) => !('title' in s) && !('sid' in s)));
  assert.equal(frames[0].stateName, 'None paired');
  assert.equal(frames.find((s) => s.id === 'pairing').stateName, undefined, 'title was just the screen name');
  assert.match(r.out, /belongs in "entry" instead/);
  const check = run('sketch.mjs', ['--check'], p.dir);
  assert.equal(check.code, 0, check.out);
  assert.doesNotMatch(check.out, /appScreens/);
  assert.match(run('migrate-flow.mjs', [], p.dir).out, /already has "appScreens"/);
});

test('the committed habit-overview example is what sketch.mjs draws from the fixture today', () => {
  const dir = path.join(ROOT, 'docs', 'examples', 'habit-overview');
  assert.equal(fs.readFileSync(path.join(dir, 'flow.json'), 'utf8'), fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'overview-states', 'flow.json'), 'utf8'));
  const p = project();
  const out = p.file('flow.drawio');
  assert.equal(run('sketch.mjs', ['--spec', path.join(dir, 'flow.json'), '--out', out, '--style', 'both'], p.dir).code, 0);
  assert.equal(fs.readFileSync(out, 'utf8'), fs.readFileSync(path.join(dir, 'flow.drawio'), 'utf8'));
});

test('the committed pair-a-meter example uses appScreens and is what sketch.mjs draws from it today', () => {
  const dir = path.join(ROOT, 'docs', 'examples', 'pair-a-meter');
  const spec = JSON.parse(fs.readFileSync(path.join(dir, 'flow.json'), 'utf8'));
  assert.deepEqual(Object.fromEntries(Object.entries(spec.appScreens).map(([k, v]) => [k, v.name])), { devices: 'Devices', pairing: 'Add device', readings: 'Readings' });
  assert.ok(spec.journeys.flatMap((j) => j.screens).every((s) => !('title' in s)));
  for (const style of ['wireflow', 'click-through']) {
    const p = project();
    const out = p.file(`${style}.drawio`);
    const r = run('sketch.mjs', ['--spec', path.join(dir, 'flow.json'), '--out', out, '--style', style], p.dir);
    assert.equal(r.code, 0, r.out);
    assert.doesNotMatch(r.out, /^!/m, 'no warnings');
    assert.equal(fs.readFileSync(out, 'utf8'), fs.readFileSync(path.join(dir, `${style}.drawio`), 'utf8'), `${style}.drawio is up to date`);
  }
});
