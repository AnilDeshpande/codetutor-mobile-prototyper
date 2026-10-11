// Screen identity in the flow spec, shared by sketch.mjs, screens.mjs and handoff.mjs so the
// diagram, the final-look screens and the handoff name every frame the same way.
//
// A frame is one state of one app screen. Three things about it are kept apart:
//   screen identity   "screen": a key of the top-level "appScreens", which holds its canonical name
//   state             "state" (an id) and "stateName" (how to say it; default: the id in words)
//   entry condition   "entry": how or when the user arrives in this state ("First launch")
// A frame's title is generated from them: "Overview — Empty". Specs written before "appScreens"
// existed (format 1) use a free-text "title" per frame; they still draw as before, with a warning.

const SEP = ' — ';

/** True when the spec names its screens in "appScreens" (format 2). */
export const hasAppScreens = (spec) => !!spec && spec.appScreens != null;

/** "first-created" → "First created". */
export const humanize = (id) => {
  const words = String(id ?? '').replace(/[-_]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : '';
};

/** appScreens as { id: { name, purpose, location } }; an entry may be given as just its name. */
export function appScreens(spec) {
  const out = {};
  const raw = spec && spec.appScreens;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, v] of Object.entries(raw)) out[id] = typeof v === 'string' ? { name: v } : { ...(v || {}) };
  return out;
}

/** Numbers every frame S1, S2, … in file order (sets frame.sid) and returns the frames. */
export function numberFrames(spec) {
  const frames = [];
  for (const j of (spec && Array.isArray(spec.journeys) ? spec.journeys : [])) {
    for (const s of (Array.isArray(j.screens) ? j.screens : [])) { frames.push(s); s.sid = `S${frames.length}`; }
  }
  return frames;
}

/** The canonical name of the screen a frame belongs to (format 1: the frame's own title). */
export function screenName(spec, s) {
  if (!hasAppScreens(spec)) return s.title || s.screen || '';
  const a = appScreens(spec)[s.screen];
  return (a && a.name) || humanize(s.screen);
}

export const stateName = (s) => s.stateName || humanize(s.state);

/** The frame's title, as the diagram, the final-look screens and the handoff show it. */
export function frameTitle(spec, s) {
  if (!hasAppScreens(spec)) return s.title || `${s.screen} · ${s.state}`;
  return `${screenName(spec, s)}${SEP}${stateName(s)}`;
}

/** "S4 · Overview — Saved". */
export const frameLabel = (spec, s) => `${s.sid} · ${frameTitle(spec, s)}`;

/**
 * Where the screen sits in the app's navigation, for the handoff's "App screen / navigation
 * location" column: the screen's own "location", else its tab, else the chain of parents
 * (the screen back returns to) ending in its own name.
 */
export function locationOf(spec, screenId) {
  const screens = appScreens(spec);
  const name = (id) => (screens[id] && screens[id].name) || humanize(id);
  if (screens[screenId] && screens[screenId].location) return screens[screenId].location;
  const tab = (Array.isArray(spec.tabs) ? spec.tabs : []).find((t) => t.screen === screenId);
  if (tab) return `Tab: ${tab.label}`;
  const parentOf = (id) => {
    for (const j of spec.journeys || []) for (const s of j.screens || []) if (s.screen === id && s.parent && s.parent !== id) return s.parent;
    return null;
  };
  const chain = [screenId];
  for (let p = parentOf(screenId); p && !chain.includes(p) && chain.length < 6; p = parentOf(p)) chain.unshift(p);
  return chain.map(name).join(' → ');
}

const STATE = 'empty|populated|saved|saving|loading|loaded|error|failed|failure|offline|success|done|first[- ]launch|first[- ]run|denied|invalid|filled|blank';
const STATE_WORDS = new RegExp(`^(${STATE})\\b|\\b(${STATE})$`, 'i');
const norm = (t) => String(t ?? '').trim().toLowerCase();

/**
 * Checks that every frame resolves to one screen identity. Returns { errors, warnings }; each
 * message names the frame (S-number and id) and says what to change in flow.json.
 */
export function checkScreenNames(spec) {
  const errors = [], warnings = [];
  const frames = numberFrames(spec);
  const at = (s) => `${s.sid} (frame "${s.id}")`;

  if (!hasAppScreens(spec)) {
    const titles = new Map();
    for (const s of frames) {
      if (!s.screen) continue;
      const list = titles.get(s.screen) || [];
      list.push(s);
      titles.set(s.screen, list);
    }
    const mixed = [...titles].filter(([, list]) => new Set(list.map((s) => norm(s.title || s.screen))).size > 1);
    if (frames.length) {
      warnings.push(`flow.json has no "appScreens", so frame titles are free text and one screen can appear under several names${mixed.length ? ` (${mixed.length} screen(s) do)` : ''}. Run "node scripts/migrate-flow.mjs" to give every screen one canonical name, then review it (references/sketch-spec.md, "Migrating an older flow.json").`);
    }
    for (const [id, list] of mixed) {
      warnings.push(`screen "${id}" appears under ${new Set(list.map((s) => norm(s.title || id))).size} names: ${list.map((s) => `${s.sid} "${s.title || id}"`).join(', ')}. After migrating it has one name; what differs goes in "stateName" or "entry".`);
    }
    return { errors, warnings };
  }

  const raw = spec.appScreens;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push('"appScreens" must be an object: { "<screen id>": { "name": "Overview" } }.');
    return { errors, warnings };
  }
  const screens = appScreens(spec);
  const byName = new Map();
  for (const [id, a] of Object.entries(screens)) {
    if (!a.name || typeof a.name !== 'string' || !a.name.trim()) { errors.push(`appScreens."${id}" has no "name". Give the screen's canonical name, e.g. "Overview".`); continue; }
    const other = byName.get(norm(a.name));
    if (other) errors.push(`appScreens."${other}" and appScreens."${id}" are both named "${a.name}". A name identifies one screen: if they are the same screen, use one id and tell the frames apart by "state"; otherwise give them different names.`);
    else byName.set(norm(a.name), id);
  }
  for (const [n, id] of byName) {
    const base = [...byName].find(([m, other]) => other !== id && n.startsWith(`${m} `) && STATE_WORDS.test(n.slice(m.length).trim()));
    if (base) warnings.push(`appScreens."${id}" ("${screens[id].name}") looks like a state of appScreens."${base[1]}" ("${screens[base[1]].name}"). If it is the same screen, use "screen": "${base[1]}" with a "state" instead.`);
    else if (STATE_WORDS.test(n)) warnings.push(`appScreens."${id}" is named "${screens[id].name}", which sounds like a state. Name the screen ("Overview") and put the state in each frame's "state" / "stateName".`);
  }

  const used = new Set();
  for (const s of frames) {
    if (!s.screen) continue; // sketch.mjs reports the missing field
    used.add(s.screen);
    const a = screens[s.screen];
    if (!a) {
      errors.push(`${at(s)}: screen "${s.screen}" is not in "appScreens". Add it with its canonical name, or, if this frame is a state of a screen that is already there, use that screen's id and set "state".`);
      continue;
    }
    if (s.title != null) {
      const generated = frameTitle(spec, s);
      if (norm(s.title) === norm(a.name) || norm(s.title) === norm(generated)) {
        warnings.push(`${at(s)}: "title" is no longer used; the title "${generated}" is generated from appScreens."${s.screen}".name and the state. Remove "title".`);
      } else {
        errors.push(`${at(s)}: "title" "${s.title}" conflicts with the screen's canonical name "${a.name}" (appScreens."${s.screen}"). The diagram and the handoff show "${generated}". If "${s.title}" is how or when the user arrives here, move it to "entry"; if it describes this state, move it to "stateName"; then remove "title".`);
      }
    }
    if (s.stateName != null && norm(s.stateName) === norm(a.name)) warnings.push(`${at(s)}: "stateName" repeats the screen name "${a.name}". Say what is different in this state ("Empty", "Saved").`);
    if (s.entry != null && (typeof s.entry !== 'string' || !s.entry.trim())) errors.push(`${at(s)}: "entry" must be a short text such as "First launch".`);
    if (s.parent && !screens[s.parent]) errors.push(`${at(s)}: "parent" "${s.parent}" is not in "appScreens". "parent" names the screen back returns to.`);
  }
  for (const t of Array.isArray(spec.tabs) ? spec.tabs : []) {
    if (t.screen && !screens[t.screen]) errors.push(`tabs: "${t.label || t.screen}" opens screen "${t.screen}", which is not in "appScreens".`);
  }
  for (const id of Object.keys(screens)) if (!used.has(id)) warnings.push(`appScreens."${id}" ("${screens[id].name}") has no frame. Remove it, or add the frames that show it.`);
  return { errors, warnings };
}
