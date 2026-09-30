# Handoff package (`docs/prototypes/HANDOFF.md`)

The handoff is what a native implementation (by a person or another agent skill) starts from.
It must be complete enough that nobody needs to reconstruct the flow from the diagram. Write it
from `flow.json` and `notes/DECISIONS.md`, use the template in `assets/templates/HANDOFF.md` and
fill every section; write "none" rather than leaving one out. Refer to screens by their S-number
and title, as the sketch does.

## Sections

1. **Summary**: the feature, the users, the platforms (Android, iOS or both) and minimum OS
   versions, the journeys covered, the approval date and who approved.
2. **Inputs**: documents used (with versions or dates), from `notes/INPUTS.md`.
3. **Screen inventory**: one row per screen: id, title, purpose, entry points, top-level
   destination it belongs to.
4. **Navigation graph**: text diagram of destinations and stacks, plus a table of where back goes
   from each screen and which transitions need confirmation. The flow is shared; note where the
   platforms differ (Android: system back, and back at the start destination leaves the app; iOS:
   back button and edge swipe, nothing at a tab's root, modal tasks with Cancel).
5. **State model per screen**: for each screen, the states (loading, content, empty, error,
   offline, partial…) with what triggers each and what the user sees. Name them so they map
   directly onto a UI-state type, for example:
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
11. **What was checked**: that `sketch.mjs --check` passes, who locked the flow and when, and — if
    the design phase ran — the contrast result from `THEME-REPORT.md` and what the user reported
    from `look/screens.html`. Say plainly what was *not* checked: nothing here was run as an app,
    so behaviour (timing, real data, real permissions) is unverified until the native build.
12. **Visual references**: `flow.drawio` (the locked flow; name the page for each journey) and,
    if the design phase ran, `look/screens.html` with the URL pattern for a single screen. These
    are what was approved.
13. **Out of scope for the prototype**: what the sketch deliberately leaves out (journeys,
    states, platforms, tablets) so nobody mistakes a gap for a decision.

## What not to include

- Implementation advice for the native code (architecture, libraries, module structure), and no
  Compose, SwiftUI, Kotlin or Swift code. That belongs to the implementation step.
- The files behind `look/`. They are generated and disposable.
