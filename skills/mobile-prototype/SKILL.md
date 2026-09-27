---
name: mobile-prototype
description: Turn a product spec, architecture notes and design documents into an interactive, clickable HTML prototype of a native Android (mobile) app. It first finds which documents exist, proposes the answers those documents already give (for the user's approval), asks the user only what remains open, then builds the prototype and verifies every journey with the Playwright MCP server. Use when the user asks to prototype, mock up, wireframe, storyboard or "make clickable" a mobile or Android app, feature, screen or user journey, or to turn a PRD, spec, requirements, user stories, architecture or design docs into something they can click through — even if they never say "prototype". Also use to resume a prototype that has a prototype/notes/STATE.md. Stops at an approved UX and a handoff package; it does not write Jetpack Compose.
---

# Mobile Prototype

Build a **disposable, interactive HTML prototype of an Android app** from the user's documents,
working with the user like a UX designer would. The prototype is a *behavioural design
artifact*, not a web application: it settles journeys, navigation, states and hierarchy so the
native build starts from an approved experience.

Paths in this file are relative to this skill's directory (`scripts/…`, `references/…`,
`assets/…`). The user's project is the current working directory.

## Non-negotiables

1. **Playwright MCP is a hard dependency.** Verification uses the Playwright MCP server's
   `browser_*` tools. Do not silently substitute another browser tool; if Playwright MCP is not
   available, set it up (Phase 0) or get the user's explicit agreement to an alternative.
2. **Documents propose, the user decides.** An answer found in a document is a *proposal* until
   the user approves it. Record who decided what.
3. **Ask only what changes the experience.** Conflicts between documents and unknowns that change
   a journey, a state or navigation get asked. Cosmetic choices you decide yourself and record.
4. **Scenarios before screens, states before styling.** Nothing is built until the journeys and
   their states are written down and the user has confirmed the flow.
5. **"Works" means verified.** A journey is done only when a Playwright MCP run in this session
   passed it, at every window class the scope requires.
6. **Stop at approved UX.** Deliver the prototype and a handoff package. Do not generate Compose,
   Kotlin or production web code.
7. **Everything lands in files** under `prototype/notes/`, so a fresh session can resume.

## Workspace (in the user's project)

```
prototype/
├── index.html  tokens.css  shell.css  app.js  screens.js  mock-data.js   ← the prototype
├── scenarios/<journey>.md          ← Given / When / Then, one file per journey
├── screenshots/<window>/<theme>/…  ← captured by Playwright MCP
├── storyboard.html                 ← generated grid of every screen × state
├── HANDOFF.md                      ← final deliverable for the native team
└── notes/
    ├── STATE.md            ← current phase, gates passed, next step (resume point)
    ├── INPUTS.md           ← document inventory + fact register with citations
    ├── CLARIFICATIONS.md   ← every question: source, proposal, status, decision
    ├── DECISIONS.md        ← approved decisions and recorded assumptions
    └── VERIFICATION.md     ← Playwright MCP run log per scenario × window × theme
```

Create it with `node scripts/scaffold.mjs --out prototype` (never overwrites existing files).

## Phase 0 — Preflight and resume

1. If `prototype/notes/STATE.md` exists, read it and every file in `prototype/notes/`, tell the
   user in two lines where things stand, and continue from the recorded next step.
2. Check whether the Playwright MCP tools are available **in this session**: look for tools whose
   names end in `browser_navigate`, `browser_snapshot`, `browser_click` (for example
   `mcp__playwright__browser_navigate`, or a plugin-prefixed variant).
3. If they are missing, run `node scripts/check-playwright-mcp.mjs` and show the user the result.
   Then **ask** before changing their configuration; on approval run it again with
   `--configure --host <this agent>`. Details and per-agent config: `references/playwright-mcp-setup.md`.
4. A newly configured MCP server only loads when the agent session restarts. Say so, record it in
   `STATE.md`, and **carry on with Phases 1–4**, which need no browser. Require the tools again
   before Phase 6 and ask the user to restart the session there if they are still missing.

## Phase 1 — Discover the inputs

1. If the user named files, use those. Otherwise run
   `node scripts/discover-inputs.mjs --root .` (add `--json` for machine output) to find candidate
   specs, architecture notes, design documents, API contracts and images.
2. Show the user an **availability table** — Spec / Architecture / Design / API / Other — with
   the files found for each, and ask them to confirm which files are authoritative, which to
   ignore, and whether anything is missing (for example a design folder elsewhere or a Figma link).
3. Read every confirmed document in full (images too — look at them). Record the inventory and a
   fact register (ID, fact, source file § section) in `notes/INPUTS.md`.
4. Adjust for what is missing — see `references/document-intake.md`. A missing spec means you need
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
so the user can object.

## Phase 3 — Close the gaps with the user → gate B

Ask the **C and D questions**, most blocking first, **at most four per round**. Each question gives
the evidence from the documents, two to four concrete options, and your recommended option first
with a one-line reason. Use the host's structured-question tool when there is one (for example
`AskUserQuestion` in Claude Code); otherwise ask as a numbered list in chat.

Record each answer immediately. Answers can raise new questions — classify and queue them the same
way. If the user says "you decide" or defers, record your choice as an assumption flagged for
review. Gate B passes when no blocking (C/D) item is open. After three rounds, offer to proceed
with the remaining items as flagged assumptions rather than keep asking.

## Phase 4 — Journeys, states and flow → gate C

1. Write one `scenarios/<journey>.md` per journey in scope (template:
   `assets/templates/SCENARIO.md`): Given / When / Then steps that name the user-visible outcome of
   each step, plus the unhappy paths the decisions require (offline, error, permission denied…).
2. Build the **state inventory**: for every screen, which of loading · content · empty · error ·
   offline · partial · success apply, and which mock scenario triggers each.
3. Draft the navigation map (top-level destinations, stacks, where system back goes) using
   `references/android-ux-conventions.md`.
4. Show the user the flow as a short text diagram plus the screen list, and get confirmation
   before building. Record the result in `STATE.md`.

## Phase 5 — Build

1. Scaffold if not done. The template (`assets/prototype-template/`) already provides an Android
   device shell (status bar, top app bar, bottom navigation that becomes a navigation rail on wider
   windows, a system navigation bar with a working **System back** button, snackbar, dialog,
   bottom sheet), a back stack wired to the browser history, and mock data with scenario and
   latency switches.
2. Define screens in `screens.js` and data in `mock-data.js`. Keep to plain HTML, CSS and a little
   JavaScript — no frameworks, no build step, no CDNs.
3. Every screen must reach every state in its inventory through a URL:
   `index.html?scenario=<id>&latency=<fast|normal|slow|ms>&screen=<id>&state=<state>&theme=<light|dark>`.
   `?debug=1` shows a panel for switching these by hand.
4. Make it testable: use real `<button>`/`<a>` elements with accessible names, `data-testid` on
   key elements, and let the shell keep `data-screen` / `data-state` on `<main>` current.
5. Follow `references/android-ux-conventions.md`: 48 px minimum touch targets, no hover-only or
   right-click interactions, no browser-style navigation, Material 3 roles from `tokens.css`.
   Write realistic copy from the documents, not lorem ipsum.
6. Other design skills (for example UI UX Pro Max, frontend-design, web-design-guidelines) are
   optional advisers. If they are installed, consult them for hierarchy and polish; they never
   override the decisions or the Android conventions.

## Phase 6 — Verify with Playwright MCP

Serve the prototype (`node scripts/serve.mjs --dir prototype`, in the background) and follow
`references/verification-with-playwright-mcp.md`. In short, for each scenario × window class
(compact 412×915, medium 700×1000, expanded 1024×768 — trim to the approved scope) × theme:

- `browser_resize`, then `browser_navigate` to the scenario URL; `browser_snapshot` to get refs.
- Perform each step with `browser_click` / `browser_type` / `browser_fill_form` /
  `browser_press_key`, and after each step check the expected outcome with `browser_snapshot` or
  `browser_find`, plus `browser_evaluate` on `() => document.querySelector('main').dataset`.
- Exercise system back (click **System back**, or `browser_navigate_back`) wherever the scenario
  leaves a screen.
- `browser_emulate_media` with `colorScheme: "dark"` for the dark pass.
- Run the built-in audit: `browser_evaluate` with `() => window.__prototypeAudit()` (touch targets,
  overflow, unnamed controls, missing state markers). Check `browser_console_messages` for errors.
- `browser_take_screenshot` with `filename: "prototype/screenshots/<window>/<theme>/<scenario>--<screen>--<state>.png"`.

Log each run (pass/fail, the failing step, what was observed) in `notes/VERIFICATION.md`.

## Phase 7 — Review and iterate

Look at the screenshots and score them with `references/review-rubric.md`. Fix every blocker and
major issue, then re-run only the affected scenarios plus one full regression pass at the end.
**Three rounds at most**; after that, show the user what is still wrong and let them choose.

## Phase 8 — Human review → gate D

1. Run `node scripts/storyboard.mjs --dir prototype` to build `storyboard.html` (every screen ×
   state × window × theme in one grid).
2. Give the user the local URL and the LAN URL printed by `serve.mjs` (to open on a real phone),
   the storyboard, and a short list of what to look at: decisions made on their behalf, flagged
   assumptions, anything the rubric scored as minor.
3. Treat feedback as new clarifications: record, change, re-verify the affected scenarios.
   Gate D passes only on an explicit approval from the user.

## Phase 9 — Handoff and stop

Write `prototype/HANDOFF.md` following `references/handoff-package.md`: screen inventory, navigation
graph, per-screen state model, component mapping to Material 3, copy, decisions with sources,
open questions, and the approved screenshots as visual references. Update `STATE.md` to
`complete`. Tell the user where everything is, and stop — native implementation is a separate task.

## When guidance conflicts

1. The user's explicit decisions (in `DECISIONS.md`).
2. The supplied documents — the spec decides *what* the product does; the architecture decides
   what is *feasible*. Conflicts between them are class C and go to the user.
3. `references/android-ux-conventions.md`.
4. Optional design skills, if installed.
5. Your own taste.

## Agent-specific notes

- **Claude Code**: installed as the `mobile-prototyper` plugin, Playwright MCP is bundled and its
  tools appear with a plugin prefix. Use `AskUserQuestion` for question rounds.
- **Codex**: Playwright MCP lives in `~/.codex/config.toml` under `[mcp_servers.playwright]`; ask
  questions in chat as numbered lists.
- **Other agents**: if the agent cannot run MCP servers at all, stop after Phase 4 and explain what
  is missing rather than claiming verification.
