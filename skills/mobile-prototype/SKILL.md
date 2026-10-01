---
name: mobile-prototype
description: Turn a product spec, architecture and design docs into a rough, hand-drawn draw.io prototype of a native Android or iOS app — numbered screens, their states and the arrows between them — so the flow can be agreed before anything is designed or built. Use when the user wants to prototype, sketch, wireframe, mock up or map the screens or user flow of a mobile app or feature, or turn a PRD, spec, user stories, UX notes or architecture docs into screens and a flow, even if they never say "prototype" or "draw.io". Also resumes a prototype folder that has notes/STATE.md. Does not write Compose, SwiftUI or other app code.
---

# Mobile Prototype

Work out **what the screens are and how they connect** before anyone designs or builds them,
working like a UX designer would. The prototype is a rough draw.io sketch on
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
   order), and people refer to screens by it everywhere. Review markup (numbers, remarks) stays
   outside the phone frame or in the frame's `note`. `sketch.mjs` refuses to draw crossing or
   shared arrows, arrows over screens, overlapping screens or labels in the way: never show a
   sketch that didn't pass `--check`, and fix a failure in `flow.json` (see "When the check
   fails" in `references/sketch-spec.md`), not in the diagram.
6. **Stop at every gate, and say what to read.** At each stop, end your turn: don't start the
   next phase ahead of the approval. Follow *Stops* below.
7. **Stop at a locked flow.** Deliver the sketch and a handoff package. Do not build a clickable
   app, and do not generate Compose, SwiftUI, Kotlin, Swift or production web code.
8. **Each platform behaves like itself.** The sketch is one flow for every platform in scope
   (P5); where Android and iOS differ (back, dialogs versus sheets, permission rules) say so in
   the frame's `note`. Follow `references/platforms/<platform>/conventions.md`.
9. **Everything lands in files** in one prototype folder inside the project, chosen by the user
   before the first file is written, so a fresh session can resume.
10. **First how it works, then how it looks.** The design phase is optional, starts only after
    the flow is locked (gate C) and only when the user chooses it, and never blocks the handoff.
11. **draw.io tooling helps; it never blocks.** If the draw.io MCP tools aren't loaded, say so in
    one line and carry on: the scripts write and open the diagram without them.

## Workspace (in the user's project)

This document calls the prototype folder `docs/prototypes/` (the recommended location); wherever
you read that path, use the folder the user chose in Phase 1. It must be inside the project: if
the user names a path outside it (another repository, the home folder, `/tmp`), say the files
have to stay in this project so they travel with it, and ask again. `scaffold.mjs` refuses such
a path too.

```
docs/prototypes/
├── README.md        ← the reading guide for the user
├── flow.json        ← journeys, screen states, transitions (you edit this)
├── flow.drawio      ← the sketch, generated from flow.json
├── HANDOFF.md       ← final deliverable for the native team
├── look/            ← design phase only: generated final-look screens
└── notes/
    ├── STATE.md            ← phase, gates passed, next step (resume point)
    ├── INPUTS.md           ← document inventory + fact register with citations
    ├── CLARIFICATIONS.md   ← every question: source, proposal, status, decision
    ├── DECISIONS.md        ← approved decisions and recorded assumptions
    └── DESIGN.md           ← the visual direction (design phase only) + THEME-REPORT.md
```

`node scripts/scaffold.mjs --out <folder> --name "<App>"` creates `README.md`, `flow.json` and
the four notes from templates, and never overwrites. Fill in what it creates; don't invent other
files. The other scripts find the folder by its `notes/STATE.md`, so they need no `--out` unless
the project holds more than one prototype folder.

## Stops

The work pauses for the user only at these stops: **Inputs** (Phase 1), **gate A** (Phase 2),
**gate B** (each Phase 3 round), **gate C** (Phase 4), **D1 / D2** (Phase 5) and the **handoff**
(Phase 6). At every stop from gate A on, before ending your turn:

1. update `docs/prototypes/README.md` — *Where we are*, *Read now*, and each new file marked
   **you**, **reference** or **agent**;
2. record the stop in `STATE.md` under *Waiting on user*;
3. end the message with the short reading guide.

Read `references/stops-and-reading-guide.md` at the first stop: it has what the user reads at
each stop and the exact form of the guide. Everything the user must decide goes in the message.

## Phase 0 — Setup and resume

1. Look for an existing prototype folder: `docs/prototypes/notes/STATE.md`, the older default
   `prototype/notes/STATE.md`, or a `notes/STATE.md` next to a `flow.json` elsewhere in the
   project. If there is one, that is the prototype folder: don't ask for it again. Read
   `STATE.md` and every file in `notes/`, tell the user in two lines where things stand, and
   continue from the recorded next step; if that stop still waits on the user, repeat what it
   needs.
2. Check whether the draw.io MCP tools are available **in this session**: a tool whose name ends
   in `open_drawio_xml` (for example `mcp__drawio__open_drawio_xml`).
3. If they are missing, run `node scripts/check-drawio-mcp.mjs --host <this agent>` and show the
   result. **Ask** before changing the user's configuration, then run
   `--configure --host <this agent>` (without `--host` it configures every agent installed). A
   new server loads only after a restart: say so, record it in `STATE.md`, and **carry on**.
   Details: `references/drawio-setup.md`.

## Phase 1 — Discover the inputs

1. If the user named files, use those. Otherwise run `node scripts/discover-inputs.mjs --root .`
   to find specs, architecture, design, API contracts and images, plus **platform signals** with
   a suggestion. This step only reads; nothing is created yet.
2. **Ask where the prototype files should go** (the *Inputs* stop), unless the user already named
   a folder or Phase 0 found one:

   > Where should I put the prototype files? I recommend `docs/prototypes` (created if it
   > doesn't exist). Reply "ok" for that, or give another folder in this project.

   In the same message show the **availability table** — Spec / Architecture / Design / API /
   Other, plus the platform suggestion — with the files found for each. Ask the user to confirm
   the **target platform** (don't assume both), which documents are authoritative, which to
   ignore, and whether anything is missing (a design folder, a Figma link). Leave the table out
   when the user named the files and there is nothing to ask about them. End your turn.
3. "ok", "yes" or no preference means `docs/prototypes`. A relative path is relative to the
   project root; an absolute one must be inside the project (see *Workspace*). Then run
   `node scripts/scaffold.mjs --out <folder> --name "<App>"` and record the folder in
   `notes/STATE.md`.
4. Read every confirmed document in full (images too — look at them). Record the inventory and a
   fact register (ID, fact, source file § section) in `notes/INPUTS.md`.
5. Adjust for what is missing (`references/document-intake.md`). Without a spec, get at least a
   written feature description from the user before going on.

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

Two things are always settled here or in Phase 3, and recorded in `STATE.md`:

- **Target platforms (P5)**: Android, iOS or both. Propose it from the platform signals with
  citations; if there are none, or they disagree, ask. Never assume both.
- **Sketch style (P6)**: ask in one line under the table — it is the user's preference, not
  something the documents answer: **wireflow** (the whole flow on one page per journey),
  **click-through** (a map, then one page per screen with clickable buttons) or **both**. With
  no preference, use the wireflow; the same `flow.json` produces all three.

**Stop here (gate A).** Don't write `flow.json` or draw anything yet, even as a draft: the flow
depends on the scope the user is about to approve or correct.

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

   Use realistic copy from the documents, not lorem ipsum.
2. **Generate and check**: `node scripts/sketch.mjs --style <wireflow|click-through|both>` writes
   `docs/prototypes/flow.drawio`; `node scripts/sketch.mjs --check` must pass. Then go through
   `references/sketch-review.md`. Fix `flow.json` and generate again; don't show a sketch with
   warnings you haven't looked at.
3. **Show it**: `node scripts/sketch.mjs --style <style> --open`, and give the user the file
   path (other viewers: `references/drawio-setup.md`).
4. **Stop (gate C).** In chat, give a short text outline of the journey (S-numbers and the
   arrows), the decisions you made on the user's behalf and the flagged assumptions, and ask them
   to lock the flow or say what to change.
5. **Changes**: treat feedback as new clarifications — record, change `flow.json`, regenerate,
   show again. If the user edited `flow.drawio` by hand, the script refuses to overwrite it:
   read their version (it is XML), carry every change into `flow.json` (ask if one is unclear),
   then run `sketch.mjs --force` (it keeps their version as `flow.drawio.bak`). Gate C passes
   only on an explicit approval; record it in `STATE.md` and `DECISIONS.md`.
6. After the approval, offer the design phase in **one line** (design system and final-look
   screens, or go straight to the handoff). Don't push it.

## Phase 5 — Optional design phase (only if the user chooses it)

Read `references/design-phase.md` and follow it. The locked `flow.json` is the input; the user
picks a direction from style tiles (gate D1) and approves the final-look screens (gate D2). The
design phase changes how screens look, never the flow. If it is skipped or stopped, go to Phase 6.

## Phase 6 — Handoff and stop

Write `docs/prototypes/HANDOFF.md` following `references/handoff-package.md`, with the sketch as
visual reference. Update `STATE.md` to `complete`, and `README.md` so *Read now* is
`HANDOFF.md` alone. Tell the user where everything is and stop — native implementation is a
separate task.

## When guidance conflicts

1. The user's explicit decisions (in `DECISIONS.md`).
2. The supplied documents — the spec decides *what* the product does; the architecture decides
   what is *feasible*. Conflicts between them are class C and go to the user.
3. The platform conventions (`references/platforms/<platform>/conventions.md`).
4. The approved visual direction (`DESIGN.md`), for the look only; it never changes the flow or
   overrides the platform conventions.
5. Your own taste.
