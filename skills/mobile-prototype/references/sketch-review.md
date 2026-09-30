# Reviewing the sketch before the user sees it

`node scripts/sketch.mjs --check` covers the mechanics (valid spec, every frame reachable;
arrows that don't overlap, cross or run over a screen; labels in the clear). This list covers
what a script can't judge. Go through it against
`flow.json`, fix what fails, regenerate, and only then show the sketch (gate C).

## Coverage

- Every journey approved at gates A and B is in the spec, and nothing that was declared out of
  scope is.
- Every screen has a frame for each state the decisions require: content, and where they apply
  empty, loading, error, offline, partial, validation error, permission asked and denied.
- Every dialog, sheet and permission prompt the flow passes through is its own frame.
- Every decision in `DECISIONS.md` that changes what the user sees shows up on a frame or an
  arrow. If one doesn't, the sketch is missing something.

## Flow

- Each journey can be read left to right from S1 without a legend.
- Every arrow says what the user does or what happens ("tap Save", "after 30 s"), not what the
  system does internally.
- Every frame has a way out, unless it is the end of the journey. Error and empty states have
  their recovery action.
- Back is drawn wherever leaving loses something (a half-filled form, a task in progress), with
  the confirmation the decisions call for.
- A branch hangs under the screen it interrupts (`below`), not at the end of the row.
- Arrow labels are a few words. If `--check` fails, fix the layout in `flow.json` as described
  in `sketch-spec.md`, "When the check fails"; never show a sketch that didn't pass.

## Content

- Copy is realistic and comes from the documents; draft copy is marked as draft in
  `DECISIONS.md`. No lorem ipsum, no "Button 1".
- One primary action per frame. Destructive actions use the `danger` variant.
- Texts fit their boxes. If a label is cut off in the diagram, shorten it.
- Nothing suggests a visual decision: no colours, fonts or icon choices beyond what the script
  draws.

## Platforms

- The flow follows `references/platforms/<platform>/conventions.md` for each platform in scope:
  top-level destinations, where back goes, how permissions are asked and what a denial means.
- Where Android and iOS differ in a way the user should know about, the frame's `note` says so
  (for example "iOS: one denial is final; the button opens Settings").

## What to tell the user at gate C

- a text outline of each journey: `S1 Devices · none paired → S2 Scan → …`, with the branches;
- the decisions you made on their behalf and the assumptions to confirm, by ID;
- anything deliberately left out, so the sketch doesn't imply it works.
