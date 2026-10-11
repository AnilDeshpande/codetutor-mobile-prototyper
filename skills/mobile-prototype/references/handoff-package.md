# Handoff package (`docs/prototypes/HANDOFF.md`)

The handoff is what a native implementation (by a person or another agent skill) starts from.
It must be complete enough that nobody needs to reconstruct the flow from the diagram.

1. Run `node scripts/handoff.mjs`. It creates `HANDOFF.md` from `assets/templates/HANDOFF.md`
   (if it doesn't exist) and fills the blocks between its `generated` markers from `flow.json`:
   the screen inventory (section 3), the transitions (section 4) and the diagram's pages
   (section 12). Never edit inside the markers; change `flow.json` and run it again.
2. Write every other section from `flow.json` and `notes/DECISIONS.md`; write "none" rather than
   leaving one out.
3. Run `node scripts/handoff.mjs --check`; it must pass before the handoff stop.

Refer to a screen by its S-number and generated title, "S4 · Overview — Saved": the screen's
canonical name, then the state. Never call a frame by its entry condition ("First launch") or by
a state as if it were a screen. The spec needs `appScreens` (`references/sketch-spec.md`; an
older spec: *Migrating an older flow.json* there).

## Sections

1. **Summary**: the feature, the users, the platforms (Android, iOS or both) and minimum OS
   versions, the journeys covered, the approval date and who approved.
2. **Inputs**: documents used (with versions or dates), from `notes/INPUTS.md`.
3. **Screen inventory** (generated): one row per app screen (name, id, purpose, *App screen /
   navigation location*, its frames), then one row per S-number (screen, state, entry
   condition, where it is reached from). *App screen / navigation location* is where the screen
   itself sits in the app ("Overview → Create habit", "Sheet over Overview"), not where an
   action leads: that is a transition target, in section 4. Don't add a "Destination" column;
   it reads both ways.
4. **Navigation graph**: text diagram of destinations and stacks, plus a table of where back goes
   from each screen and which transitions need confirmation. The flow is shared; note where the
   platforms differ (Android: system back, and back at the start destination leaves the app; iOS:
   back button and edge swipe, nothing at a tab's root, modal tasks with Cancel). Then the
   **transitions** (generated): from, user action, next screen (the transition target).
5. **State model per screen**: for each screen, under its name in the inventory, the states
   (loading, content, empty, error, offline, partial…) with what triggers each and what the user
   sees. Name them so they map directly onto a UI-state type, for example:
   ```
   DeviceListUiState = Loading | Empty | Content(devices, lastSync) | Error(message, canRetry) | Offline(cached)
   ```
6. **Component mapping**, per platform in scope: each distinct element in the sketch → the
   component it stands for, noting variants.
   - **Android (Material 3 / Compose)**: TopAppBar, NavigationBar / NavigationRail, ListItem,
     FilledButton, OutlinedTextField, ModalBottomSheet, AlertDialog, Snackbar,
     LinearProgressIndicator…
   - **iOS (SwiftUI)**: NavigationStack + `.navigationTitle` (large / inline), TabView (sidebar
     adaptable on iPad) or NavigationSplitView, `.toolbar` items, List (`.insetGrouped`), Form,
     Button (`.borderedProminent` / `.bordered` / plain), TextField, Toggle, `.alert`,
     `.confirmationDialog`, `.sheet` with `.presentationDetents`, ProgressView, `.refreshable`,
     `.swipeActions`. Mark anything that has no native equivalent (for example the undo toast
     that stands in for a snackbar) as **custom**, and give the intended SF Symbol for each icon.
7. **Theme**, per platform. If the design phase didn't run, write "visual design not done: use
   the platform baseline (Material 3 / iOS system colours) until a look is approved". Otherwise:
   which look was approved (a visual direction, or a design system — link
   `design-system/<app>/`), then the values from `notes/THEME-REPORT.md`: the full Material 3
   colour scheme in light and dark with its seed and variant, and whether dynamic colour is on;
   the iOS AccentColor in light and dark, any custom colours, and the materials generation
   (classic or Liquid Glass); the type styles, fonts (with licences), shape and spacing actually
   used. Enough to define the theme natively without opening the prototype. At the design-system
   level, point to `material-theme.json` and `ios-theme.json`.
8. **Copy**: every user-facing string, grouped by screen, marked `approved` or `draft`, with
   platform variants side by side where they differ (button case, "Settings" wording). On iOS
   include each permission's purpose string.
9. **Decisions**: everything in `DECISIONS.md`, each with its source (document, user, assumption).
   List assumptions separately at the top of this section: they need confirming before build.
10. **Open questions**: anything still open, with owner if known.
11. **What was checked**: that `sketch.mjs --check` and `handoff.mjs --check` pass, who locked
    the flow and when, and — if
    the design phase ran — the contrast result from `THEME-REPORT.md` and what the user reported
    from `look/screens.html`. Say plainly what was *not* checked: nothing here was run as an app,
    so behaviour (timing, real data, real permissions) is unverified until the native build.
12. **Visual references**: a link to `flow.drawio` (the locked flow) with how to open it — VS
    Code with the *Draw.io Integration* extension, draw.io Desktop or app.diagrams.net; not an
    Android Studio plugin — and its pages (generated: the wireflow or map page per journey, and
    the screen pages, "S1 Overview — Empty" …). If the design phase ran, `look/screens.html`
    with the URL pattern for a single screen. These are what was approved.
13. **Out of scope for the prototype**: what the sketch deliberately leaves out (journeys,
    states, platforms, tablets) so nobody mistakes a gap for a decision.

14. **Sources** (from the template, with links resolved by `handoff.mjs`): the skill references
    that define the conventions used (flow spec, this file, question bank, draw.io setup), so a
    reader can tell the skill's conventions from this project's content.

## What not to include

- Implementation advice for the native code (architecture, libraries, module structure), and no
  Compose, SwiftUI, Kotlin or Swift code. That belongs to the implementation step.
- The files behind `look/`. They are generated and disposable.
