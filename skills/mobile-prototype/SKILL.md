---
name: mobile-prototype
description: Turn a product spec, architecture notes and design documents into a rough, hand-drawn-style draw.io prototype of a native mobile app (Android, iOS or both) — numbered screens, their states and branches, and the arrows between them — so the flow can be discussed and locked before anything is designed or built. It first finds which documents exist, proposes the answers those documents already give (for the user's approval), asks the user only what remains open, then draws the flow as an editable .drawio file. Once the flow is locked it can add an optional design phase that turns the same flow into a design system and final-look Android / iOS screens. Use when the user asks to prototype, sketch, wireframe, mock up, storyboard or map the screens or user flow of a mobile, Android, iPhone or iOS app or feature, or to turn a PRD, spec, requirements, user stories, architecture or design docs into screens and a flow they can look at — even if they never say "prototype" or "draw.io". Also use to resume a prototype that has a docs/prototypes/notes/STATE.md. Stops at a locked flow (and optionally an approved look) plus a handoff package; it does not build a clickable web app and does not write Compose, SwiftUI, Kotlin or Swift.
---

# Mobile Prototype

Work out **what the screens are and how they connect** before anyone designs or builds them,
working with the user like a UX designer would. The prototype is a rough draw.io sketch on
purpose: it keeps the discussion on features, states and branches, not on colours and spacing.

```
documents → proposals (gate A) → open questions (gate B) → draw.io sketch, flow locked (gate C)
          → optional: design system + final-look screens (gates D1, D2) → handoff
```

Paths in this file are relative to this skill's directory (`scripts/…`, `references/…`,
`assets/…`). The user's project is the current working directory.

## Non-negotiables

1. **Documents propose, the user decides.** An answer found in a document is a *proposal* until
   the user approves it. Record who decided what.
2. **Ask only what changes the experience.** Conflicts between documents and unknowns that change
   a journey, a state or navigation get asked. Cosmetic choices you decide yourself and record.
3. **The flow lives in one file.** `docs/prototypes/flow.json` is the source of truth; the draw.io file
   and the final-look screens are generated from it by scripts. Never hand-write draw.io XML or
   HTML, and never place shapes or route arrows yourself.
4. **Rough on purpose.** The sketch uses plain boxes in a hand-drawn style. No brand colours, no
   real components, no pixel decisions before the flow is locked.
5. **Numbered and untangled.** Every screen frame carries a serial number (S1, S2, … in flow
   order, shown as a dark tag in its top-left corner), and people refer to screens by it everywhere: chat, notes, the final-look screens, the
   handoff. No two arrows share a line or cross each other, no arrow runs over a screen, no two
   screens sit on top of each other, and every arrow label sits clear of screens, arrows and
   other labels. `sketch.mjs` finds such a drawing or refuses to draw; never show a sketch that
   didn't pass `--check`, and fix a failure in `flow.json` (see "When the check fails" in
   `references/sketch-spec.md`), not in the diagram.
6. **Stop at every gate, and say what to read.** At each stop, end your turn: don't start the
   next phase ahead of the approval. Update `docs/prototypes/README.md` and close the message with the
   reading guide (see *Stops and the reading guide*).
7. **Stop at a locked flow.** Deliver the sketch and a handoff package. Do not build a clickable
   app, and do not generate Compose, SwiftUI, Kotlin, Swift or production web code.
8. **Each platform behaves like itself.** Ask which platforms are in scope (P5). The sketch is one
   flow for all of them; where Android and iOS differ (back, dialogs versus sheets, permission
   rules) note it on the screen. Follow `references/platforms/<platform>/conventions.md`.
9. **Everything lands in files** in one prototype folder, so a fresh session can resume. The
   user chooses that folder before the first file is written (recommended: `docs/prototypes`),
   and it is always inside the project you are working in.
10. **First how it works, then how it looks.** The design phase is optional, starts only after
    the flow is locked (gate C) and only when the user chooses it, and never blocks the handoff.
11. **draw.io tooling helps; it never blocks.** Setup installs the draw.io MCP server. If its
    tools aren't loaded in this session, say so in one line and carry on: the scripts write and
    open the diagram without it.

## Workspace (in the user's project)

The prototype folder is the user's choice; you ask for it in Phase 1, before creating any file.
This document writes it as `docs/prototypes/`, the recommended location: wherever you read that
path, use the folder the user chose. The folder must be inside the project. If the user names a
path outside it (another repository, the home folder, `/tmp`), say that the files have to stay
in this project so they travel with it, and ask again; `scaffold.mjs` refuses such a path too.

```
docs/prototypes/
├── README.md        ← the reading guide: where we are, what to read, in what order
├── flow.json        ← the flow: journeys, screen states, transitions (you edit this)
├── flow.drawio      ← the sketch, generated from flow.json (the user looks at this)
├── HANDOFF.md       ← final deliverable for the native team
├── look/            ← design phase only: final-look screens, generated (screens.html, style tile)
└── notes/
    ├── STATE.md            ← current phase, gates passed, next step (resume point)
    ├── INPUTS.md           ← document inventory + fact register with citations
    ├── CLARIFICATIONS.md   ← every question: source, proposal, status, decision
    ├── DECISIONS.md        ← approved decisions and recorded assumptions
    └── DESIGN.md           ← the visual direction (design phase only) + THEME-REPORT.md
```

`node scripts/scaffold.mjs --out <folder> --name "<App>"` creates `README.md`, `flow.json` and
the four notes from templates, and never overwrites. Fill in what it creates; don't invent other
files. The other scripts find the folder by themselves (they look for its `notes/STATE.md`), so
they need no `--out`; pass it only if the project holds more than one prototype folder.

## Stops and the reading guide

The work pauses for the user only at these stops. At each one, finish the current phase's files,
then end your turn.

| Stop | After | The user reads, in this order | The user is asked to |
|---|---|---|---|
| Inputs | Phase 1, before any file is created | the availability table in chat | choose the prototype folder (recommended: `docs/prototypes`); confirm the documents and the platform suggestion |
| Gate A | Phase 2 | the proposals table in chat → `notes/CLARIFICATIONS.md` for detail → `notes/INPUTS.md` only to check a citation | approve all, or correct by ID; choose the sketch style |
| Gate B | each Phase 3 round (only if C/D items exist) | the questions in chat | answer them |
| Gate C | Phase 4 | `flow.drawio`, screen by screen in S-number order → the list of assumptions in chat | lock the flow, or say what to change |
| D1 / D2 | Phase 5 | `look/style-tile.html` → `look/screens.html` → `notes/DESIGN.md` | pick a direction / approve the look |
| Handoff | Phase 6 | `HANDOFF.md` | nothing: the work is done |

At every stop:

1. Update `docs/prototypes/README.md` (template: `assets/templates/README.md`). Fill in *Where we are*
   and *Read now* for this stop, and add a row to *All files* for each file created since the
   last stop. Mark every file **you** (to read now), **reference** (open it only to check
   something) or **agent** (working notes, such as `STATE.md` — the user never needs to read
   them).
2. Record the stop in `STATE.md` (*Waiting on user*).
3. End the chat message with the reading guide, kept this short:

   ```
   Created: 6 files in docs/prototypes/ — start with docs/prototypes/README.md.
   To review now:
   1. The table above (2 min) — everything you need to decide is in it.
   2. notes/CLARIFICATIONS.md (optional, 5 min) — the evidence behind each proposal.
   Reference only: notes/INPUTS.md (check a citation), notes/DECISIONS.md (what's agreed).
   Agent notes, no need to read: notes/STATE.md, flow.json.
   ```

   Put everything the user must decide in the message itself; files are for detail. Don't list a
   file the user doesn't need at this stop under *To review now*.

## Phase 0 — Setup and resume

1. Look for an existing prototype folder: `docs/prototypes/notes/STATE.md`, the older default
   `prototype/notes/STATE.md`, or a `notes/STATE.md` next to a `flow.json` elsewhere in the
   project. If there is one, that is the prototype folder: don't ask for it again. Read
   `STATE.md` and every file in `notes/`, tell the
   user in two lines where things stand, and continue from the recorded next step. If the
   recorded stop is still waiting on the user, repeat what it needs rather than moving on.
2. Check whether the draw.io MCP tools are available **in this session**: a tool whose name ends
   in `open_drawio_xml` (for example `mcp__drawio__open_drawio_xml`).
3. If they are missing, run `node scripts/check-drawio-mcp.mjs --host <this agent>` (claude, codex,
   cursor or gemini) and show the user the result. If the server isn't configured, **ask** before
   changing their configuration; on approval run it again with `--configure --host <this agent>`.
   Details: `references/drawio-setup.md`.
4. A newly configured server only loads when the agent session restarts. Say so, record it in
   `STATE.md`, and **carry on**: nothing in this skill needs the tools.

## Phase 1 — Discover the inputs

1. If the user named files, use those. Otherwise run
   `node scripts/discover-inputs.mjs --root .` (add `--json` for machine output) to find candidate
   specs, architecture notes, design documents, API contracts and images. It also reports
   **platform signals** (build files, and what the documents mention) with a suggestion.
   This step only reads; nothing is created yet.
2. **Ask where the prototype files should go** (the *Inputs* stop). Always ask, in these words
   or close to them, unless the user already named a folder or Phase 0 found one:

   > Where should I put the prototype files? I recommend `docs/prototypes` (created if it
   > doesn't exist). Reply "ok" for that, or give another folder in this project.

   In the same message show the **availability table** — Spec / Architecture / Design / API /
   Other, plus the platform suggestion — with the files found for each, and ask the user to
   confirm which files are authoritative, which to ignore, and whether anything is missing (for
   example a design folder elsewhere or a Figma link). Leave the table out when the user named
   the files and there is nothing to ask about them; the folder question stays. End your turn.
3. Take the answer. "ok", "yes" or no preference means `docs/prototypes`. A relative path is
   relative to the project root; an absolute path is fine if it is inside the project. If the
   path is outside the project, explain and ask again (see *Workspace*). Then create the
   workspace: `node scripts/scaffold.mjs --out <folder> --name "<App>"`, and record the folder
   in `notes/STATE.md`.
4. Read every confirmed document in full (images too — look at them). Record the inventory and a
   fact register (ID, fact, source file § section) in `notes/INPUTS.md`.
5. Adjust for what is missing — see `references/document-intake.md`. A missing spec means you need
   at least a written feature description from the user before going on; a missing architecture
   or design document just moves those topics into the questions.

## Phase 2 — Answer from the documents → approval gate A

Work through `references/question-bank.md`. For each question in scope, try to answer it from the
fact register and classify it (full rules in `references/clarification-protocol.md`):

| Class | Meaning | What happens |
|---|---|---|
| **A — Documented** | a document states it | propose it, with a citation |
| **B — Inferred** | follows from documents but isn't stated | propose it as an assumption, with reasoning |
| **C — Conflict** | documents disagree | must ask |
| **D — Open, blocking** | unknown and changes a journey, state or navigation | must ask |
| **E — Open, cosmetic** | unknown, low impact | pick a sensible default, record it |

Write every item to `notes/CLARIFICATIONS.md`. Then present **A and B items** to the user as one
compact table (question · proposed answer · source · confidence) and ask them to approve all,
or correct by ID. Only approved items move to `DECISIONS.md`. Mention the E defaults in one line
so the user can object. If there are C/D items, say how many questions will follow at gate B.

Two things are always settled here or in Phase 3:

- **Target platforms (P5)**: Android, iOS or both. Propose it from the platform signals with
  citations; if there are none, or they disagree, ask. Never assume both. It decides the
  conventions to follow and the platforms of the design phase.
- **Sketch style (P6)**: ask which the user prefers, in one line under the table — it is their
  preference, not something the documents answer:
  - **Wireflow**: every screen and arrow on one page per journey. Best for reading the whole
    flow at a glance and for sharing.
  - **Click-through**: a small map, then one page per screen; clicking a button jumps to the
    screen it leads to. Best for walking through one step at a time.
  - **Both**: the wireflow, plus the per-screen pages.

  If they have no preference, use the wireflow. It can be changed at any time: the same
  `flow.json` produces all three.

Record both answers in `STATE.md`.

**Stop here (gate A).** Don't write `flow.json` or draw anything yet, even as a draft: the flow
depends on the scope the user is about to approve or correct. You may name the next step in one
line.

## Phase 3 — Close the gaps with the user → gate B

Ask the **C and D questions**, most blocking first, **at most four per round**. Each question gives
the evidence from the documents, two to four concrete options, and your recommended option first
with a one-line reason. Use the host's structured-question tool when there is one (for example
`AskUserQuestion` in Claude Code); otherwise ask as a numbered list in chat.

Record each answer immediately. Answers can raise new questions — classify and queue them the same
way. If the user says "you decide" or defers, record your choice as an assumption flagged for
review. Gate B passes when no blocking (C/D) item is open. After three rounds, offer to proceed
with the remaining items as flagged assumptions rather than keep asking.

Each round is a stop. Once gates A and B have both passed (B passes at once when there are no C/D
items), go straight on to Phase 4.

## Phase 4 — Sketch the flow → gate C

1. **Write the flow** in `docs/prototypes/flow.json` (format and element list:
   `references/sketch-spec.md`):
   - one **journey** per user goal in scope;
   - one **frame per screen state** the decisions require — the content state, and also empty,
     loading, error, offline, permission denied, validation error, and each dialog or sheet.
     Main path first, in the order the user meets the screens; a branch (a dialog, an error) names
     the screen it hangs under;
   - one **flow** per transition, labelled with what the user does ("tap Save", "Back with
     changes"), starting from the control that triggers it.

   Use realistic copy from the documents, not lorem ipsum. Follow
   `references/platforms/<platform>/conventions.md` for navigation, back and permissions; where
   the platforms differ, say so in the frame's `note`.
2. **Generate the sketch**:
   `node scripts/sketch.mjs --style <wireflow|click-through|both>` writes `docs/prototypes/flow.drawio`.
   Screens are numbered S1, S2, … in flow order, and every arrow gets its own route.
3. **Check it** before showing it: `node scripts/sketch.mjs --check` must pass (it validates the
   spec and that arrows, screens and labels stay out of each other's way), then go through
   `references/sketch-review.md`. Fix
   `flow.json` and generate again; don't show a sketch with warnings you haven't looked at.
4. **Show it**: `node scripts/sketch.mjs --style <style> --open` opens it in draw.io Desktop if
   installed, otherwise in the browser viewer. Give the user the file path too (it opens in the
   draw.io VS Code extension and at app.diagrams.net). If the draw.io MCP tools are loaded and
   the user wants the browser *editor*, pass the file's content to `open_drawio_xml`.
5. **Stop (gate C).** In chat, give a short text outline of the journey (S-numbers and the
   arrows), the decisions you made on the user's behalf and the flagged assumptions, and ask them
   to lock the flow or say what to change.
6. **Changes**: treat feedback as new clarifications — record, change `flow.json`, regenerate,
   show again. If the user edited `flow.drawio` by hand, the script refuses to overwrite it:
   read their version (it is XML), carry every change into `flow.json` (ask if one is unclear),
   then run `sketch.mjs --force` (it keeps their version as `flow.drawio.bak`). Gate C passes
   only on an explicit approval; record it in `STATE.md` and `DECISIONS.md`.
7. After the approval, offer the design phase in **one line** (design system and final-look
   screens, or go straight to the handoff) — see `references/design-phase.md`. Don't push it.

## Phase 5 — Optional design phase (only if the user chooses it)

Read `references/design-phase.md` and follow it. In short: the locked `flow.json` is the input.
`node scripts/screens.mjs` renders every screen state in the platform's own look into
`docs/prototypes/look/`; a provider (ui-ux-pro-max, installed on first use with
`scripts/design-provider.mjs` and a clear notice; the built-in baseline when that isn't possible)
and three plain-language choices (density, expressiveness, motion) give two directions in the
`DESIGN.md` contract; the user picks one from style tiles (gate D1); `scripts/theme.mjs` turns it
into platform tokens with a contrast check; and the user approves the look on `look/screens.html`
(gate D2). The design phase changes how screens look, never the flow. If it is skipped or
stopped, go to Phase 6.

## Phase 6 — Handoff and stop

Write `docs/prototypes/HANDOFF.md` following `references/handoff-package.md`: screen inventory,
navigation graph, per-screen state model, component mapping per platform (Material 3 for Android,
SwiftUI for iOS), theme (only if the design phase ran), copy (with iOS purpose strings),
decisions with sources, open questions, and the sketch as the visual reference. Update `STATE.md`
to `complete`, and `README.md` so *Read now* is `HANDOFF.md` alone. Tell the user where everything
is, and stop — native implementation is a separate task.

## When guidance conflicts

1. The user's explicit decisions (in `DECISIONS.md`).
2. The supplied documents — the spec decides *what* the product does; the architecture decides
   what is *feasible*. Conflicts between them are class C and go to the user.
3. The platform conventions: `references/platforms/android/conventions.md`,
   `references/platforms/ios/conventions.md`.
4. The approved visual direction (`DESIGN.md`), for the look only; it never changes the flow or
   overrides the platform conventions.
5. Your own taste.

## Agent-specific notes

- **Claude Code**: installed as the `mobile-prototyper` plugin, the draw.io MCP server is bundled
  and its tools appear with a plugin prefix. Use `AskUserQuestion` for question rounds.
- **Codex**: the draw.io MCP server lives in `~/.codex/config.toml` under `[mcp_servers.drawio]`;
  ask questions in chat as numbered lists.
- **Any agent**: the official draw.io skill (jgraph/drawio-mcp) is a good companion for other
  diagrams, but don't use it for the prototype: `sketch.mjs` is what keeps the numbering, the
  layout and the arrow routes consistent.
