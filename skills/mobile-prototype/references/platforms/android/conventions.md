# Android UX conventions for HTML prototypes

The prototype runs in a browser but must behave like an Android app. These conventions follow
Material 3 and Android's adaptive-layout guidance. CSS pixels are used as a proxy for dp.

## Window size classes

| Class | Width | Test viewport | Navigation | Layout |
|---|---|---|---|---|
| Compact | < 600 dp | 412 × 915 | bottom navigation bar (3–5 items) | single pane |
| Medium | 600–839 dp | 700 × 1000 | navigation rail | single pane, wider content, or list-detail if natural |
| Expanded | 840–1199 dp | 1024 × 768 | navigation rail (or drawer) | list-detail / two panes |

Compact is the primary design target. Medium and expanded must not break (no stretched
600 px-wide buttons, no lonely narrow column in a sea of white) even when tablets are out of
scope. The template's `platform/android.css` switches bottom navigation to a rail at 600 px.

## Structure of a screen

- **Top app bar**: title of the current screen; an up arrow (←) on screens below a top-level
  destination; up to two actions, the rest in an overflow menu (⋮).
- **Content**: one clear primary purpose per screen. The most important information first.
- **Primary action**: a filled button at the bottom of task screens, or a FAB on list screens when
  the main action is "create". Only one primary action per screen.
- **Bottom navigation / rail**: top-level destinations only, visible on top-level screens; hidden
  inside focused tasks (pairing, checkout, editing).

## Back and up

- **System back** (the ◁ in the simulated navigation bar, and the browser back) goes to the
  previous screen in the task, closes a dialog or sheet first if one is open, and on a top-level
  destination other than the start destination goes to the start destination.
- **Up** (←) goes to the logical parent screen; within a single stack it matches back.
- Leaving a task with unsaved input: confirm with a dialog ("Discard changes?") or keep a draft —
  a decision to record (N3), never an accident.
- Never rely on the browser's own UI; the prototype must be fully usable through the app shell.

## Feedback and overlays

| Situation | Pattern |
|---|---|
| Brief confirmation of a completed action, optionally undo | snackbar (4–10 s, one optional action) |
| Decision needed before continuing, or destructive action | dialog (title, one-sentence body, 1–2 actions: dismissive left, confirming right) |
| Choices or extra detail tied to the current screen | modal bottom sheet |
| Ongoing status affecting the whole screen (offline, syncing) | inline banner under the top app bar |
| Waiting ≤ 300 ms | nothing |
| Waiting > 300 ms, unknown duration | circular or linear indeterminate progress, in place |
| Waiting with known steps or duration (pairing, upload) | determinate progress + what's happening in words + cancel if possible |
| Content loading on a screen with known layout | placeholders (skeleton) in the shape of the content |

## Runtime permissions

Simulate the full flow; the system dialog is styled differently from the app (the template's
`dialog.system` class) so reviewers can tell OS UI from app UI.

1. Ask in context, when the user starts the feature that needs it, not at launch.
2. If the reason isn't obvious, show a rationale first (app screen or dialog: why + what happens).
3. System dialog: "Allow *App* to find, connect to… nearby devices?" → Allow / Don't allow.
4. Denied: explain what doesn't work and offer to ask again.
5. Denied twice / "don't ask again": explain, and offer "Open settings".

Model these as mock scenarios (`permission-denied`, `permission-blocked`) so each can be verified.

## Lists, forms and content

- List items: 56 px (one line), 72 px (two lines), 88 px (three lines); the whole row is the
  touch target; trailing chevron only if it navigates.
- Text fields: visible label, helper or error text below, error shown after the user leaves the
  field or submits — not while they're typing the first character.
- Buttons: sentence case, verb first ("Pair meter", not "OK").
- Empty states: say what will appear here, and give the action that makes it appear.
- Error states: say what happened in plain words, what the user can do, and offer retry.
- Numbers with units, dates and times formatted for the locale (C3).

## Touch, motion and accessibility

- Minimum touch target 48 × 48 px, even when the visible element is smaller (the template's
  buttons and chips extend their hit area with an `::after` box; the audit counts it). At least
  8 px between targets.
- No hover-only information, no right-click, no double-click, no keyboard-only paths.
- Text contrast at least 4.5:1 (3:1 for large text and icons). Use the roles in
  `tokens/android.css` (or the neutral `--color-*` tokens in screen code); don't invent greys.
- Every control has an accessible name (visible text or `aria-label`). Icons that do something
  are buttons.
- Content must survive 200 % text size: no fixed heights on text containers, no truncating
  essential information. The shell's `?fontScale=2` parameter tests this.
- Motion: 150–300 ms, standard easing; respect `prefers-reduced-motion`.

## Edge-to-edge and system bars

The template draws a simulated status bar (24 px) and a three-button navigation bar (48 px).
App content scrolls between them; the top app bar and bottom navigation stay fixed. Don't place
tappable content under the system bars.

## Dark theme

Material 3 dark theme uses the dark roles in `tokens/android.css`, not inverted colours. Check both
themes when V3 is in scope (default: yes). Images and illustrations need to work on dark surfaces.
