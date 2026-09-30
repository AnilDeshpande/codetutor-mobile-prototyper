// Where the prototype files live in the user's project. The user chooses the folder (recommended:
// docs/prototypes); it must be inside the project, so the files travel with the repository.
// Scripts that aren't told a folder find an existing workspace by its notes/STATE.md.

import fs from 'node:fs';
import path from 'node:path';

export const RECOMMENDED = 'docs/prototypes';
const SKIP = new Set(['node_modules', 'build', 'dist', 'out', 'target', 'vendor', 'Pods', 'coverage']);
const isWorkspace = (dir) => fs.existsSync(path.join(dir, 'notes', 'STATE.md'));

/** An existing workspace under root: the recommended folder, the old default, then a shallow search. */
export function findWorkspace(root = process.cwd()) {
  for (const d of [RECOMMENDED, 'prototype']) if (isWorkspace(path.join(root, d))) return path.join(root, d);
  let level = [root];
  for (let depth = 0; depth < 4 && level.length; depth++) {
    const next = [];
    for (const dir of level) {
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        if (!e.isDirectory() || e.name.startsWith('.') || SKIP.has(e.name)) continue;
        const sub = path.join(dir, e.name);
        if (isWorkspace(sub)) return sub;
        next.push(sub);
      }
    }
    level = next;
  }
  return null;
}

/** True if dir is the project folder itself or inside it. */
export function insideProject(dir, root = process.cwd()) {
  const r = path.relative(path.resolve(root), path.resolve(dir));
  return !r.startsWith('..') && !path.isAbsolute(r);
}

/**
 * The workspace a script should use: the folder given on the command line, else an existing
 * workspace, else the recommended folder. Exits if the folder is outside the project.
 */
export function workspace(given) {
  const dir = given ? path.resolve(given) : findWorkspace() || path.resolve(RECOMMENDED);
  if (!insideProject(dir)) {
    console.error(`✗ ${dir} is outside this project (${process.cwd()}).\n  Prototype files stay inside the project so they travel with it. Choose a folder in the project, for example ${RECOMMENDED}.`);
    process.exit(1);
  }
  return dir;
}
