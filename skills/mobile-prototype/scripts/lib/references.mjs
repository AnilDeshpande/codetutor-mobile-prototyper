// Links from the documents the skill writes into the user's project (CLARIFICATIONS.md,
// DECISIONS.md, HANDOFF.md) to the skill references that define their conventions.
//
// A template writes {{REF:references/question-bank.md|Question bank}}. It becomes a link to that
// file in the installed skill, resolved from where this script runs (never a fixed home folder):
// relative when the skill is installed inside the project, so the link travels with the
// repository, absolute otherwise. When assets/skill.json names the skill's repository, an online
// copy follows for readers without the installation; tests/references.test.mjs checks that every
// referenced file exists at that path in the repository.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { insideProject } from './workspace.mjs';

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function source() {
  try { return JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'assets', 'skill.json'), 'utf8')); } catch { return null; }
}

const encode = (p) => p.split('/').map(encodeURIComponent).join('/');

/** Markdown for one reference: the installed copy, then the online copy when known. */
export function referenceLink(ref, label, docDir, root = process.cwd()) {
  const target = path.join(SKILL_DIR, ref);
  if (!fs.existsSync(target)) throw new Error(`The skill has no ${ref} (looked in ${SKILL_DIR}).`);
  const local = insideProject(SKILL_DIR, root)
    ? encode(path.relative(docDir, target).split(path.sep).join('/'))
    : encode(target.split(path.sep).join('/'));
  const where = insideProject(SKILL_DIR, root) ? 'installed skill, in this project' : 'installed skill, on this computer';
  const src = source();
  const online = src && src.repository ? ` · [online copy](${src.repository}/blob/${src.ref || 'main'}/${src.skillPath}/${encode(ref)})` : '';
  return `[${label || ref}](${local}) (\`${ref}\`, ${where})${online}`;
}

/** Replaces every {{REF:<path>|<label>}} in a template written to docDir. */
export const fillReferences = (text, docDir, root = process.cwd()) =>
  text.replace(/\{\{REF:([^|}]+)(?:\|([^}]*))?\}\}/g, (_, ref, label) => referenceLink(ref.trim(), label && label.trim(), docDir, root));
