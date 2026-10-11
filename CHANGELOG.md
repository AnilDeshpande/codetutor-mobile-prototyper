# Changelog

Each version is a git tag `v<version>` with a GitHub Release, made with `node tools/release.mjs`.
An installed skill compares itself with the latest release (`scripts/check-update.mjs`) and says
how to update. Notes are for the people using the skill: what changes for them, and anything
they need to do.

## 0.5.0

- **One name per screen.** `flow.json` lists every screen once in `appScreens`; a frame gives its
  state (`stateName`) and its entry condition (`entry`, such as "First launch") apart from the
  screen, and its title is generated ("Overview — Empty"). The diagram, the final-look screens
  and the handoff use the same names.
- **Handoff generated and checked.** `scripts/handoff.mjs` writes the screen inventory (with an
  "App screen / navigation location" column), the transitions and the page list into
  `HANDOFF.md`; `--check` fails, naming the S-number, if the spec, the diagram and the handoff
  disagree on a screen.
- **Reports explain themselves.** `CLARIFICATIONS.md` has a legend for its question IDs, and the
  notes link the skill references that define their conventions.
- **Opening the sketch.** The prototype README, the handoff and `sketch.mjs` say how to open
  `flow.drawio` (VS Code extension, draw.io Desktop, app.diagrams.net) and find its pages.
- **Versions and updates.** The skill carries its version (`assets/skill.json`), checks for a newer
  release at the start of a session, and `install.mjs --update` replaces installed copies.
- **To do for a prototype started with 0.4.0:** nothing to keep drawing (it draws as before, with
  a warning). For one name per screen, run `scripts/migrate-flow.mjs` and review the names;
  `scripts/scaffold.mjs --upgrade` adds the new sections to the older notes. See *Migrating an
  older flow.json* in `references/sketch-spec.md`.

## 0.4.0

- The prototype is a hand-drawn draw.io sketch generated from `flow.json`: wireflow,
  click-through or both, numbered screens, arrows that never cross. The HTML prototype and
  Playwright are gone.
- Shorter skill description and a leaner `SKILL.md`.

## 0.3.0

- The skill stops at every gate and ends each stop with a short guide to what to read.

## 0.2.0

- iOS alongside Android, and an optional design phase (style tiles, theme, final-look screens)
  with ui-ux-pro-max as the design provider.

## 0.1.0

- First version: documents in, clarified flow, prototype out.
