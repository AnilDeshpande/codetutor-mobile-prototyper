# Android UX conventions

What an Android app does, so the flow you sketch is one a Material 3 app can have. These follow
Material 3 and Android's navigation guidance. For iOS see `../ios/conventions.md`. When both
platforms are in scope the flow, screens and states are shared; note on a frame (`note`) where
the Android and iOS versions differ.

## Structure of a screen

- **Top app bar** (`bar`): the title of the current screen; an up arrow (`back: true`) on screens
  below a top-level destination; up to two actions, the rest in an overflow menu.
- **Content**: one clear primary purpose per screen. The most important information first.
- **Primary action**: a filled button (`button`) at the bottom of task screens, or a floating
  action button (`fab`) on list screens when the main action is "create". Only one primary action
  per screen.
- **Bottom navigation** (`tabs` in the spec): top-level destinations only, 3–5 items, visible on
  top-level screens and hidden inside focused tasks (pairing, checkout, editing). Labels are one
  short word or two.
- Phones in portrait are the design target. On tablets the bottom navigation becomes a rail and
  list–detail screens can sit side by side; sketch that only if tablets are in scope (A3).

## Back and up

- **System back** goes to the previous screen in the task, closes a dialog or sheet first if one
  is open, and on a top-level destination other than the start destination goes to the start
  destination. At the start destination it leaves the app.
- **Up** (←) goes to the logical parent screen; within a single stack it matches back.
- Leaving a task with unsaved input: confirm with a dialog ("Discard changes?") or keep a draft —
  a decision to record (N3), never an accident. Draw it: a flow from the form labelled "Back with
  changes" to a dialog frame hanging under it.

## Feedback and overlays

| Situation | Pattern | In the spec |
|---|---|---|
| Brief confirmation of a completed action, optionally undo | snackbar (4–10 s, one optional action) | `snackbar` |
| Decision needed before continuing, or a destructive action | dialog (title, one-sentence body, 1–2 actions: dismissive first, confirming last) | `dialog`, its own frame |
| Choices or extra detail tied to the current screen | modal bottom sheet | `sheet`, its own frame |
| Ongoing status affecting the whole screen (offline, syncing) | inline banner under the top app bar | `banner` |
| Waiting ≤ 300 ms | nothing | — |
| Waiting > 300 ms, unknown duration | indeterminate progress, in place | a `loading` frame |
| Waiting with known steps or duration (pairing, upload) | determinate progress + what's happening in words + cancel if possible | a frame with `text` and a `button` |
| Content loading on a screen with known layout | placeholders in the shape of the content | a `loading` frame |

## Runtime permissions

Draw the full flow; each step is a frame.

1. Ask in context, when the user starts the feature that needs it, not at launch.
2. If the reason isn't obvious, show a rationale first (app screen or dialog: why + what happens).
3. System dialog (`dialog` with `system: true`): "Allow *App* to find, connect to… nearby
   devices?" → Allow / Don't allow.
4. Denied once: explain what doesn't work and offer to ask again.
5. Denied twice / "don't ask again": explain, and offer "Open settings".

## Lists, forms and content

- List rows: the whole row is the touch target; a trailing chevron only if it navigates.
- Text fields: visible label, helper or error text below, error shown after the user leaves the
  field or submits — not while they're typing the first character.
- Buttons: sentence case, verb first ("Pair meter", not "OK").
- Empty states: say what will appear here, and give the action that makes it appear.
- Error states: say what happened in plain words, what the user can do, and offer retry.
- Numbers with units, dates and times formatted for the locale (C3).

## Touch and accessibility

These are checked in the design phase (`look/screens.html`); keep them in mind when choosing
what goes on a screen.

- Minimum touch target 48 × 48 dp, at least 8 dp between targets.
- No hover-only information, no right-click, no double-click.
- Text contrast at least 4.5:1 (3:1 for large text and icons).
- Every control has a name (visible text or a label). Icons that do something are buttons.
- Content must survive 200 % text size: no essential information that only fits at the default
  size. Prefer short labels and let long content scroll.

The look itself — brand scheme, type, shape, dark theme — is covered by `visual-language.md` in
this folder, in the design phase only.
